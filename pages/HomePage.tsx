
import React from 'react';
import { Shield, MessageSquare, LineChart, Database, Zap, BrainCircuit } from 'lucide-react';
import Container from '../components/Container';

const HomePage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center pt-8 pb-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
          Conversational Data Intelligence
        </h1>
        <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
          Claro is built to bridge the gap between complex data and the critical business questions you need to answer every day.
        </p>
         <p className="text-md text-text-secondary max-w-3xl mx-auto mt-4">
            We replace cumbersome BI tools and manual SQL with a dynamic, intelligent, and conversational interface to your most valuable asset: your data.
        </p>
      </div>

      <Container title="Key Features">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 p-4">
          <Feature
            icon={<MessageSquare className="text-primary" size={24} />}
            title="Conversational SQL"
            description="Ask questions in plain English. Our AI translates your queries into precise SQL, executes them, and provides answers in seconds."
          />
           <Feature
            icon={<BrainCircuit className="text-primary" size={24} />}
            title="Schema-Aware AI"
            description="Claro automatically analyzes your data's structure to provide context-aware answers, ensuring generated queries are accurate and relevant."
          />
           <Feature
            icon={<Database className="text-primary" size={24} />}
            title="Versatile Connectivity"
            description="Upload local files (CSV, JSON), join multiple datasets on the fly, or connect securely to your live enterprise databases."
          />
          <Feature
            icon={<LineChart className="text-primary" size={24} />}
            title="Instant Visualizations"
            description="Transform raw data into insightful charts and summaries with a single click to see patterns, not just read numbers."
          />
        </div>
      </Container>
      
      <Container title="Technology Stack">
         <p className="text-text-secondary mb-6">Claro is built with a modern, robust technology stack to ensure performance, reliability, and scalability:</p>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <TechItem name="React" />
            <TechItem name="TypeScript" />
            <TechItem name="Tailwind CSS" />
            <TechItem name="Gemini API" />
            <TechItem name="AlaSQL.js" />
            <TechItem name="Recharts" />
         </div>
      </Container>

      <div className="flex items-start bg-info-background border border-info-border text-info-text p-4 rounded-xl">
        <Shield className="w-8 h-8 mr-4 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold">Data Privacy Note</h3>
          <p className="text-sm">
            Your privacy is paramount. When you ask a question, only the natural language prompt and your data's structural schema (table/column names) are sent to the AI for processing. Your underlying data is never sent, stored, or exposed.
          </p>
        </div>
      </div>
       <div className="text-center pt-4 pb-8 text-sm text-text-secondary">
        One workspace. Pure focus. Clear thinking.
      </div>
    </div>
  );
};

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0 mr-4 mt-1 bg-primary/10 p-3 rounded-lg">{icon}</div>
    <div>
      <h4 className="font-semibold text-lg text-text">{title}</h4>
      <p className="text-text-secondary">{description}</p>
    </div>
  </div>
);

const TechItem: React.FC<{name: string}> = ({name}) => (
    <div className="bg-secondary-background p-3 rounded-md border border-border/50">
        <p className="font-semibold text-sm text-text">{name}</p>
    </div>
)

export default HomePage;