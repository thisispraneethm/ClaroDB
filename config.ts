
export interface AppConfig {
    apiKey: string;
    llmPricing: {
        [model: string]: {
            prompt: number; // Cost per 1 million tokens
            completion: number; // Cost per 1 million tokens
        }
    }
}

function getAppConfig(): AppConfig {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Gemini API key not found. Please ensure GEMINI_API_KEY or API_KEY is set.");
    }

    return {
        apiKey,
        llmPricing: {
            "gemini-3-flash-preview": {
                prompt: 0.1,
                completion: 0.4,
            },
            "gemini-2.5-flash": {
                prompt: 0.25,
                completion: 0.50,
            }
        }
    };
}

export const config = getAppConfig();