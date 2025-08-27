import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { ConversationTurn, ChartGenerationResult } from '../types';
import { Table, BarChart2, Lightbulb, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface ResultsDisplayProps {
  turn: ConversationTurn;
  onGenerateInsights: (turnId: string) => void;
  onGenerateChart: (turnId: string) => void;
}

type Tab = 'table' | 'insights' | 'chart';
const ROWS_PER_PAGE = 50;
const PALETTE = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-lg p-3 border border-black/10 rounded-xl shadow-2xl animate-scale-in text-text">
        <p className="font-bold text-sm mb-2 text-text">{label}</p>
        {payload.map((pld: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-sm font-medium my-1 gap-4">
                <div className="flex items-center" style={{ color: pld.color }}>
                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: pld.color }}/>
                    <span>{pld.name}</span>
                </div>
                <span className="font-bold text-text">{pld.value.toLocaleString()}</span>
            </div>
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

const ChartControls: React.FC<{
    config: ChartGenerationResult;
    setConfig: React.Dispatch<React.SetStateAction<ChartGenerationResult | null>>;
    numericColumns: string[];
    categoricalColumns: string[];
    allColumns: string[];
}> = ({ config, setConfig, numericColumns, categoricalColumns, allColumns }) => {

    const handleChartTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as ChartGenerationResult['chartType'];
        setConfig(prev => {
            if (!prev) return null;
            let newDataKeys = prev.dataKeys;
            if (newType === 'pie' && prev.dataKeys.length > 1) {
                newDataKeys = [prev.dataKeys[0]];
            }
            return { ...prev, chartType: newType, dataKeys: newDataKeys };
        });
    };

    const handleXAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setConfig(prev => prev ? { ...prev, nameKey: e.target.value } : null);
    };

    const handleYAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYKey = e.target.value;
        setConfig(prev => {
            if (!prev) return null;
            const newConfig: ChartGenerationResult = { ...prev, dataKeys: [newYKey] };
            // If chart was multi-series, simplify it to a basic bar chart
            if (prev.chartType === 'stackedBar' || prev.chartType === 'composed') {
                newConfig.chartType = 'bar';
            }
            return newConfig;
        });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig(prev => prev ? { ...prev, title: e.target.value } : null);
    };

    const xAxisOptions = useMemo(() => {
        if (config.chartType === 'scatter') return numericColumns;
        if (config.chartType === 'pie') return categoricalColumns;
        return allColumns;
    }, [config.chartType, numericColumns, categoricalColumns, allColumns]);
    
    const controlClass = "w-full p-2 text-sm border border-input rounded-md focus:ring-1 focus:ring-ring focus:outline-none transition bg-card";

    return (
        <div className="p-3 bg-secondary-background/70 border-b border-black/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Chart Title</label>
                 <input type="text" value={config.title} onChange={handleTitleChange} className={controlClass} />
            </div>
            <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Chart Type</label>
                 <select value={config.chartType} onChange={handleChartTypeChange} className={controlClass}>
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                    <option value="pie">Pie</option>
                    <option value="scatter">Scatter</option>
                    <option value="composed">Composed</option>
                    <option value="stackedBar">Stacked Bar</option>
                 </select>
            </div>
            <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">{config.chartType === 'pie' ? 'Label' : 'X-Axis'}</label>
                 <select value={config.nameKey} onChange={handleXAxisChange} className={controlClass}>
                     {xAxisOptions.map(col => <option key={col} value={col}>{col}</option>)}
                 </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{config.chartType === 'pie' ? 'Value' : 'Y-Axis'}</label>
                <select value={config.dataKeys?.[0] || ''} onChange={handleYAxisChange} className={controlClass} disabled={numericColumns.length === 0}>
                    {numericColumns.length === 0 && <option>No numeric columns</option>}
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
        </div>
    );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ turn, onGenerateInsights, onGenerateChart }) => {
  const { analysisResult, insightsResult, chartResult, insightsLoading, chartLoading } = turn;
  const data = analysisResult?.data || [];
  const sqlResult = analysisResult?.sqlResult;
  
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [editableChartConfig, setEditableChartConfig] = useState<ChartGenerationResult | null>(null);
  
  const prevTurnRef = useRef<ConversationTurn | null>(null);

  useEffect(() => {
    setEditableChartConfig(turn.chartResult?.chartConfig || null);
  }, [turn.chartResult]);
  
  useEffect(() => {
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

    if (turn.analysisResult !== prevTurn?.analysisResult) {
        setCurrentPage(1);
    }
    
    prevTurnRef.current = turn;
  }, [turn]);

  const hasInsights = !!insightsResult && insightsResult.insights !== "No insights generated.";
  const hasChart = chartResult?.chartConfig !== null && chartResult?.chartConfig !== undefined;

  const { numericColumns, categoricalColumns, allColumns } = useMemo(() => {
        if (!data || data.length === 0) {
            return { numericColumns: [], categoricalColumns: [], allColumns: [] };
        }
        const numeric: string[] = [];
        const categorical: string[] = [];
        const all = Object.keys(data[0]);
        for (const header of all) {
            const isNumeric = data.every(row => row[header] === null || typeof row[header] === 'number');
            if (isNumeric) {
                numeric.push(header);
            } else {
                categorical.push(header);
            }
        }
        return { numericColumns: numeric, categoricalColumns: categorical, allColumns: all };
    }, [data]);

  const renderChart = () => {
    if (chartLoading) {
      return <div className="text-center py-8 text-text-secondary flex items-center justify-center"><Loader2 size={20} className="animate-spin mr-2" /> Generating chart...</div>;
    }
    if (!editableChartConfig || !data || data.length === 0) return (
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
    const { chartType, dataKeys, nameKey, title, composedTypes } = editableChartConfig;

    return (
      <div className="w-full bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-card">
        <div className="px-4 py-2 border-b border-black/5">
          <MetadataDisplay
              label="Chart Generation"
              model={chartResult!.model}
              cost={chartResult!.cost}
              prompt_tokens={chartResult!.prompt_tokens}
              completion_tokens={chartResult!.completion_tokens}
          />
        </div>
        <ChartControls
          config={editableChartConfig}
          setConfig={setEditableChartConfig}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          allColumns={allColumns}
        />
        <div className="h-96 w-full p-4">
            <h4 className="text-center font-semibold mb-4 text-text">{title}</h4>
            <ResponsiveContainer>
              {(() => {
                const tickProps = { fontSize: 11, fill: '#5A6474', dy: 5 };
                switch (chartType) {
                  case 'bar':
                    return (
                      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                          <filter id="bar-shadow" x="-20%" y="-20%" width="140%" height="140%">
                             <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={PALETTE[0]} floodOpacity="0.3"/>
                          </filter>
                        </defs>
                        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={tickProps} />
                        <YAxis tickLine={false} axisLine={false} tick={tickProps} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }}/>
                        <Legend wrapperStyle={{fontSize: "12px"}} />
                        <Bar dataKey={dataKeys[0]} fill={PALETTE[0]} radius={[6, 6, 0, 0]} style={{ filter: 'url(#bar-shadow)' }}/>
                      </BarChart>
                    );
                   case 'stackedBar':
                        return (
                          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                            <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={tickProps} />
                            <YAxis tickLine={false} axisLine={false} tick={tickProps} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }}/>
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            {dataKeys.map((key, i) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={PALETTE[i % PALETTE.length]} radius={i === dataKeys.length - 1 ? [6, 6, 0, 0] : [0,0,0,0]} />
                            ))}
                          </BarChart>
                        );
                  case 'line':
                    return (
                      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                           <defs>
                              <filter id="line-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={PALETTE[0]} floodOpacity="0.4"/>
                              </filter>
                          </defs>
                          <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={tickProps} />
                          <YAxis tickLine={false} axisLine={false} tick={tickProps} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: PALETTE[0], strokeWidth: 1, strokeDasharray: "4 4" }}/>
                          <Legend wrapperStyle={{fontSize: "12px"}}/>
                          <Line type="monotone" dataKey={dataKeys[0]} stroke={PALETTE[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: PALETTE[0] }} style={{ filter: 'url(#line-shadow)' }}/>
                      </LineChart>
                    );
                  case 'area':
                        return (
                          <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                             <defs>
                              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0.05}/>
                              </linearGradient>
                              <filter id="line-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={PALETTE[0]} floodOpacity="0.4"/>
                              </filter>
                            </defs>
                            <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                            <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={tickProps} />
                            <YAxis tickLine={false} axisLine={false} tick={tickProps} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }}/>
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Area type="monotone" dataKey={dataKeys[0]} stroke={PALETTE[0]} strokeWidth={2.5} fill="url(#areaGradient)" dot={false} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: PALETTE[0] }} style={{ filter: 'url(#line-shadow)' }} />
                          </AreaChart>
                        );
                  case 'composed':
                        return (
                            <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                                <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={tickProps} />
                                <YAxis tickLine={false} axisLine={false} tick={tickProps} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                {dataKeys.map((key, i) => {
                                    const type = composedTypes?.[i] || 'bar';
                                    const color = PALETTE[i % PALETTE.length];
                                    switch (type) {
                                        case 'line': return <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: color }} />;
                                        case 'area': return <Area key={key} type="monotone" dataKey={key} fill={color} stroke={color} fillOpacity={0.6} dot={false} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: color }} />;
                                        default: return <Bar key={key} dataKey={key} fill={color} radius={[6, 6, 0, 0]} />;
                                    }
                                })}
                            </ComposedChart>
                        );
                  case 'pie':
                    return (
                      <PieChart>
                        <Pie 
                          data={data} 
                          dataKey={dataKeys[0]} 
                          nameKey={nameKey} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={'80%'}
                          innerRadius={'60%'}
                          stroke="#F8F9FC"
                          strokeWidth={3}
                          paddingAngle={3}
                          // FIX: The `cornerRadius` prop belongs on the <Pie> component, not on individual <Cell>s.
                          cornerRadius={8}
                        >
                          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
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
           <div className="overflow-x-auto border border-border rounded-lg bg-card/80 backdrop-blur-xl shadow-card">
              <table className="w-full text-sm text-left">
                  <thead className="bg-white/30">
                      <tr>
                          {headers.map(h => <th key={h} className="px-4 py-3 font-semibold text-text">{h}</th>)}
                      </tr>
                  </thead>
                  <tbody>
                      {paginatedData.map((row, i) => (
                          <tr key={i} className="border-t border-black/5 even:bg-white/20">
                              {headers.map(h => <td key={h} className="px-4 py-3 text-text-secondary truncate max-w-xs">{String(row[h])}</td>)}
                          </tr>
                      ))}
                  </tbody>
              </table>
               {totalPages > 1 && (
                  <div className="flex justify-between items-center p-2 border-t border-black/5 text-xs text-text-secondary">
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-2 py-1 rounded-md disabled:opacity-50 hover:bg-black/5 flex items-center transition-colors">
                        <ChevronLeft size={14} className="mr-1" /> Prev
                      </button>
                      <span>Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-2 py-1 rounded-md disabled:opacity-50 hover:bg-black/5 flex items-center transition-colors">
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
            <div className="bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-card">
                {insightsResult && (
                  <div className="px-4 py-2 border-b border-black/5">
                    <MetadataDisplay
                        label="Insight Generation"
                        model={insightsResult.model}
                        cost={insightsResult.cost}
                        prompt_tokens={insightsResult.prompt_tokens}
                        completion_tokens={insightsResult.completion_tokens}
                    />
                  </div>
                )}
                <div className="prose prose-sm max-w-none p-6 text-text prose-headings:text-text prose-strong:text-text">
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
      <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex space-x-1 p-1 bg-secondary-background rounded-full border border-border">
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
      <div className="animate-fade-in-up">{renderContent()}</div>
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
            className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive 
                ? 'text-primary-foreground bg-primary shadow-sm' 
                : 'text-text-secondary hover:text-text hover:bg-black/5'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </button>
    )
}

export default ResultsDisplay;
