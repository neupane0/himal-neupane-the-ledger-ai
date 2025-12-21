import React from 'react';
import { Card } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, Calendar, Sparkles, Zap } from 'lucide-react';

const Forecast: React.FC = () => {
    // Mock Data with future prediction
    const data = [
        { month: 'Jul', actual: 2100, predicted: 2100 },
        { month: 'Aug', actual: 2300, predicted: 2300 },
        { month: 'Sep', actual: 1950, predicted: 1950 },
        { month: 'Oct', actual: 2400, predicted: 2400 },
        { month: 'Nov', actual: null, predicted: 2200 }, // Future
        { month: 'Dec', actual: null, predicted: 2600 }, // Future (Holiday)
        { month: 'Jan', actual: null, predicted: 2100 }, // Future
        { month: 'Feb', actual: null, predicted: 1900 }, // Future
        { month: 'Mar', actual: null, predicted: 2000 }, // Future
    ];

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
                {/* Main Chart - Made Bigger (h-[500px]) */}
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
                    
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000000" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                                    </linearGradient>
                                     <pattern id="patternPredicted" patternUnits="userSpaceOnUse" width="4" height="4">
                                        <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#A1A1AA" strokeWidth="1"/>
                                    </pattern>
                                </defs>
                                <XAxis 
                                    dataKey="month" 
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
                                    cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                                />
                                <ReferenceLine x="Oct" stroke="#000" strokeDasharray="3 3" label={{ position: 'top',  value: 'Today', fill: '#000', fontSize: 12, fontWeight: 'bold' }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="actual" 
                                    stroke="#000" 
                                    strokeWidth={3} 
                                    fill="url(#colorActual)" 
                                    activeDot={{ r: 6, strokeWidth: 0 }}
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

                {/* Insights Panel - Styled in Black */}
                <div className="space-y-6 flex flex-col">
                    <Card className="bg-zinc-950 border-zinc-900 text-white flex-1 relative overflow-hidden group">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                        
                        <div className="absolute top-0 right-0 p-6 opacity-20">
                            <Sparkles size={80} className="text-white" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-6 text-zinc-400">
                                    <Sparkles size={16} className="text-amber-300" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300/90">AI Analysis</span>
                                </div>
                                
                                <h4 className="font-bold text-xl mb-2 text-white">Saving Opportunity</h4>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                    Based on your trend, you are likely to underspend on <span className="text-white font-medium">Utilities</span> this month. 
                                    AI recommends allocating the projected surplus of <span className="text-emerald-400 font-bold">$150</span> to your savings goal.
                                </p>
                            </div>

                            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Zap className="text-emerald-400 w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Action</p>
                                    <p className="text-sm font-medium text-emerald-400">Transfer surplus to Savings</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 text-zinc-300">
                         <div className="flex items-start gap-4">
                            <div className="bg-amber-500/10 p-3 rounded-xl">
                                <AlertTriangle className="text-amber-500 w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Holiday Warning</h4>
                                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                                    December spending is predicted to spike by 20% due to historical patterns.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h4 className="font-bold text-sm mb-4 text-zinc-500 uppercase tracking-widest">Year End Projection</h4>
                        <div className="text-4xl font-bold tracking-tight text-zinc-900">$14,250</div>
                        <p className="text-sm text-emerald-600 font-medium mt-2 flex items-center gap-1">
                            <TrendingUp size={14} />
                            +12% vs last year
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Forecast;