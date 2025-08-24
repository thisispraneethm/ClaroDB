
import React from 'react';
import Container from '../components/Container';
import { Shield } from 'lucide-react';
import SchemaDisplay from '../components/SchemaDisplay';
import { TableSchema } from '../types';
import ComingSoonOverlay from '../components/ComingSoonOverlay';

type DBType = 'postgresql' | 'mysql';

const mockSchema: TableSchema = {
    'users': [
        { name: 'id', type: 'INT' },
        { name: 'name', type: 'VARCHAR' },
        { name: 'email', type: 'VARCHAR' },
        { name: 'created_at', type: 'TIMESTAMP' },
    ],
    'orders': [
        { name: 'order_id', type: 'INT' },
        { name: 'user_id', type: 'INT' },
        { name: 'amount', type: 'DECIMAL' },
        { name: 'order_date', type: 'DATE' },
    ],
    'products': [
        { name: 'product_id', type: 'INT' },
        { name: 'name', type: 'VARCHAR' },
        { name: 'price', type: 'DECIMAL' },
    ]
};

const EnterpriseDBPage: React.FC = () => {
  // All state and handlers are preserved for when the feature goes live.
  const [dbType, setDbType] = React.useState<DBType>('postgresql');
  const [host, setHost] = React.useState('localhost');
  const [port, setPort] = React.useState('5432');
  const [user, setUser] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [dbname, setDbname] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [showSchema, setShowSchema] = React.useState(false);

  const handleConnect = () => {
    setError(
        "Direct browser-to-database connections are insecure and not supported. In a production environment, this application would connect to a secure backend service, which would then safely connect to your database. This prevents exposing your database credentials and protects against security vulnerabilities."
    );
    setShowSchema(true);
  };
  
  const handleTypeChange = (type: DBType) => {
      setDbType(type);
      setPort(type === 'postgresql' ? '5432' : '3306');
      setError(null);
      setShowSchema(false);
  }

  const inputClasses = "w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

  return (
    <div className="relative space-y-8 max-w-4xl mx-auto">
      <ComingSoonOverlay />
      
      {/* The entire page content below is preserved but covered by the overlay. */}
      <h1 className="text-3xl font-bold text-text">Enterprise Database</h1>
      <p className="text-text-secondary">Connect directly to your live database for real-time insights.</p>

      <Container title="1. Connection Details">
        <div className="space-y-4">
            <div>
                <label className={labelClasses}>Database Type</label>
                <select 
                    value={dbType} 
                    onChange={(e) => handleTypeChange(e.target.value as DBType)} 
                    className={inputClasses}
                >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClasses}>Host</label>
                    <input type="text" value={host} onChange={e => setHost(e.target.value)} className={inputClasses}/>
                </div>
                <div>
                    <label className={labelClasses}>Port</label>
                    <input type="text" value={port} onChange={e => setPort(e.target.value)} className={inputClasses}/>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClasses}>Username</label>
                    <input type="text" value={user} onChange={e => setUser(e.target.value)} className={inputClasses}/>
                </div>
                <div>
                    <label className={labelClasses}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses}/>
                </div>
            </div>
            <div>
                <label className={labelClasses}>Database Name</label>
                <input type="text" value={dbname} onChange={e => setDbname(e.target.value)} className={inputClasses}/>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleConnect}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover disabled:bg-gray-400 flex items-center transition-colors"
          >
            Connect
          </button>
        </div>
      </Container>

      {error && (
         <div className="flex items-start bg-warning/10 text-yellow-700 p-4 rounded-lg border border-warning/20">
            <Shield size={24} className="mr-3 flex-shrink-0 mt-0.5 text-warning" /> 
            <div>
                <h3 className="font-semibold text-yellow-800">Security Best Practice</h3>
                <p className="text-sm">{error}</p>
            </div>
        </div>
      )}
      
      {showSchema && (
        <Container title="Data Model" caption="A sample schema is shown below. In a real environment, this would be your database's schema.">
            <SchemaDisplay schemas={mockSchema} />
        </Container>
      )}

    </div>
  );
};

export default EnterpriseDBPage;
