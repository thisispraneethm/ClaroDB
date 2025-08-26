import React from 'react';
import { Hash, Type } from 'lucide-react';

interface DataTypeIconProps {
  type: string;
}

const DataTypeIcon: React.FC<DataTypeIconProps> = ({ type }) => {
  let icon;
  let colorClass;

  switch (type.toUpperCase()) {
    case 'NUMBER':
    case 'INTEGER':
    case 'FLOAT':
      icon = <Hash size={12} />;
      colorClass = 'text-blue-500';
      break;
    case 'TEXT':
    case 'STRING':
    case 'VARCHAR':
      icon = <Type size={12} />;
      colorClass = 'text-green-500';
      break;
    default:
      icon = <span className="text-xs font-mono">?</span>;
      colorClass = 'text-gray-400';
  }

  return (
    <div className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm bg-black/5 ${colorClass}`}>
      {icon}
    </div>
  );
};

export default DataTypeIcon;