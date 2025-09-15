
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { LLMProvider } from './base';
import { SQLGenerationResult, ChartGenerationResult, TableSchema, InsightGenerationResult, ChartGenerationWithMetadataResult, Join } from '../../types';
import { LLMGenerationError } from '../../utils/exceptions';
import { config } from '../../config';
import { enhancePromptWithSchemaAwareness } from '../../utils/promptEnhancer';
import { Correction } from "../handlers/base";

// Type alias to handle potential legacy 'dataKey' property for backward compatibility.
type ParsedChartConfig = ChartGenerationResult & { dataKey?: string };
export class GeminiProvider extends LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    super();
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = config.llmPricing[model];
    if (!pricing) return 0;
    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;
    return promptCost + completionCost;
  }

  async generateSQL(prompt: string, schemas: TableSchema, dialect: string, history: { role: string, content: string }[], dataPreview?: Record<string, Record<string, any>[]>, joins?: Join[], corrections?: Correction[]): Promise<SQLGenerationResult> {
    const allColumns = Object.values(schemas).flat().map(col => col.name);
    const typoCorrections = enhancePromptWithSchemaAwareness(prompt, allColumns);
    
    let correctedQuestion = prompt;
    let correctionHint = "";

    if (Object.keys(typoCorrections).length > 0) {
        const hints = Object.entries(typoCorrections).map(([t, c]) => `'${t}'->'${c}'`).join(", ");
        correctionHint = `\nHINT: The user may have made typos. Apply these corrections: ${hints}.`;
        
        Object.entries(typoCorrections).forEach(([typo, correct]) => {
            correctedQuestion = correctedQuestion.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct);
        });
    }

    const schemasStr = Object.entries(schemas)
      .map(([name, cols]) => `- Table '${name}' columns: [${cols.map(c => `${c.name} (${c.type})`).join(', ')}]`)
      .join('\n');
    
    let previewStr = "";
    if (dataPreview && Object.keys(dataPreview).length > 0) {
        previewStr = "\nHere are some sample rows from the tables:\n";
        for (const [tableName, rows] of Object.entries(dataPreview)) {
            if (rows.length > 0) {
                const headers = Object.keys(rows[0]);
                const rowsStr = rows.map(row => 
                    headers.map(h => String(row[h])).join(', ')
                ).join('\n');
                previewStr += `- Table '${tableName}' sample data (columns: ${headers.join(', ')}):\n${rowsStr}\n`;
            }
        }
    }

    let joinInstruction = "";
    if (joins && joins.length > 0) {
        const joinClauses = joins.map(j => 
            `- Use a ${j.joinType.toUpperCase()} JOIN between table [${j.table1}] and [${j.table2}] ON [${j.table1}].[${j.column1}] = [${j.table2}].[${j.column2}]`
        ).join('\n');
        joinInstruction = `When querying across multiple tables, you MUST adhere to the following user-defined join conditions:\n${joinClauses}`;
    } else if (Object.keys(schemas).length > 1) {
        joinInstruction = "- If the user's question requires joining tables, intelligently infer the join columns based on column names and relationships. Explicitly state the join condition in the SQL query (e.g., `FROM table1 JOIN table2 ON table1.id = table2.foreign_id`)."
    }
    
    let dialectSpecificInstruction = "";
    if (dialect === 'alasql') {
        dialectSpecificInstruction = `- IMPORTANT: For the 'alasql' dialect, you MUST adhere to these critical rules:
  - Enclose any column or table name containing spaces or special characters in square brackets (e.g., \`SELECT [Customer Id] FROM [Order Details]\`).
  - **You MUST NOT use window functions**. Functions like \`LAG()\`, \`LEAD()\`, \`ROW_NUMBER()\`, \`RANK()\`, or any function that uses an \`OVER()\` clause are NOT supported. For complex calculations like year-over-year growth, you must use alternative methods such as self-joins.`;
    }

    let userCorrectionsStr = "";
    if (corrections && corrections.length > 0) {
      userCorrectionsStr = `
---
LEARNING FROM USER FEEDBACK:
The user has provided corrections in the past. These represent the ground truth for how to query their data. Prioritize these patterns.
${corrections.map((c, i) => `
## Correction ${i + 1}
User Question: "${c.question}"
Correct SQL: ${c.sql}
`).join('\n')}
---
`;
    }

    const fewShotExamples = `
---
Here are some examples of how to map questions to SQL queries. Adapt these patterns to the provided schema.

## Basic Aggregation
Question: "total sales for each product"
SQL: SELECT product_column, SUM(sales_column) FROM table_name GROUP BY product_column;

## Filtering
Question: "employees in the 'Sales' department"
SQL: SELECT * FROM employee_table WHERE department_column = 'Sales';

## Joining
Question: "sales in 'North America' and their sales reps"
SQL: SELECT t1.product, t1.sales, t2.employee_name FROM sales_table t1 JOIN employee_table t2 ON t1.region_key = t2.region_key WHERE t1.region_key = 'North America';

## Data Enrichment with General Knowledge (CTE and CASE)
Question: "what is the distribution of orders by continent" (given a table with a 'country' column but no 'continent' column)
SQL: WITH enriched_orders AS (
  SELECT
    *,
    CASE
      WHEN country IN ('United States', 'Canada', 'Mexico') THEN 'North America'
      WHEN country IN ('United Kingdom', 'Germany', 'France', 'Italy', 'Spain') THEN 'Europe'
      WHEN country IN ('China', 'India', 'Japan', 'South Korea') THEN 'Asia'
      WHEN country IN ('Brazil', 'Argentina', 'Colombia') THEN 'South America'
      WHEN country IN ('Nigeria', 'Egypt', 'South Africa') THEN 'Africa'
      WHEN country IN ('Australia', 'New Zealand') THEN 'Oceania'
      ELSE 'Other'
    END AS continent
  FROM orders
)
SELECT
  continent,
  COUNT(order_id) AS number_of_orders
FROM enriched_orders
WHERE continent IS NOT NULL
GROUP BY
  continent
ORDER BY
  number_of_orders DESC;
---
`;

    const systemPrompt = `You are a precise, world-class SQL generator. Your sole purpose is to translate a natural language question into a single, valid SQL query for the ${dialect} dialect.
Constraints:
- Return ONLY the raw SQL query. Do not include explanations, comments, or markdown formatting like \`\`\`sql.
- Your entire response must be only the SQL query.
- Always qualify columns with table names or aliases (e.g., \`sales.product\`).
- If the question asks for a metric "by" or "for each" of a certain category (e.g., "sales by region", "count of users per country"), you MUST use a GROUP BY clause.
- **Intelligent Data Enrichment**: You MAY use your general world knowledge to enrich the data. If a question requires a column that is not in the schema but can be logically derived from existing columns (e.g., deriving 'continent' from a 'country' column, or 'day_of_week' from a 'date' column), you MUST generate SQL that creates this new column on the fly, typically using a Common Table Expression (CTE) with a CASE statement.
- Never hallucinate tables or columns that are not present in the provided schema. The only exception is for new columns that are logically derived from existing data as part of a CTE (e.g., deriving a 'continent' column from a 'country' column).
- If the question is ambiguous, choose the most conservative interpretation.
- Return at most 1000 rows unless the user specifies a different limit.
${dialectSpecificInstruction}
${joinInstruction}
${userCorrectionsStr}
${fewShotExamples}
Schema:
${schemasStr}
${previewStr}
${correctionHint}`;

    const historyStr = history.map(h => {
        return h.role === 'user' 
            ? `PREVIOUS QUESTION: "${h.content}"`
            : `PREVIOUS SQL:\n${h.content}`;
    }).join('\n\n');

    const currentQuestionStr = `--- Current Question ---\nBased on the conversation so far, generate a SQL query for this question: ${prompt}`;

    const contentsPayload = `${systemPrompt}\n\n${historyStr ? `--- Conversation History ---\n${historyStr}\n\n` : ''}${currentQuestionStr}`;

    try {
      const modelName = 'gemini-2.5-flash';
      
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: modelName,
        contents: contentsPayload,
      });
      
      const sqlQuery = response.text.replace(/```sql/g, '').replace(/```/g, '').trim();

      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);

      return {
        sql: sqlQuery,
        correctedQuestion: correctedQuestion,
        model: modelName,
        cost: cost,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      };
    } catch (e: any) {
      let errorMessage = "I couldn't generate SQL for that. Please try rephrasing your question in plain English.";
      if (typeof e.message === 'string') {
          if (e.message.includes('API key not valid')) {
              errorMessage = 'The configured Gemini API key is invalid or missing. Please contact the administrator.';
          } else if (e.message.toLowerCase().includes('quota')) {
              errorMessage = 'The API usage limit has been reached. Please contact the administrator.';
          }
      }
      throw new LLMGenerationError(errorMessage);
    }
  }

  async generateInsights(question: string, data: Record<string, any>[]): Promise<InsightGenerationResult> {
    const dataPreview = JSON.stringify(data.slice(0, 50), null, 2);
    
    const systemInstruction = `You generate a crisp, factual summary of a query result for a business audience.
- Explain the key pattern in 5 sentences or less.
- Use column names and units; avoid speculation.
- If the result might be truncated (e.g., has 50 rows), mention that the data is a sample.
- Use markdown for formatting (e.g., lists, bold text).`;
    
    const userPrompt = `Context: The user asked "${question}".\nResult sample (first 50 rows):\n${dataPreview}`;
    
    const contentsPayload = `${systemInstruction}\n\n${userPrompt}`;

    try {
      const modelName = 'gemini-2.5-flash';

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: contentsPayload,
      });
      
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);

      return {
        insights: response.text || "No insights generated.",
        model: modelName,
        cost: cost,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      };
    } catch (e: any) {
      throw new LLMGenerationError(`Gemini insight generation failed: ${e.message}`);
    }
  }

  async generateChart(question: string, data: Record<string, any>[]): Promise<ChartGenerationWithMetadataResult> {
    if (data.length === 0 || Object.keys(data[0]).length < 2) {
        return {
            chartConfig: null,
            model: 'N/A',
            cost: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
        };
    }
    const columns = Object.keys(data[0]);
    const dataPreview = JSON.stringify(data.slice(0, 5), null, 2);
    const modelName = "gemini-2.5-flash";

    const systemPrompt = `You are a world-class data visualization expert. Your task is to analyze a user's question and a dataset to determine the single best chart representation.
- User's question: "${question}"
- Available columns: ${columns.join(', ')}
- Data preview: ${dataPreview}

CHART SELECTION GUIDELINES:
- Time-series Trend: If the data has a clear time component (e.g., columns named 'date', 'day', 'month', 'year'), prefer 'line' or 'area' charts to show trends over time.
- Categorical Comparison: To compare values across different categories, use 'bar'.
- Proportional Composition: To show parts of a whole for a single metric across categories, use 'pie'. Only use a pie chart for 2-7 categories.
- Multi-Metric Comparison: If there are multiple numeric columns to compare against a single category, use 'composed' (e.g., bar for one metric, line for another) or 'stackedBar'.
- Correlation: If the goal is to see the relationship between two numeric variables, use 'scatter'.

OUTPUT REQUIREMENTS:
- Your output must be a single, valid JSON object with no other text or formatting.
- The JSON must conform to the provided schema.
- 'dataKeys' should contain a single element for simple charts (bar, line, area, pie). For 'composed' or 'stackedBar', it can contain multiple keys.
- For 'composed' charts, the 'composedTypes' array must have the same number of elements as 'dataKeys', specifying the chart type for each key.
- The 'title' should be a concise and descriptive title for the chart.`;
    
    const userPrompt = "Generate the chart configuration JSON for the provided context.";

    const contentsPayload = `${systemPrompt}\n\n${userPrompt}`;

    try {
        const response = await this.ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'scatter', 'area', 'composed', 'stackedBar'], description: 'The type of chart to render.' },
                        dataKeys: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Column names for the primary metrics (Y-axis). Single item for simple charts, multiple for composed/stacked.' },
                        nameKey: { type: Type.STRING, description: 'The column name for the category or label (X-axis or pie label).' },
                        title: { type: Type.STRING, description: 'A descriptive title for the chart.' },
                        composedTypes: {
                            type: Type.ARRAY,
                            nullable: true,
                            items: { type: Type.STRING, enum: ['bar', 'line', 'area'] },
                            description: "For 'composed' charts, specifies the type for each dataKey. Must match `dataKeys` length."
                        }
                    },
                    required: ["chartType", "dataKeys", "nameKey", "title"]
                },
            },
        });

      const jsonStr = response.text.trim();
      if (!jsonStr) {
          throw new Error("Generated response is empty.");
      }
      
      const chartConfig = JSON.parse(jsonStr) as ParsedChartConfig;
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);
      
      // Backwards compatibility for models that might still return dataKey
      if (chartConfig.dataKey && !chartConfig.dataKeys) {
        chartConfig.dataKeys = [chartConfig.dataKey];
        delete chartConfig.dataKey;
      }

      return {
        chartConfig,
        model: modelName,
        cost,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      };
    } catch (e: any) {
      console.error("Chart generation failed, returning null.", e)
      return {
          chartConfig: null,
          model: modelName,
          cost: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
      };
    }
  }
}