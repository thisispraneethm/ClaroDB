import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, DatabaseZap, FileUp, Combine } from 'lucide-react';

const HomePage: React.FC = () => {

  const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; to: string; linkText: string }> = ({ icon, title, description, to, linkText }) => (
    <div className="bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
        <p className="text-text-secondary text-sm mb-4 flex-grow">{description}</p>
        <NavLink to={to} className="text-sm font-semibold text-primary hover:underline self-start">
            {linkText} &rarr;
        </NavLink>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-12 animate-fade-in-up">
      <div className="max-w-6xl mx-auto">
        <div className="text-center pt-12 pb-16">
          <div className="inline-block px-4 py-2 mb-6 text-sm font-semibold tracking-wide text-primary bg-primary/10 rounded-full">
            Conversational Data Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-text mb-6 leading-tight">
            Ask Questions. <br /> Get Answers. Instantly.
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8">
            ClaroDB is an intelligent workspace that understands plain English. Connect your data, ask questions, and get insights, SQL, and visualizations in seconds.
          </p>
          <NavLink 
            to="/demo" 
            className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:bg-primary-hover hover:scale-105 transition-all duration-200"
          >
            <Sparkles size={20} className="mr-2" />
            Try the Interactive Demo
          </NavLink>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
                icon={<FileUp size={24} />}
                title="Analyze a File"
                description="Upload a single CSV or JSON file and start a conversation with your data immediately. Perfect for quick analyses."
                to="/analyze"
                linkText="Upload & Analyze"
            />
            <FeatureCard
                icon={<Combine size={24} />}
                title="Engineer & Join"
                description="Upload multiple files and visually define relationships. Query your joined datasets as if they were a single table."
                to="/engineer"
                linkText="Model Your Data"
            />
            <FeatureCard
                icon={<DatabaseZap size={24} />}
                title="Connect to a Database"
                description="Connect to your enterprise database. Visualize schemas and run queries with our intuitive modeling canvas. (Coming soon)"
                to="/enterprise-db"
                linkText="Connect to DB"
            />
        </div>
      </div>
    </div>
  );
};

export default HomePage;