
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
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API_KEY environment variable not set. This is a hard requirement for the application to run.");
    }

    return {
        apiKey,
        llmPricing: {
            "gemini-2.5-flash": {
                prompt: 0.25,
                completion: 0.50,
            }
        }
    };
}

export const config = getAppConfig();