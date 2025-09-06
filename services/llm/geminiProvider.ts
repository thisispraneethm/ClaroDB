import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { LLMProvider } from './base';
import { SQLGenerationResult, ChartGenerationResult, TableSchema, InsightGenerationResult, ChartGenerationWithMetadataResult, Join } from '../../types';
import { LLMGenerationError } from '../../utils/exceptions';
import { config } from '../../config';
import { enhancePromptWithSchemaAwareness } from '../../utils/promptEnhancer';
import { Correction } from "../handlers/base";

export class GeminiProvider extends LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    super();
    if (!config.apiKey) {
      throw new Error("Gemini API key is not configured.");
    }
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

    const systemInstruction = `You are a precise, world-class SQL generator. Your sole purpose is to translate a natural language question into a single, valid SQL query for the ${dialect} dialect.
Constraints:
- Return ONLY the raw SQL query. Do not include explanations, comments, or markdown formatting like \`\`\`sql.
- Your entire response must be only the SQL query.
- **Crucially, for any aggregated column (using functions like SUM, COUNT, AVG, etc.), you MUST provide a simple, descriptive, snake_case alias (e.g., \`SUM(sales) AS total_sales\`). This is vital for data visualization.**
- Always qualify columns with table names or aliases (e.g., \`sales.product\`).
- If the question asks for a metric "by" or "for each" of a certain category (e.g., "sales by region", "count of users per country"), you MUST use a GROUP BY clause.
- Never hallucinate tables or columns that are not present in the provided schema.
- If the question is ambiguous, choose the most conservative interpretation.
- Return at most 1000 rows unless the user specifies a different limit.
${userCorrectionsStr}
${joinInstruction}
${dialectSpecificInstruction}
Schema:
${schemasStr}
${previewStr}`;

    return this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
          systemInstruction,
      },
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
      const response: GenerateContentResponse = await chat.sendMessage({ message: finalPrompt });
      const sqlQuery = response.text.replace(/```sql/g, '').replace(/```/g, '').trim();

      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = usageMetadata?.candidatesTokenCount ?? 0;
      const cost = this.calculateCost(modelName, promptTokens, completionTokens);

      return {
        sql: sqlQuery,
        model: modelName,
        cost: cost,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      };
    } catch (e: any) {
      let errorMessage = "I couldn't generate SQL for that. Please try rephrasing your question.";
      if (e.message?.includes('API key not valid')) {
          errorMessage = 'The configured Gemini API key is invalid or missing. Please contact the administrator.';
      } else if (e.message?.toLowerCase().includes('quota')) {
          errorMessage = 'The API usage limit has been reached. Please contact the administrator.';
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
    
    const modelName = 'gemini-2.5-flash';

    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
        },
      });

      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = usageMetadata?.candidatesTokenCount ?? 0;
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
}