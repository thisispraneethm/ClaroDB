import React from 'react';
import { ShieldCheck, Cpu, Layers3, Zap } from 'lucide-react';

const AboutPage: React.FC = () => {
  const TechCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-text">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary">{children}</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-12 animate-fade-in-up">
      <div className="max-w-4xl mx-auto">
        <div className="text-center pt-8 pb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-text mb-4">
            About ClaroDB
          </h1>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            An intelligent, secure, and entirely browser-based workspace designed to democratize data analysis.
          </p>
        </div>

        <div className="space-y-12">
          {/* Security & Privacy Section */}
          <div className="p-8 bg-card/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-card">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 text-center">
                <div className="p-5 rounded-full bg-primary/10 inline-block">
                  <ShieldCheck size={48} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold mt-4 text-text">Your Data, Your Browser.</h2>
              </div>
              <div>
                <p className="text-md text-text-secondary leading-relaxed">
                  At ClaroDB, we value your privacy above all else. Our architecture is built on a simple but powerful promise: **your data never leaves your computer**. All file processing, storage, and SQL execution happens locally within your browser. We do not have servers that see, store, or interact with your raw data.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start"><Cpu size={16} className="mr-3 mt-1 text-primary flex-shrink-0" /><span><strong>Client-Side Processing:</strong> Files are parsed and queried directly on your machine. The only data sent to the cloud is the anonymous table schema (column names and types) and your natural language question to the AI model. Your raw data rows are never sent.</span></li>
                  <li className="flex items-start"><Cpu size={16} className="mr-3 mt-1 text-primary flex-shrink-0" /><span><strong>In-Memory & IndexedDB:</strong> Data is loaded into your browser's memory for analysis and stored in IndexedDB for persistence across sessions, not on a remote server. This ensures your data remains private and secure.</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tech Stack Section */}
          <div>
            <h2 className="text-3xl font-bold text-center mb-8 text-text">The Technology Powering Clarity</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <TechCard icon={<Zap size={20} />} title="Google Gemini API">
                The state-of-the-art AI model that translates your plain English questions into precise, executable SQL queries.
              </TechCard>
              <TechCard icon={<Layers3 size={20} />} title="React & TypeScript">
                Builds a modern, reliable, and performant user interface, ensuring a smooth and responsive experience.
              </TechCard>
              <TechCard icon={<Cpu size={20} />} title="IndexedDB & AlaSQL">
                A powerful combination for client-side data handling. IndexedDB provides robust, persistent storage in your browser, while AlaSQL acts as the in-browser SQL engine to execute queries instantly.
              </TechCard>
              <TechCard icon={<Layers3 size={20} />} title="Tailwind CSS & Recharts">
                Creates a beautiful, clean, and responsive design, with powerful charting capabilities for intuitive data visualization.
              </TechCard>
            </div>
          </div>

          {/* Our Philosophy Section */}
          <div className="text-center pt-8">
            <h2 className="text-3xl font-bold mb-4 text-text">Our Philosophy</h2>
            <p className="text-md text-text-secondary max-w-3xl mx-auto leading-relaxed">
              We believe that data holds incredible power, but for too long, accessing its insights has been a complex, technical challenge. ClaroDB was created to break down those barriers. By combining a simple conversational interface with powerful AI, we aim to make data analysis as easy as asking a question. We're committed to building tools that are not only powerful but also secure, private, and accessible to everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
