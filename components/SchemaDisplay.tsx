import React from 'react';
import { TableSchema } from '../types';
import { Table2 } from 'lucide-react';

interface SchemaDisplayProps {
  schemas: TableSchema;
  tableNameMap?: Record<string, string>;
}

const SchemaDisplay: React.FC<SchemaDisplayProps> = ({ schemas, tableNameMap = {} }) => {
  if (Object.keys(schemas).length === 0) {
    return <p className="text-sm text-text-secondary">No schema to display.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Object.entries(schemas).map(([tableName, columns]) => (
        <div key={tableName} className="bg-card border border-border rounded-lg p-4 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-border/50">
            <Table2 size={16} className="text-text-secondary" />
            <h3 className="font-semibold text-md text-text truncate" title={tableNameMap[tableName] || tableName}>
              {tableNameMap[tableName] || tableName}
            </h3>
          </div>
          <div className="space-y-1.5">
            {columns.map((col) => (
              <div key={col.name} className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium truncate pr-2">{col.name}</span>
                <span className="text-text-secondary font-mono text-xs bg-secondary-background px-1.5 py-0.5 rounded-sm">{col.type}</span>
              </div>
            ))}
             {columns.length === 0 && <span className="text-xs text-text-secondary">No columns found.</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SchemaDisplay;