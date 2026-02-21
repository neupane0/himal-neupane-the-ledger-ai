import React, { useState, useEffect } from 'react';
import { Card, Badge } from '../components/UI';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar,
  Sparkles, Zap, RefreshCw, Activity, BarChart3, Shuffle,
  ChevronRight, Info,
} from 'lucide-react';
import { ai } from '../services/api';

// ─── Local interfaces (mirror the API types) ────────────────────────────

interface MonthlyData {
  month: string;
  actual: number | null;
  predicted: number;
  predicted_lr: number;
  predicted_ema?: number | null;
  predicted_mc?: number;
  confidence_lower?: number;
  confidence_upper?: number;
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

interface AlgorithmSummary {
  name: string;
  description: string;
  mae: number;
  weight: number;
  next_month: number;
  confidence_range?: string;
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
  algorithms: Record<string, AlgorithmSummary>;
  insights: ForecastInsights;
}

// ─── Colours ─────────────────────────────────────────────────────────────

const ALGO_COLORS: Record<string, string> = {
  linear_regression: '#18181b',       // zinc-900
  exponential_smoothing: '#6366f1',   // indigo-500
  monte_carlo: '#f59e0b',            // amber-500
  ensemble: '#10b981',               // emerald-500
};

const ALGO_ICONS: Record<string, React.FC<{size?: number; strokeWidth?: number; className?: string}>> = {
  linear_regression: TrendingUp,
  exponential_smoothing: Activity,
  monte_carlo: Shuffle,
};

// ─── Page ────────────────────────────────────────────────────────────────

const Forecast: React.FC = () => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBands, setShowBands] = useState(true);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ai.forecast();
      setData(response.data as unknown as ForecastData);
    } catch (err) {
      console.error('Failed to fetch forecast', err);
      setError('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForecast(); }, []);

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
          <p className="text-sm text-zinc-400 mt-1">Multi-algorithm financial projections.</p>
        </div>
        <Card className="h-[400px] flex items-center justify-center" noHover>
          <div className="flex items-center gap-3 text-zinc-400">
            <RefreshCw className="animate-spin" size={18} strokeWidth={1.5} />
            <span className="text-sm">Running 3 algorithms on your data…</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
          <p className="text-sm text-zinc-400 mt-1">Multi-algorithm financial projections.</p>
        </div>
        <Card className="h-[400px] flex items-center justify-center" noHover>
          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-4">{error || 'No data available'}</p>
            <button onClick={fetchForecast} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors">
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Prepare chart data ─────────────────────────────────────────────────
  const chartData = [
    ...data.monthly_data.map((d) => ({
      ...d,
      predicted_mc: null as number | null,
      confidence_lower: null as number | null,
      confidence_upper: null as number | null,
    })),
    ...data.predictions,
  ];

  const todayMonth = data.monthly_data.length > 0
    ? data.monthly_data[data.monthly_data.length - 1].label
    : null;

  const insights = data.insights;
  const TrendIcon = insights.trend === 'up' ? TrendingUp : (insights.trend === 'down' ? TrendingDown : Minus);
  const trendColor = insights.trend === 'up' ? 'text-red-500' : (insights.trend === 'down' ? 'text-emerald-500' : 'text-zinc-500');

  const algoEntries = Object.entries(data.algorithms || {}) as [string, AlgorithmSummary][];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between page-enter stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Forecast</h1>
          <p className="text-sm text-zinc-400 mt-1">Multi-algorithm financial projections & confidence bands.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBands(!showBands)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              showBands ? 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/60' : 'bg-zinc-100 text-zinc-500'
            }`}
          >
            {showBands ? 'Bands On' : 'Bands Off'}
          </button>
          <div className="bg-zinc-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-zinc-900/10">
            <Calendar size={13} strokeWidth={1.5} />
            Next 6 Months
          </div>
        </div>
      </div>

      {/* ── Algorithm Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 page-enter stagger-2">
        {algoEntries.map(([key, algo]) => {
          const Icon = ALGO_ICONS[key] || BarChart3;
          const color = ALGO_COLORS[key] || '#71717a';
          return (
            <Card key={key} noHover className="!p-4 relative overflow-hidden group">
              {/* weight bar */}
              <div
                className="absolute bottom-0 left-0 h-1 rounded-full transition-all duration-500"
                style={{ width: `${algo.weight}%`, backgroundColor: color }}
              />
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center ring-1 ring-inset"
                  style={{ backgroundColor: `${color}10`, color, borderColor: `${color}30` }}
                >
                  <Icon size={17} strokeWidth={1.5} />
                </div>
                <Badge type="neutral">{algo.weight}% weight</Badge>
              </div>
              <p className="text-sm font-semibold text-zinc-800">{algo.name}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{algo.description}</p>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-lg font-bold text-zinc-900 tabular-nums">${algo.next_month.toLocaleString()}</span>
                <span className="text-[11px] text-zinc-400">next month</span>
              </div>
              {algo.confidence_range && (
                <p className="text-[11px] text-amber-500 font-medium mt-1">Range: {algo.confidence_range}</p>
              )}
              <p className="text-[11px] text-zinc-400 mt-1">MAE: ${algo.mae.toLocaleString()}</p>
            </Card>
          );
        })}
      </div>

      {/* ── Main Chart ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 page-enter stagger-3">
        <Card className="lg:col-span-2 !p-5" noHover>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-zinc-800">Projected Spending Trend</h3>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ALGO_COLORS.linear_regression }} /> LR</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ALGO_COLORS.exponential_smoothing }} /> EMA</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ALGO_COLORS.monte_carlo }} /> MC</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ALGO_COLORS.ensemble }} /> Ensemble</span>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBands" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />

                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px -5px rgba(0,0,0,0.12)', fontSize: 12 }}
                  formatter={(value: number | null, name: string) => {
                    if (value == null) return ['-', name];
                    const labels: Record<string, string> = {
                      actual: 'Actual',
                      predicted: 'Ensemble',
                      predicted_lr: 'Linear Regr.',
                      predicted_ema: 'Exp. Smooth.',
                      predicted_mc: 'Monte Carlo',
                      confidence_upper: 'P90 Upper',
                      confidence_lower: 'P10 Lower',
                    };
                    return [`$${value.toLocaleString()}`, labels[name] || name];
                  }}
                  cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                />

                {todayMonth && (
                  <ReferenceLine
                    x={todayMonth}
                    stroke="#18181b"
                    strokeDasharray="3 3"
                    label={{ position: 'top', value: 'Now', fill: '#18181b', fontSize: 11, fontWeight: 600 }}
                  />
                )}

                {/* Monte Carlo confidence band */}
                {showBands && (
                  <>
                    <Area type="monotone" dataKey="confidence_upper" stroke="none" fill="url(#gradBands)" activeDot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="confidence_lower" stroke="none" fill="#ffffff" activeDot={false} connectNulls={false} />
                  </>
                )}

                {/* Actual spending */}
                <Area type="monotone" dataKey="actual" stroke="#18181b" strokeWidth={2.5} fill="url(#gradActual)" activeDot={{ r: 5, strokeWidth: 0, fill: '#18181b' }} connectNulls={false} />

                {/* Linear Regression line */}
                <Area type="monotone" dataKey="predicted_lr" stroke={ALGO_COLORS.linear_regression} strokeWidth={1.5} strokeDasharray="6 4" fill="transparent" dot={false} activeDot={{ r: 4, fill: ALGO_COLORS.linear_regression }} connectNulls={false} />

                {/* Exponential Smoothing line */}
                <Area type="monotone" dataKey="predicted_ema" stroke={ALGO_COLORS.exponential_smoothing} strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" dot={false} activeDot={{ r: 4, fill: ALGO_COLORS.exponential_smoothing }} connectNulls={false} />

                {/* Monte Carlo median */}
                <Area type="monotone" dataKey="predicted_mc" stroke={ALGO_COLORS.monte_carlo} strokeWidth={1.5} strokeDasharray="3 3" fill="transparent" dot={false} activeDot={{ r: 4, fill: ALGO_COLORS.monte_carlo }} connectNulls={false} />

                {/* Ensemble (main prediction) */}
                <Area type="monotone" dataKey="predicted" stroke={ALGO_COLORS.ensemble} strokeWidth={2.5} fill="transparent" activeDot={{ r: 5, strokeWidth: 0, fill: ALGO_COLORS.ensemble }} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── Right Panel ─────────────────────────────────────────────── */}
        <div className="space-y-4 flex flex-col">
          {/* AI Recommendation */}
          <Card ai className="flex-1 relative overflow-hidden" noHover>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} strokeWidth={1.5} className="text-indigo-500" />
              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">AI Recommendation</span>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">{insights.recommendation}</p>

            {insights.monthly_income > 0 && (
              <div className="mt-5 p-3.5 rounded-xl bg-white/60 ring-1 ring-inset ring-zinc-200/50 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${insights.predicted_savings >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <Zap className={`w-4 h-4 ${insights.predicted_savings >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Predicted Savings</p>
                  <p className={`text-sm font-bold tabular-nums ${insights.predicted_savings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    ${Math.abs(insights.predicted_savings).toLocaleString()}/mo
                    {insights.predicted_savings < 0 && ' deficit'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* 6-Mo Projection */}
          <Card noHover className="!p-4">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">6-Month Projection</p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">${insights.total_predicted_spending.toLocaleString()}</p>
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${trendColor}`}>
              <TrendIcon size={13} />
              {insights.trend === 'stable' ? 'Stable' : `${insights.trend === 'up' ? '+' : ''}${insights.trend_percentage}%`} trend
            </p>
          </Card>

          {/* Fastest Growing */}
          {insights.top_growing_category && (
            <Card noHover className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200/50 flex items-center justify-center">
                  <AlertTriangle size={16} strokeWidth={1.5} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-800">{insights.top_growing_category}</p>
                  <p className="text-[11px] text-zinc-400">Growing +{insights.top_growing_percentage}%/mo</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Category Section ──────────────────────────────────────────── */}
      {data.category_breakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 page-enter stagger-4">
          <Card noHover>
            <h3 className="text-sm font-semibold text-zinc-800 mb-5">Category Predictions</h3>
            <div className="space-y-3">
              {data.category_breakdown.slice(0, 6).map((cat) => {
                const CatTrendIcon = cat.trend === 'up' ? TrendingUp : (cat.trend === 'down' ? TrendingDown : Minus);
                const catColor = cat.trend === 'up' ? 'text-red-500' : (cat.trend === 'down' ? 'text-emerald-500' : 'text-zinc-400');
                return (
                  <div key={cat.category} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/60 ring-1 ring-inset ring-zinc-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-200/60 flex items-center justify-center text-xs font-bold text-zinc-600">
                        {cat.category[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-800">{cat.category}</p>
                        <p className="text-[11px] text-zinc-400">Avg ${cat.average_monthly}/mo</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900 tabular-nums">${cat.predicted_next}</p>
                      <p className={`text-[11px] flex items-center justify-end gap-1 ${catColor}`}>
                        <CatTrendIcon size={11} />
                        {cat.trend_percentage > 0 ? '+' : ''}{cat.trend_percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card noHover>
            <h3 className="text-sm font-semibold text-zinc-800 mb-5">Spending by Category</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.category_breakdown.slice(0, 6)} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px -5px rgba(0,0,0,0.12)', fontSize: 12 }}
                    formatter={(v: number) => [`$${v}`, 'Predicted']}
                  />
                  <Bar dataKey="predicted_next" radius={[0, 8, 8, 0]}>
                    {data.category_breakdown.slice(0, 6).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#18181b' : '#d4d4d8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ── Algorithm Legend (bottom) ──────────────────────────────────── */}
      <Card noHover className="!p-4 page-enter stagger-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} strokeWidth={1.5} className="text-zinc-400" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">How it works</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px] text-zinc-500 leading-relaxed">
          <div>
            <span className="font-semibold text-zinc-700">Linear Regression</span> fits a straight-line trend with seasonal adjustment. Best for stable, predictable spending.
          </div>
          <div>
            <span className="font-semibold text-zinc-700">Exponential Smoothing</span> (Holt's method) adapts to recent level and trend shifts. Reacts faster to changes.
          </div>
          <div>
            <span className="font-semibold text-zinc-700">Monte Carlo</span> runs 2,000 random simulations. The amber band shows the P10–P90 range of likely outcomes.
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 mt-3">
          The <span className="font-semibold text-emerald-600">green ensemble line</span> is a weighted average of all three—algorithms with lower error get more weight.
        </p>
      </Card>
    </div>
  );
};

export default Forecast;
