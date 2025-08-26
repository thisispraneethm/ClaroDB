import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, Database, FileUp, Code } from 'lucide-react';
import Container from '../components/Container';

const HomePage: React.FC = () => {
  const exampleQueries = [
    "What are the total sales per region?",
    "Which product category has the highest average sales amount?",
    "Show me the monthly sales trend."
  ];

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10 bg-secondary-background">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-400 mb-6 shadow-lg">
            <Database size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
            Welcome to ClaroDB
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
            Your conversational data intelligence workspace. Ask questions in plain English, get SQL and insights in seconds.
          </p>
        </div>

        <Container>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
              <div className="flex items-center mb-3">
                <Sparkles className="text-primary mr-3" size={24} />
                <h2 className="text-xl font-semibold text-text">Get Started Instantly</h2>
              </div>
              <p className="text-text-secondary mb-4">
                Jump right in with our pre-loaded sample dataset. No upload needed.
              </p>
              <NavLink to="/demo" className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover transition-colors">
                Try Demo Workspace
              </NavLink>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-3">
                 <Code className="text-text-secondary mr-3" size={24} />
                 <h2 className="text-xl font-semibold text-text">Example Questions</h2>
              </div>
              <p className="text-text-secondary mb-4">
                Try asking questions like these in the demo workspace:
              </p>
              <ul className="space-y-2">
                {exampleQueries.map((q, i) => (
                  <li key={i} className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-text-secondary font-mono text-sm">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>

        <div className="grid md:grid-cols-2 gap-6 text-center">
            <div className="bg-card border border-border p-6 rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
                <FileUp className="text-primary mx-auto mb-3" size={24} />
                <h3 className="text-lg font-semibold text-text">Analyze Your Own Data</h3>
                <p className="text-text-secondary text-sm mt-1 mb-3">
                    Upload single or multiple files (CSV, JSON) and start a conversation with your data.
                </p>
                <NavLink to="/analyze" className="text-sm font-semibold text-primary hover:underline">
                    Analyze a File &rarr;
                </NavLink>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
                <Database className="text-primary mx-auto mb-3" size={24} />
                <h3 className="text-lg font-semibold text-text">Connect to a Database</h3>
                <p className="text-text-secondary text-sm mt-1 mb-3">
                    Visualize your database schema and run queries with our intuitive modeling canvas.
                </p>
                <NavLink to="/enterprise-db" className="text-sm font-semibold text-primary hover:underline">
                    Connect to DB &rarr;
                </NavLink>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
