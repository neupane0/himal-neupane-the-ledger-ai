import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Sparkles, Zap, RefreshCw } from 'lucide-react';
import { ai } from '../services/api';

interface MonthlyData {
    month: string;
    actual: number | null;
    predicted: number;
    label: string;
}

interface CategoryBreakdown {
    category: string;
    average_monthly: number;
    last_month: number;
    predicted_next: number;
    trend: 'up' | 'down' | 'stable';
    trend_percentage: number;
}

interface ForecastInsights {
    total_predicted_spending: number;
    avg_monthly_predicted: number;
    monthly_income: number;
    predicted_savings: number;
    trend: 'up' | 'down' | 'stable';
    trend_percentage: number;
    top_growing_category: string | null;
    top_growing_percentage: number;
    recommendation: string;
}

interface ForecastData {
    monthly_data: MonthlyData[];
    predictions: MonthlyData[];
    category_breakdown: CategoryBreakdown[];
    insights: ForecastInsights;
}

const Forecast: React.FC = () => {
    const [data, setData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await ai.forecast();
            setData(response.data);
        } catch (err) {
            console.error('Failed to fetch forecast', err);
            setError('Failed to load forecast data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForecast();
    }, []);

    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
                    <p className="text-zinc-500 mt-2 text-lg">AI-powered financial projections & spending habits.</p>
                </div>
                <Card className="h-[400px] flex items-center justify-center">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Analyzing your spending patterns...</span>
                    </div>
                </Card>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
                    <p className="text-zinc-500 mt-2 text-lg">AI-powered financial projections & spending habits.</p>
                </div>
                <Card className="h-[400px] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-zinc-500 mb-4">{error || 'No data available'}</p>
                        <button 
                            onClick={fetchForecast}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                        >
                            Retry
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // Combine historical and predicted data for chart
    const chartData = [...data.monthly_data, ...data.predictions];
    
    // Find the "today" reference point (last actual month)
    const todayMonth = data.monthly_data.length > 0 
        ? data.monthly_data[data.monthly_data.length - 1].label 
        : null;

    const insights = data.insights;
    const TrendIcon = insights.trend === 'up' ? TrendingUp : (insights.trend === 'down' ? TrendingDown : Minus);
    const trendColor = insights.trend === 'up' ? 'text-red-500' : (insights.trend === 'down' ? 'text-emerald-500' : 'text-zinc-500');

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
                    <p className="text-zinc-500 mt-2 text-lg">AI-powered financial projections & spending habits.</p>
                </div>
                <div className="bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-zinc-200">
                    <Calendar size={16} />
                    Next 6 Months
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <Card className="lg:col-span-2 h-[500px] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl">Projected Spending Trend</h3>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-black"></span>
                                <span className="text-zinc-600">Actual</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-zinc-300"></span>
                                <span className="text-zinc-600">Predicted</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000000" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#71717a', fontSize: 12}} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#71717a', fontSize: 12}} 
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number, name: string) => [`$${value?.toFixed(0) || 0}`, name === 'actual' ? 'Actual' : 'Predicted']}
                                    cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                                />
                                {todayMonth && (
                                    <ReferenceLine 
                                        x={todayMonth} 
                                        stroke="#000" 
                                        strokeDasharray="3 3" 
                                        label={{ position: 'top', value: 'Current', fill: '#000', fontSize: 12, fontWeight: 'bold' }} 
                                    />
                                )}
                                <Area 
                                    type="monotone" 
                                    dataKey="actual" 
                                    stroke="#000" 
                                    strokeWidth={3} 
                                    fill="url(#colorActual)" 
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    connectNulls={false}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="predicted" 
                                    stroke="#A1A1AA" 
                                    strokeWidth={3} 
                                    strokeDasharray="8 8" 
                                    fill="transparent" 
                                    activeDot={{ r: 6, fill: '#A1A1AA' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Insights Panel */}
                <div className="space-y-6 flex flex-col">
                    <Card className="bg-zinc-950 border-zinc-900 text-white flex-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-20">
                            <Sparkles size={80} className="text-white" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-6 text-zinc-400">
                                    <Sparkles size={16} className="text-amber-300" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300/90">AI Recommendation</span>
                                </div>
                                
                                <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                                    {insights.recommendation}
                                </p>
                            </div>

                            {insights.monthly_income > 0 && (
                                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${insights.predicted_savings >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                        <Zap className={`w-5 h-5 ${insights.predicted_savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Predicted Savings</p>
                                        <p className={`text-sm font-medium ${insights.predicted_savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ${Math.abs(insights.predicted_savings).toLocaleString()}/month
                                            {insights.predicted_savings < 0 && ' (deficit)'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {insights.top_growing_category && (
                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            <div className="flex items-start gap-4">
                                <div className="bg-amber-500/10 p-3 rounded-xl">
                                    <AlertTriangle className="text-amber-500 w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Fastest Growing Category</h4>
                                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                                        {insights.top_growing_category} spending is up {insights.top_growing_percentage}% monthly.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h4 className="font-bold text-sm mb-4 text-zinc-500 uppercase tracking-widest">6-Month Projection</h4>
                        <div className="text-4xl font-bold tracking-tight text-zinc-900">
                            ${insights.total_predicted_spending.toLocaleString()}
                        </div>
                        <p className={`text-sm font-medium mt-2 flex items-center gap-1 ${trendColor}`}>
                            <TrendIcon size={14} />
                            {insights.trend === 'stable' ? 'Stable' : `${insights.trend === 'up' ? '+' : ''}${insights.trend_percentage}%`} trend
                        </p>
                    </Card>
                </div>
            </div>

            {/* Category Breakdown */}
            {data.category_breakdown.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <h3 className="font-bold text-xl mb-6">Category Predictions</h3>
                        <div className="space-y-4">
                            {data.category_breakdown.slice(0, 5).map((cat) => {
                                const CatTrendIcon = cat.trend === 'up' ? TrendingUp : (cat.trend === 'down' ? TrendingDown : Minus);
                                const catColor = cat.trend === 'up' ? 'text-red-500' : (cat.trend === 'down' ? 'text-emerald-500' : 'text-zinc-400');
                                
                                return (
                                    <div key={cat.category} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-700">
                                                {cat.category[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-zinc-900">{cat.category}</p>
                                                <p className="text-xs text-zinc-500">Avg: ${cat.average_monthly}/mo</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-zinc-900">${cat.predicted_next}</p>
                                            <p className={`text-xs flex items-center justify-end gap-1 ${catColor}`}>
                                                <CatTrendIcon size={12} />
                                                {cat.trend_percentage > 0 ? '+' : ''}{cat.trend_percentage}%
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-xl mb-6">Spending by Category</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.category_breakdown.slice(0, 6)} layout="vertical" margin={{ left: 80 }}>
                                    <XAxis type="number" tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <Tooltip formatter={(v: number) => [`$${v}`, 'Predicted']} />
                                    <Bar dataKey="predicted_next" radius={[0, 8, 8, 0]}>
                                        {data.category_breakdown.slice(0, 6).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#18181b' : '#a1a1aa'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Forecast;