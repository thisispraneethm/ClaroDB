import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: `__dirname` is not available in ES modules. Using `import.meta.url` is the modern and correct way to resolve paths.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});