

import React, { useState, useEffect } from 'react';
import { TableSchema } from '../types';
import { SlidersHorizontal } from 'lucide-react';
import Container from './Container';

interface DataSamplingProps {
  schemas: TableSchema;
  onApplySampling: (method: 'random' | 'stratified', size: number, column?: string) => void;
  disabled?: boolean;
}

const DataSampling: React.FC<DataSamplingProps> = ({ schemas, onApplySampling, disabled }) => {
  const [method, setMethod] = useState<'random' | 'stratified'>('random');
  const [size, setSize] = useState(1000);
  const [stratifyColumn, setStratifyColumn] = useState('');

  const tableName = Object.keys(schemas)[0];
  const columns = schemas[tableName] || [];

  useEffect(() => {
    // Set a default column for stratification when columns become available
    if (columns.length > 0 && !stratifyColumn) {
      setStratifyColumn(columns[0].name);
    }
  }, [columns, stratifyColumn]);
  
  const isApplyDisabled = disabled || (method === 'stratified' && !stratifyColumn);

  const handleApply = () => {
    if (isApplyDisabled) return;
    onApplySampling(method, size, stratifyColumn);
  };
  
  const inputClasses = "w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card disabled:opacity-50";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

  return (
    <Container title="2. Data Sampling (Optional)" caption="For large files, analyze a smaller sample to improve performance and reduce costs.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <label className={labelClasses}>Sampling Method</label>
                <select value={method} onChange={e => setMethod(e.target.value as any)} className={inputClasses} disabled={disabled}>
                    <option value="random">Random Sampling</option>
                    <option value="stratified">Stratified Sampling</option>
                </select>
            </div>
             {method === 'stratified' && (
                <div>
                    <label className={labelClasses}>Stratify By Column</label>
                    <select value={stratifyColumn} onChange={e => setStratifyColumn(e.target.value)} className={inputClasses} disabled={disabled}>
                        {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                    </select>
                </div>
            )}
            <div className={method === 'random' ? '' : 'md:col-start-3'}>
                <label className={labelClasses}>Sample Size (Rows)</label>
                <input 
                    type="number" 
                    value={size} 
                    onChange={e => setSize(Math.max(1, parseInt(e.target.value, 10)))} 
                    className={inputClasses} 
                    disabled={disabled}
                />
            </div>
        </div>
        <div className="mt-4 flex justify-end">
            <button
                onClick={handleApply}
                disabled={isApplyDisabled}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center transition-colors"
            >
                <SlidersHorizontal size={16} className="mr-2" />
                Apply Sampling
            </button>
        </div>
    </Container>
  );
};

export default DataSampling;