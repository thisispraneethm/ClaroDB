
# ClaroDB: Your Conversational Data Intelligence Workspace

ClaroDB is an intelligent, browser-based data workspace designed to democratize data analysis. It bridges the gap between complex data and clear answers by allowing users to ask questions in natural language, transforming curiosity into clarity.

## ✨ Key Features

*   **💬 Conversational SQL**: Ask questions in plain English. ClaroDB uses the Google Gemini API to translate your queries into precise SQL, executes them, and provides answers in seconds.
*   **🧠 Schema-Aware AI**: The AI automatically analyzes your data's structure to provide context-aware answers. It's smart enough to correct potential typos in your questions (e.g., "emplyee" -> "employee").
*   **🔗 Versatile Connectivity**: 
    *   **Analyze Single Files**: Upload a local CSV, JSON, or TXT file and start your analysis.
    *   **Engineer & Join**: Upload multiple files, define relationships between them with a simple UI, and query the combined dataset.
*   **📊 Instant Insights & Visualizations**: Go beyond raw data. Generate AI-powered narrative summaries and dynamic charts (bar, line, pie) with a single click to see the story in your data.
*   **⚙️ Data Sampling**: Work with massive files efficiently. For large datasets, you can apply random or stratified sampling to analyze a representative subset, improving performance and reducing costs.
*   **🔒 100% Client-Side & Private**: Your privacy is paramount. All data loading, storage (via IndexedDB), and SQL execution happens locally in your browser. Your raw data is **never** sent to an external server.

## 🚀 Workspaces

The application is divided into several focused workspaces:

*   **About**: An overview of the application's features and technology.
*   **Demo Workspace**: The perfect place to start. A sandbox environment pre-loaded with sample sales data to explore the app's full capabilities without needing your own files.
*   **Analyze File**: The primary workspace for single-file analysis. Upload your data, review its profile, and start a conversation.
*   **Engineer & Join**: A powerful workspace for data modeling. Upload multiple files, define join conditions between them, and query the combined result.
*   **Enterprise DB**: A "Coming Soon" feature demonstrating how ClaroDB could securely connect to live enterprise databases.

## 🛠️ Technology Stack

ClaroDB is built with a modern, robust, and serverless stack to ensure performance, reliability, and an excellent user experience.

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI Engine**: Google Gemini API (`@google/genai`)
*   **Client-Side Storage**: **IndexedDB** for stable, persistent, and robust storage of uploaded data directly in the browser.
*   **In-Browser Query Engine**: **AlaSQL.js** for executing the AI-generated SQL queries on data fetched from IndexedDB.
*   **Charting**: Recharts for dynamic and responsive data visualizations.
*   **Routing**: React Router for seamless navigation.

## ⚙️ How It Works (Architecture)

This is a **frontend-only application**. All logic, including AI calls, data loading, storage, and SQL execution, happens directly in the user's browser.

1.  **File Upload**: The user uploads one or more files (e.g., CSV, JSON).
2.  **Parsing & Storage**: The file is parsed and its data is stored securely in a dedicated **IndexedDB** database within the browser. This provides stable, persistent storage for the user's session.
3.  **AI-Powered SQL Generation**: When the user asks a question:
    *   The table schemas (column names/types), data previews, and the natural language question are sent to the **Google Gemini API**.
    *   The API generates a single, precise SQL query based on the context.
4.  **Hybrid Query Execution**:
    *   The application fetches the required table data from **IndexedDB**.
    *   This data is loaded into a *temporary, single-use, in-memory* **AlaSQL** database instance.
    *   The AI-generated SQL is executed by AlaSQL against this temporary instance.
5.  **Results & Insights**: The results are displayed as a table. The user can then request AI-generated narrative insights and charts based on these results.

This hybrid approach leverages the strengths of both technologies: the stability and persistence of IndexedDB for storage, and the powerful SQL engine of AlaSQL for on-the-fly querying.

## 🚀 Getting Started with Local Development

Follow these steps to run ClaroDB on your local machine.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm, yarn, or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/clarodb.git
cd clarodb
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

The application requires a Google Gemini API key to function.

1.  Create a file named `.env` in the root of the project.
2.  Add your API key to this file:

```env
# .env
API_KEY="YOUR_GEMINI_API_KEY"
```

The application code (`config.ts`) is designed to read this key directly from `process.env.API_KEY`. **There is no UI to enter the key**, as this is a security best practice. The development environment must provide this variable.

### 4. Run the Development Server

The project is configured to work with a standard Vite development server.

```bash
npm run dev
# or
yarn dev
```

The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).