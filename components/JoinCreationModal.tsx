import React, { useState, useEffect } from 'react';
import { Join } from '../types';
import { Link } from 'lucide-react';
import Modal from './Modal';

interface JoinCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (joinType: Join['joinType']) => void;
  details: Omit<Join, 'id' | 'joinType'> | null;
  tableNameMap: Record<string, string>;
}

const JoinCreationModal: React.FC<JoinCreationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  details,
  tableNameMap,
}) => {
  const [joinType, setJoinType] = useState<Join['joinType']>('inner');

  useEffect(() => {
    if (isOpen) {
      setJoinType('inner');
    }
  }, [isOpen]);

  if (!details) return null;

  const handleSubmit = () => {
    onConfirm(joinType);
  };
  
  const modalTitle = (
    <><Link size={18} className="mr-2 text-primary" />Create Join</>
  );

  const modalFooter = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-black/5 rounded-md mr-2">Cancel</button>
      <button onClick={handleSubmit} className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover text-sm">Confirm Join</button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} footer={modalFooter}>
      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-secondary-background p-3 rounded-lg border border-border">
                  <p className="font-semibold text-text truncate" title={tableNameMap[details.table1] || details.table1}>{tableNameMap[details.table1] || details.table1}</p>
                  <p className="text-text-secondary font-mono mt-1">{details.column1}</p>
              </div>
              <div className="bg-secondary-background p-3 rounded-lg border border-border">
                  <p className="font-semibold text-text truncate" title={tableNameMap[details.table2] || details.table2}>{tableNameMap[details.table2] || details.table2}</p>
                  <p className="text-text-secondary font-mono mt-1">{details.column2}</p>
              </div>
          </div>
          <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Join Type</label>
              <select 
                  value={joinType} 
                  onChange={e => setJoinType(e.target.value as Join['joinType'])}
                  className="w-full p-2.5 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card text-sm"
              >
                  <option value="inner">Inner Join</option>
                  <option value="left">Left Join</option>
                  <option value="right">Right Join</option>
                  <option value="outer">Full Outer Join</option>
              </select>
          </div>
      </div>
    </Modal>
  );
};

export default JoinCreationModal;