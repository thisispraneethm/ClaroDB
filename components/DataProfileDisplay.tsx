import React from 'react';
import { DataProfile } from '../types';

interface DataProfileDisplayProps {
  profile: DataProfile[];
}

const DataProfileDisplay: React.FC<DataProfileDisplayProps> = ({ profile }) => {
  if (!profile || profile.length === 0) {
    return <p className="text-sm text-text-secondary">No data profile to display.</p>;
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-card">
      <table className="w-full text-sm text-left">
        <thead className="bg-secondary-background">
          <tr>
            <th className="px-4 py-3 font-semibold text-text">Column Name</th>
            <th className="px-4 py-3 font-semibold text-text">Data Type</th>
            <th className="px-4 py-3 font-semibold text-text">Filled</th>
            <th className="px-4 py-3 font-semibold text-text w-1/4">Missing (%)</th>
          </tr>
        </thead>
        <tbody>
          {profile.map((row, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-text-secondary">{row.column}</td>
              <td className="px-4 py-2 font-mono text-text-secondary">{row.type}</td>
              <td className="px-4 py-2 text-text">{row.filled.toLocaleString()}</td>
              <td className="px-4 py-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-danger h-2 rounded-full" style={{ width: row.missing }}></div>
                  </div>
                  <span className="text-xs text-text-secondary w-12 text-right">{row.missing}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataProfileDisplay;