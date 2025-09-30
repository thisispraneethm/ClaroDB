import React, { useState, useEffect, useCallback } from 'react';
import Container from '../components/Container';
import { TableSchema, Join, Point } from '../types';
import { Loader2, X, CheckCircle, DatabaseZap } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import { v4 as uuidv4 } from 'uuid';
import JoinCreationModal from '../components/JoinCreationModal';
import DataModelingCanvas from '../components/DataModelingCanvas';

const EnterpriseDBPage: React.FC = () => {
  const { 
    llmProvider, 
    enterpriseHandler: handler, 
    enterpriseConversation, 
    setEnterpriseConversation,
    enterpriseHistory,
    setEnterpriseHistory,
    enterpriseIsConnected: isConnected,
    setEnterpriseIsConnected: setIsConnected,
    enterpriseSchemas: schemas,
    setEnterpriseSchemas: setSchemas,
    enterprisePreviewData: previewData,
    setEnterprisePreviewData: setPreviewData,
    enterpriseJoins: joins,
    setEnterpriseJoins: setJoins,
    enterpriseCardPositions: cardPositions,
    setEnterpriseCardPositions: setCardPositions
  } = useAppContext();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [question, setQuestion] = useState('');

  const [modalState, setModalState] = useState<{isOpen: boolean, details: Omit<Join, 'id' | 'joinType'> | null}>({isOpen: false, details: null});
  
  const {
    askQuestion,
    executeApprovedSql,
    isProcessing: isAnalysisLoading,
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation: enterpriseConversation,
      setConversation: setEnterpriseConversation,
      history: enterpriseHistory,
      setHistory: setEnterpriseHistory
  });

  const handleConnect = async () => {
    setIsProcessing(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency
        await handler.connect();
        const s = await handler.getSchemas();
        setSchemas(s);

        const initialPositions: Record<string, Point> = {};
        Object.keys(s).forEach((tableName, i) => {
            initialPositions[tableName] = { x: (i % 3) * 340 + 60, y: Math.floor(i / 3) * 320 + 60 };
        });
        setCardPositions(initialPositions);
        
        const newPreviewData: Record<string, Record<string, any>[]> = {};
        for(const tableName of Object.keys(s)) {
            newPreviewData[tableName] = await handler.getPreview(tableName, 5);
        }
        setPreviewData(newPreviewData);
        setIsConnected(true);
    } catch (e: any) {
        console.error("Connection failed", e);
    } finally {
        setIsProcessing(false);
    }
  };
    
  const handleOpenJoinModal = useCallback((details: Omit<Join, 'id' | 'joinType'>) => {
    setModalState({ isOpen: true, details });
  }, []);

  const handleConfirmJoin = (joinType: Join['joinType']) => {
      if (!modalState.details) return;

      const newJoin = { ...modalState.details!, id: uuidv4(), joinType };

      // Check for duplicates (in either direction)
      const alreadyExists = joins.some(j =>
          (j.table1 === newJoin.table1 && j.column1 === newJoin.column1 && j.table2 === newJoin.table2 && j.column2 === newJoin.column2) ||
          (j.table1 === newJoin.table2 && j.column1 === newJoin.column2 && j.table2 === newJoin.table1 && j.column2 === newJoin.column1)
      );
      
      if (!alreadyExists) {
        setJoins(prev => [...prev, newJoin]);
      }
      setModalState({ isOpen: false, details: null });
  };
  
  const handleRemoveJoin = (id: string) => setJoins(prev => prev.filter(j => j.id !== id));
  
  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas, joins);
    setQuestion('');
  };
  
  const getPlaceholder = () => {
    if (!isConnected) return "Please connect to the database to begin";
    if (isProcessing) return "Processing...";
    if (Object.keys(schemas || {}).length > 1 && joins.length === 0) return "Define a join by dragging between columns";
    return "Ask a question about your database...";
  };

  const canAskQuestion = isConnected && ( (Object.keys(schemas || {}).length === 1) || (Object.keys(schemas || {}).length > 1 && joins.length > 0) );
  const isChatDisabled = isProcessing || isAnalysisLoading || !canAskQuestion;

  if (!isConnected) {
    const inputClasses = "w-full p-2.5 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    return (
      <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10 flex items-center justify-center animate-fade-in-up">
        <div className="max-w-md w-full">
            <Container>
                <div className="text-center mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                        <DatabaseZap size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-text">Connect to Database</h1>
                    <p className="text-text-secondary text-sm">This is a simulated connection for demonstration purposes.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={labelClasses}>Host</label>
                        <input type="text" value="demo-rds.clarodb.com" disabled className={`${inputClasses} bg-secondary-background`}/>
                    </div>
                    <div>
                        <label className={labelClasses}>Database Name</label>
                        <input type="text" value="sales_db" disabled className={`${inputClasses} bg-secondary-background`}/>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleConnect}
                        disabled={isProcessing}
                        className="w-full px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    >
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <DatabaseZap className="mr-2" size={16} />}
                        Connect to Demo Database
                    </button>
                </div>
            </Container>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataModelingCanvas
        isLoading={isProcessing}
        loadingText="Connecting..."
        schemas={schemas}
        cardPositions={cardPositions}
        setCardPositions={setCardPositions}
        joins={joins}
        onOpenJoinModal={handleOpenJoinModal}
        conversation={enterpriseConversation}
        onExecuteSql={executeApprovedSql}
        onGenerateInsights={generateInsightsForTurn}
        onGenerateChart={generateChartForTurn}
        question={question}
        setQuestion={setQuestion}
        onSend={handleSend}
        isChatDisabled={isChatDisabled}
        placeholder={getPlaceholder()}
        tableNameMap={{}}
      >
        {/* Left sidebar content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <Container title="1. Connection Status">
          <div className="flex items-center text-success bg-success/10 p-3 rounded-lg border border-success/20">
                  <CheckCircle size={20} className="mr-3 flex-shrink-0" />
                  <div>
                      <h4 className="font-semibold">Connected</h4>
                      <p className="text-sm">sales_db @ demo-rds.clarodb.com</p>
                  </div>
          </div>
          </Container>

          {schemas && Object.keys(schemas).length > 1 && (
              <Container title="2. Active Joins">
                  {joins.length > 0 ? (
                  <div className="space-y-2">
                      {joins.map(join => (
                      <div 
                          key={join.id} 
                          className="flex items-center justify-between p-2 bg-background/70 rounded-md border border-border text-xs transition-all"
                      >
                          <div className="flex items-center gap-1.5 text-text-secondary flex-wrap">
                          <span className="font-semibold text-text truncate" title={join.table1}>{join.table1}</span>.<span className="font-mono">{join.column1}</span>
                          <span className="font-bold text-primary">{`(${join.joinType.charAt(0).toUpperCase()})`}</span>
                          <span className="font-semibold text-text truncate" title={join.table2}>{join.table2}</span>.<span className="font-mono">{join.column2}</span>
                          </div>
                          <button onClick={() => handleRemoveJoin(join.id)} className="p-1 text-text-secondary hover:text-danger rounded-full ml-2 flex-shrink-0"><X size={14} /></button>
                      </div>
                      ))}
                  </div>
                  ) : (
                      <div className="flex items-center text-sm text-text-secondary p-2 bg-background/70 rounded-md">
                          <p>Drag between columns on the canvas to create a join.</p>
                      </div>
                  )}
              </Container>
          )}
        </div>
      </DataModelingCanvas>
      
      <JoinCreationModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({isOpen: false, details: null})}
        onConfirm={handleConfirmJoin}
        details={modalState.details}
        tableNameMap={{}}
      />
    </>
  );
};

export default EnterpriseDBPage;