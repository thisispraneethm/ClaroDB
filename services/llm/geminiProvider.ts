import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { LLMProvider } from './base';
import { SQLGenerationResult, ChartGenerationResult, TableSchema, InsightGenerationResult, ChartGenerationWithMetadataResult, Join } from '../../types';
import { LLMGenerationError } from '../../utils/exceptions';
import { config } from '../../config';
import { enhancePromptWithSchemaAwareness } from '../../utils/promptEnhancer';
import { Correction } from "../handlers/base";

const CHART_GENERATION_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'scatter', 'area', 'composed', 'stackedBar', 'kpi'], description: 'The type of chart to render.' },
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
};


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
  
  startChatSession(schemas: TableSchema, dialect: string, dataPreview?: Record<string, Record<string, any>[]>, joins?: Join[], corrections?: Correction[]): Chat {
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
  - **You MUST NOT use window functions**. Functions like \`LAG()\`, \`LEAD()\`, \`ROW_NUMBER()\`, \`RANK()\`, or any function that uses an \`OVER()\` clause are NOT supported. For complex calculations like year-over-year growth, you must use alternative methods such as self-joins.
  - **For date extraction from string columns**, do not use date functions like \`YEAR()\`, \`MONTH()\`, etc. directly, as they can be unreliable with text types. Instead, use the string function \`SUBSTRING\`. For example, to get the year from a 'YYYY-MM-DD' formatted date string in a column named 'order_date', use \`SUBSTRING(order_date, 1, 4)\`.
  - **When aggregating data (e.g., using GROUP BY) based on a derived value like an extracted year**, you MUST repeat the full function in the GROUP BY clause. For instance, if you \`SELECT SUBSTRING(date_col, 1, 4) AS year\`, you must then \`GROUP BY SUBSTRING(date_col, 1, 4)\`. Do NOT group by the original column (e.g., \`GROUP BY date_col\`). The same rule applies to ORDER BY.`;
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

    const systemInstruction = `You are a precise, world-class SQL generator. Your sole purpose is to translate a natural language question into a single, valid SQL query for the ${dialect} dialect.
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
${previewStr}`;

    return this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction }
    });
  }

  async continueChat(chat: Chat, prompt: string, schemas: TableSchema): Promise<SQLGenerationResult> {
    const allColumns = Object.values(schemas).flat().map(col => col.name);
    const typoCorrections = enhancePromptWithSchemaAwareness(prompt, allColumns);
    
    let correctionHint = "";
    if (Object.keys(typoCorrections).length > 0) {
        const hints = Object.entries(typoCorrections).map(([t, c]) => `'${t}'->'${c}'`).join(", ");
        correctionHint = ` (HINT: The user may have made typos. Apply these corrections: ${hints}.)`;
    }
    
    const finalPrompt = `Based on the conversation so far, generate a SQL query for this question: ${prompt}${correctionHint}`;

    try {
      const modelName = 'gemini-2.5-flash';
      const response = await chat.sendMessage({ message: finalPrompt });
      const sqlQuery = response.text.replace(/```sql/g, '').replace(/```/g, '').trim();

      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);

      return {
        sql: sqlQuery,
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

    try {
      const modelName = 'gemini-2.5-flash';

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
        },
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

  async generateChart(question: string, sql: string, data: Record<string, any>[]): Promise<ChartGenerationWithMetadataResult> {
    if (data.length === 0 || Object.keys(data[0]).length < 1) {
        return { chartConfig: null, model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0 };
    }
    const columns = Object.keys(data[0]);
    const dataPreview = JSON.stringify(data.slice(0, 50), null, 2);
    const modelName = "gemini-2.5-flash";
    
    const systemInstruction = `You are a data visualization expert. Your sole purpose is to generate a single, valid JSON object that strictly conforms to the provided schema. Do not include any other text, explanations, or markdown formatting. Your entire response must be the JSON object.`;

    const userPrompt = `
Analyze the following context and generate the JSON configuration for the single best chart to visualize the data.

CONTEXT:
- User's original question: "${question}"
- Executed SQL query: "${sql}"
- Resulting data columns: [${columns.join(', ')}]
- Data preview (up to 50 rows):
${dataPreview}

CHART SELECTION GUIDELINES:
Follow these rules to determine the chartType:
- **KPI Card Rule**: If the data contains exactly one row, you MUST use 'kpi'. This is for displaying a single key metric. The 'title' should be the metric's name, 'nameKey' the category, and 'dataKeys' the numeric value column.
- **Time-Series Rule**: If a column name clearly indicates a time-series (e.g., 'date', 'year', 'month', 'day'), prefer a 'line' chart to show trends. An 'area' chart is a suitable alternative.
- **Categorical Comparison Rule**: To compare a single numeric metric across distinct categories, use a 'bar' chart.
- **Proportional Rule**: To show the composition of a whole (i.e., percentages), use a 'pie' chart. Only use this for 2 to 7 categories.
- **Correlation Rule**: To show the relationship between two numeric columns, you MUST use a 'scatter' chart.
- **Multi-Metric Rule**: To compare multiple numeric metrics across the same categories, use 'stackedBar' or 'composed'.

JSON OUTPUT REQUIREMENTS:
- The JSON output must be valid and adhere strictly to the schema.
- 'dataKeys': An array of column names for the primary metrics (Y-axis). Must contain numeric data.
- 'nameKey': The column name for labels (X-axis or pie slices). Usually contains categorical or date data.
- 'title': A concise, descriptive title for the chart.
- 'composedTypes': Only for 'composed' charts. An array specifying the type ('bar', 'line', 'area') for each key in 'dataKeys'. Its length must equal the length of 'dataKeys'.
`;

    try {
        const response = await this.ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: CHART_GENERATION_RESPONSE_SCHEMA,
            },
        });

      const rawText = response.text.trim();
      
      type RawChartConfig = Partial<ChartGenerationResult> & { dataKey?: string };
      const rawConfig = JSON.parse(rawText) as RawChartConfig;

      const chartConfig: ChartGenerationResult = {
        chartType: rawConfig.chartType!,
        dataKeys: rawConfig.dataKeys || (rawConfig.dataKey ? [rawConfig.dataKey] : []),
        nameKey: rawConfig.nameKey!,
        title: rawConfig.title!,
        composedTypes: rawConfig.composedTypes,
      };
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);

      return {
        chartConfig,
        model: modelName,
        cost,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      };
    } catch (e: any) {
      console.error("Chart generation failed, returning null.", e);
      return {
          chartConfig: null, model: modelName, cost: 0, prompt_tokens: 0, completion_tokens: 0
      };
    }
  }
}