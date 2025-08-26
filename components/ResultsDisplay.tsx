
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { ConversationTurn } from '../types';
import { Table, BarChart2, Lightbulb, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface ResultsDisplayProps {
  turn: ConversationTurn;
  onGenerateInsights: (turnId: string) => void;
  onGenerateChart: (turnId: string) => void;
}

type Tab = 'table' | 'insights' | 'chart';
const ROWS_PER_PAGE = 50;
const COLORS = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#af52de'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
        <p className="font-semibold text-sm text-text">{label}</p>
        {payload.map((pld: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: pld.color }}>{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const MetadataDisplay: React.FC<{
  label: string;
  model: string;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
}> = ({ label, model, cost, prompt_tokens, completion_tokens }) => {
  const totalTokens = prompt_tokens + completion_tokens;
  if (model === 'N/A' && totalTokens === 0) return null;

  return (
    <div className="text-right text-xs text-text-secondary space-x-3 flex items-center justify-end flex-wrap">
      <span className="font-semibold text-text">{label}:</span>
      <span>Model: <b className="text-text">{model}</b></span>
      <span>Tokens: <b className="text-text">{totalTokens.toLocaleString()}</b></span>
      <span>Cost: <b className="text-text">${cost.toFixed(6)}</b></span>
    </div>
  );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ turn, onGenerateInsights, onGenerateChart }) => {
  const { analysisResult, insightsResult, chartResult, insightsLoading, chartLoading } = turn;
  const data = analysisResult?.data || [];
  const sqlResult = analysisResult?.sqlResult;
  
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [currentPage, setCurrentPage] = useState(1);
  
  const prevTurnRef = useRef<ConversationTurn | null>(null);
  
  useEffect(() => {
    // This robust effect only switches tabs when a *new* piece of data is generated for the turn.
    // It prevents conflicts with user actions and fixes the previous state management bugs.
    const prevTurn = prevTurnRef.current;
    
    const justGotData = !prevTurn?.analysisResult && !!turn.analysisResult;
    const justGotInsights = !prevTurn?.insightsResult && !!turn.insightsResult;
    const justGotChart = !prevTurn?.chartResult?.chartConfig && !!turn.chartResult?.chartConfig;

    if (justGotChart) {
        setActiveTab('chart');
    } else if (justGotInsights) {
        setActiveTab('insights');
    } else if (justGotData) {
        setActiveTab('table');
    }

    // Always reset pagination when the underlying data changes
    if (turn.analysisResult !== prevTurn?.analysisResult) {
        setCurrentPage(1);
    }
    
    // Update the ref for the next render
    prevTurnRef.current = turn;
  }, [turn]);

  const hasInsights = !!insightsResult && insightsResult.insights !== "No insights generated.";
  const hasChart = chartResult?.chartConfig !== null && chartResult?.chartConfig !== undefined;

  const renderChart = () => {
    if (chartLoading) {
      return <div className="text-center py-8 text-text-secondary flex items-center justify-center"><Loader2 size={20} className="animate-spin mr-2" /> Generating chart...</div>;
    }
    if (!chartResult?.chartConfig || !data) return (
        <div className="bg-secondary-background rounded-lg border border-border">
            {chartResult && (
              <div className="px-4 py-2 border-b border-border">
                <MetadataDisplay
                    label="Chart Generation"
                    model={chartResult.model}
                    cost={chartResult.cost}
                    prompt_tokens={chartResult.prompt_tokens}
                    completion_tokens={chartResult.completion_tokens}
                />
              </div>
            )}
            <div className="text-center py-8 text-text-secondary">Chart could not be generated for this query.</div>
        </div>
    );
    const { chartType, dataKey, nameKey, title } = chartResult.chartConfig;

    return (
      <div className="w-full bg-card rounded-lg border border-border">
        <div className="px-4 py-2 border-b border-border">
          <MetadataDisplay
              label="Chart Generation"
              model={chartResult.model}
              cost={chartResult.cost}
              prompt_tokens={chartResult.prompt_tokens}
              completion_tokens={chartResult.completion_tokens}
          />
        </div>
        <div className="h-96 w-full p-4">
            <h4 className="text-center font-semibold mb-4 text-text">{title}</h4>
            <ResponsiveContainer>
              {(() => {
                switch (chartType) {
                  case 'bar':
                    return (
                      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 12%, 84%)" />
                        <XAxis dataKey={nameKey} tick={{ fontSize: 12, fill: 'hsl(216, 8%, 45%)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'hsl(216, 8%, 45%)' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(216, 12%, 92%)' }}/>
                        <Legend />
                        <Bar dataKey={dataKey} fill="#007AFF" />
                      </BarChart>
                    );
                  case 'line':
                    return (
                      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 12%, 84%)" />
                          <XAxis dataKey={nameKey} tick={{ fontSize: 12, fill: 'hsl(216, 8%, 45%)' }} />
                          <YAxis tick={{ fontSize: 12, fill: 'hsl(216, 8%, 45%)' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line type="monotone" dataKey={dataKey} stroke="#007AFF" strokeWidth={2} />
                      </LineChart>
                    );
                  case 'pie':
                    return (
                      <PieChart>
                        <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={120} label>
                          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    );
                  default:
                      return <div className="text-center py-8 text-text-secondary">Unsupported chart type: {chartType}</div>;
                }
              })()}
            </ResponsiveContainer>
        </div>
      </div>
    );
  };
  
  const headers = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data]);
  
  const totalPages = data ? Math.ceil(data.length / ROWS_PER_PAGE) : 0;
  const paginatedData = useMemo(() => {
    if (!data) return [];
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage]);

  const renderContent = () => {
    switch(activeTab) {
      case 'table':
        return data.length > 0 ? (
           <div className="overflow-x-auto border border-border rounded-lg bg-card">
              <table className="w-full text-sm text-left">
                  <thead className="bg-secondary-background">
                      <tr>
                          {headers.map(h => <th key={h} className="px-4 py-3 font-semibold text-text">{h}</th>)}
                      </tr>
                  </thead>
                  <tbody>
                      {paginatedData.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                              {headers.map(h => <td key={h} className="px-4 py-2 text-text-secondary truncate max-w-xs">{String(row[h])}</td>)}
                          </tr>
                      ))}
                  </tbody>
              </table>
               {totalPages > 1 && (
                  <div className="flex justify-between items-center p-2 border-t border-border text-xs text-text-secondary">
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-2 py-1 rounded disabled:opacity-50 hover:bg-black/5 flex items-center">
                        <ChevronLeft size={14} className="mr-1" /> Prev
                      </button>
                      <span>Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-2 py-1 rounded disabled:opacity-50 hover:bg-black/5 flex items-center">
                        Next <ChevronRight size={14} className="ml-1" />
                      </button>
                  </div>
              )}
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">The query returned no results.</div>
        );
      case 'insights':
        if (insightsLoading) {
            return <div className="text-center py-8 text-text-secondary flex items-center justify-center"><Loader2 size={20} className="animate-spin mr-2" /> Generating insights...</div>;
        }
        return (
            <div className="bg-card rounded-lg border border-border">
                {insightsResult && (
                  <div className="px-4 py-2 border-b border-border">
                    <MetadataDisplay
                        label="Insight Generation"
                        model={insightsResult.model}
                        cost={insightsResult.cost}
                        prompt_tokens={insightsResult.prompt_tokens}
                        completion_tokens={insightsResult.completion_tokens}
                    />
                  </div>
                )}
                <div className="prose prose-sm max-w-none p-4 text-text">
                    <ReactMarkdown>{insightsResult?.insights || ''}</ReactMarkdown>
                </div>
            </div>
        );
      case 'chart':
        return renderChart();
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      {sqlResult && (
        <div className="pb-3 border-b border-border">
            <MetadataDisplay
                label="SQL Generation"
                model={sqlResult.model}
                cost={sqlResult.cost}
                prompt_tokens={sqlResult.prompt_tokens}
                completion_tokens={sqlResult.completion_tokens}
            />
        </div>
      )}
      <div className="border-b border-border flex items-center justify-between">
          <div className="flex space-x-1">
            <TabButton icon={<Table size={16} />} label="Table" isActive={activeTab === 'table'} onClick={() => setActiveTab('table')} />
            <TabButton icon={<Lightbulb size={16} />} label="Insights" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
            <TabButton icon={<BarChart2 size={16} />} label="Chart" isActive={activeTab === 'chart'} onClick={() => setActiveTab('chart')} />
          </div>
          <div className="flex space-x-2 pb-px">
            {!hasInsights && activeTab === 'insights' && (
                <button onClick={() => onGenerateInsights(turn.id)} disabled={insightsLoading} className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 flex items-center">
                    {insightsLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                    Generate Insight Summary
                </button>
            )}
            {!hasChart && activeTab === 'chart' && (
                <button onClick={() => onGenerateChart(turn.id)} disabled={chartLoading} className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 flex items-center">
                    {chartLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                    Generate Chart
                </button>
            )}
          </div>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick, disabled = false }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed relative ${
                isActive 
                ? 'text-primary' 
                : 'text-text-secondary hover:text-text'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>}
        </button>
    )
}

export default ResultsDisplay;