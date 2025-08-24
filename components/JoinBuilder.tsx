import React, { useState, useEffect } from 'react';
import { TableSchema, Join } from '../types';
import { Plus } from 'lucide-react';

interface JoinBuilderProps {
  schemas: TableSchema;
  onAddJoin: (join: Omit<Join, 'id'>) => void;
  tableNameMap: Record<string, string>;
}

const JoinBuilder: React.FC<JoinBuilderProps> = ({ schemas, onAddJoin, tableNameMap }) => {
  const tableNames = Object.keys(schemas);
  const [table1, setTable1] = useState(tableNames[0] || '');
  const [column1, setColumn1] = useState('');
  const [table2, setTable2] = useState(tableNames[1] || tableNames[0] || '');
  const [column2, setColumn2] = useState('');
  const [joinType, setJoinType] = useState<Join['joinType']>('inner');

  // This single, consolidated effect atomically resets the component's entire state
  // whenever the available schemas change. This fixes a subtle race condition
  // caused by the previous chained useEffects, where the component could attempt
  // to access columns for a table before its state had fully updated to the new
  // set of tables. This new approach guarantees that the table and column
  // dropdowns are always perfectly synchronized with the currently loaded data.
  useEffect(() => {
    const newTableNames = Object.keys(schemas);

    const newTable1 = newTableNames[0] || '';
    const newTable2 = newTableNames[1] || newTableNames[0] || '';
    
    setTable1(newTable1);
    setTable2(newTable2);
    
    // Set columns based on the new tables, not the state variables which might be stale during a re-render
    setColumn1(schemas[newTable1]?.[0]?.name || '');
    setColumn2(schemas[newTable2]?.[0]?.name || '');
  }, [schemas]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (table1 && column1 && table2 && column2 && joinType) {
      onAddJoin({ table1, column1, table2, column2, joinType });
    }
  };
  
  const selectClasses = "w-full p-2.5 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card text-sm";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1.5";

  if (tableNames.length < 2) {
    return <p className="text-sm text-text-secondary">Upload at least two files to define a join.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2">
          <label className={labelClasses}>Left Table</label>
          <select value={table1} onChange={e => setTable1(e.target.value)} className={selectClasses}>
            {tableNames.map(name => <option key={name} value={name}>{tableNameMap[name]}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClasses}>Left Column</label>
          <select value={column1} onChange={e => setColumn1(e.target.value)} className={selectClasses} disabled={!table1}>
            {schemas[table1]?.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
          </select>
        </div>
         <div className="md:col-span-2 lg:col-span-1">
            <label className={labelClasses}>Join Type</label>
            <select value={joinType} onChange={e => setJoinType(e.target.value as any)} className={selectClasses}>
              <option value="inner">Inner</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="outer">Outer</option>
            </select>
          </div>
        <div className="md:col-span-2">
          <label className={labelClasses}>Right Table</label>
          <select value={table2} onChange={e => setTable2(e.target.value)} className={selectClasses}>
            {tableNames.map(name => <option key={name} value={name}>{tableNameMap[name]}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClasses}>Right Column</label>
          <select value={column2} onChange={e => setColumn2(e.target.value)} className={selectClasses} disabled={!table2}>
            {schemas[table2]?.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={!table1 || !column1 || !table2 || !column2} className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 flex items-center transition-colors">
          <Plus size={16} className="mr-2" /> Add Join
        </button>
      </div>
    </form>
  );
};

export default JoinBuilder;