
import React from 'react';

interface DataPreviewProps {
  data: Record<string, any>[];
}

const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-text-secondary">No data to preview.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto border border-border rounded-lg max-h-96 bg-card">
      <table className="w-full text-sm text-left">
        <thead className="bg-background sticky top-0">
          <tr>
            {headers.map(h => <th key={h} className="px-4 py-3 font-semibold text-text">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {headers.map(h => <td key={h} className="px-4 py-2 text-text-secondary truncate max-w-xs">{String(row[h])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataPreview;