import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, AnimatedText, StatNumber } from '../components/UI';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight, Wallet, CreditCard, Sparkles,
  ShoppingBag, Utensils, Car, Home, Zap, MoreHorizontal,
} from 'lucide-react';
import { ai, incomeSources, transactions } from '../services/api';
import { AppRoute } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Food: Utensils,
  Shopping: ShoppingBag,
  Transport: Car,
  Housing: Home,
  Utilities: Zap,
};

const CHART_COLORS = [
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
];

/** Custom tooltip for the area chart */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-xl border border-zinc-200/60 shadow-xl shadow-zinc-900/10 px-4 py-3">
      <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 tabular-nums">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState('Loading AI insights...');
  const [txData, setTxData] = useState<any[]>([]);
  const [netThisMonth, setNetThisMonth] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [spendingTrend, setSpendingTrend] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txResponse, incomeResponse] = await Promise.all([
          transactions.getAll(),
          incomeSources.getAll(),
        ]);

        const txs = txResponse.data;
        const sources = incomeResponse.data as any[];
        setTxData(txs);

        const isIncomeTx = (tx: any) => String(tx.category || '').toLowerCase() === 'income';
        const amountOf = (tx: any) => {
          const val = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
          return Number.isFinite(val) ? Math.abs(val) : 0;
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const inThisMonth = (tx: any) => {
          const d = new Date(tx.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        };

        const monthlyIncomeFromTx = txs
          .filter((tx: any) => inThisMonth(tx) && isIncomeTx(tx))
          .reduce((acc: number, tx: any) => acc + amountOf(tx), 0);

        const monthlyIncomeFromSources = (sources || [])
          .filter((s: any) => s && s.active)
          .reduce((acc: number, s: any) => {
            const val = typeof s.monthly_amount === 'number' ? s.monthly_amount : parseFloat(s.monthly_amount);
            return acc + (Number.isFinite(val) ? val : 0);
          }, 0);

        const expenses = txs
          .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
          .reduce((acc: number, tx: any) => acc + amountOf(tx), 0);

        const totalMonthlyIncome = monthlyIncomeFromTx + monthlyIncomeFromSources;
        setMonthlyIncome(totalMonthlyIncome);
        setMonthlyExpenses(expenses);
        setNetThisMonth(totalMonthlyIncome - expenses);

        // Spending Trend (daily expenses, current month)
        const trendMap = new Map<string, number>();
        txs
          .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
          .forEach((tx: any) => {
            const key = String(tx.date);
            trendMap.set(key, (trendMap.get(key) || 0) + amountOf(tx));
          });
        const trend = Array.from(trendMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, amount]) => ({
            name: new Date(name).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount,
          }));
        setSpendingTrend(trend);

        // Category Data (expenses only)
        const catMap = new Map<string, number>();
        txs
          .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
          .forEach((tx: any) => {
            const cat = tx.category || 'Uncategorized';
            catMap.set(cat, (catMap.get(cat) || 0) + amountOf(tx));
          });
        const catData = Array.from(catMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        setCategoryData(catData);

        // AI Insights
        try {
          const rawTrend = Array.from(trendMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, amount]) => ({ name, amount }));
          const resp = await ai.forecastInsights(rawTrend);
          setInsight(resp?.data?.insight || 'Unable to generate insights at this time.');
        } catch {
          setInsight('Unable to generate insights at this time.');
        }
      } catch (error) {
        console.error('Failed to fetch transactions', error);
        setInsight('Unable to load data.');
      }
    };

    fetchData();
  }, []);

  const formatDate = useCallback(
    (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    [],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            <AnimatedText text="Dashboard" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1 page-enter stagger-1">
            Welcome back. Here's your financial overview.
          </p>
        </div>
        <div className="page-enter stagger-2">
          <Button variant="primary" size="md" onClick={() => navigate(AppRoute.ASSISTANT)}>
            <Sparkles size={15} strokeWidth={1.5} />
            Ask AI Assistant
          </Button>
        </div>
      </div>

      {/* ─────────────── Bento Top Row ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Net This Month */}
        <div className="lg:col-span-3 page-enter stagger-1">
          <Card className="h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Net This Month</p>
                <h3 className="text-3xl font-bold mt-2 tracking-tight text-zinc-900">
                  <StatNumber value={netThisMonth} prefix="$" />
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/50">
                <Wallet size={18} strokeWidth={1.5} className="text-zinc-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50/60 w-fit px-2.5 py-1 rounded-lg ring-1 ring-inset ring-emerald-100/60">
              <ArrowUpRight size={13} strokeWidth={2} />
              <span className="font-semibold">+2.5% vs last month</span>
            </div>
          </Card>
        </div>

        {/* Monthly Expenses */}
        <div className="lg:col-span-3 page-enter stagger-2">
          <Card className="h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monthly Expenses</p>
                <h3 className="text-3xl font-bold mt-2 tracking-tight text-zinc-900">
                  <StatNumber value={monthlyExpenses} prefix="$" />
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/50">
                <CreditCard size={18} strokeWidth={1.5} className="text-zinc-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Income</span>
              <span className="text-xs font-semibold text-zinc-700 tabular-nums">${monthlyIncome.toFixed(2)}</span>
            </div>
          </Card>
        </div>

        {/* AI Insight Card — "magical" glass */}
        <div className="md:col-span-2 lg:col-span-6 page-enter stagger-3">
          <Card
            ai
            noHover
            className="h-full flex flex-col justify-center relative overflow-hidden group min-h-[160px]"
          >
            {/* Shimmer background orbs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl group-hover:bg-indigo-400/15 transition-all duration-1000" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-violet-400/10 rounded-full blur-3xl group-hover:bg-violet-400/15 transition-all duration-1000" />
            <div className="absolute top-3 right-4 opacity-[0.06] group-hover:opacity-[0.09] transition-opacity duration-1000">
              <Sparkles size={100} strokeWidth={1} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                  <Sparkles size={11} strokeWidth={2} className="text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                  AI Insight
                </span>
              </div>
              <p className="text-[15px] font-medium leading-relaxed text-zinc-700">
                "{insight}"
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────── Charts Row ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Spending Trend */}
        <div className="lg:col-span-8 page-enter stagger-4">
          <Card title="Spending Trend" className="h-full">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e700" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <RechartsTooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: '#d4d4d8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientSpend)"
                    animationDuration={1400}
                    animationEasing="ease-out"
                    dot={false}
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Expenses by Category — donut */}
        <div className="lg:col-span-4 page-enter stagger-5">
          <Card title="By Category" className="h-full">
            <div className="h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    cornerRadius={8}
                    stroke="none"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      padding: '8px 14px',
                    }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-zinc-900 tabular-nums">${monthlyExpenses.toFixed(0)}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-[0.15em] font-semibold mt-0.5">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 justify-center">
              {categoryData.slice(0, 5).map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-[11px] font-medium text-zinc-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────── Recent Transactions ─────────────── */}
      <div className="page-enter stagger-5" style={{ animationDelay: '600ms' }}>
        <Card title="Recent Transactions" subtitle="Last 5 entries this month">
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-sm min-w-[540px]">
              <thead>
                <tr className="text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="pb-3 pl-6 font-semibold">Transaction</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right pr-6">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txData.slice(0, 5).map((tx, i) => {
                  const IconComp = CATEGORY_ICONS[tx.category] || MoreHorizontal;
                  const amt = parseFloat(tx.amount);
                  const isIncome = String(tx.category || '').toLowerCase() === 'income';
                  return (
                    <tr
                      key={i}
                      className="group hover:bg-zinc-50/60 transition-colors duration-200 border-t border-zinc-100/60"
                    >
                      {/* Title with category avatar */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/40 flex items-center justify-center flex-shrink-0 group-hover:ring-zinc-300/60 transition-all">
                            <IconComp size={15} strokeWidth={1.5} className="text-zinc-500" />
                          </div>
                          <span className="font-medium text-zinc-800 text-sm">{tx.title}</span>
                        </div>
                      </td>
                      {/* Category badge */}
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100/60 text-zinc-500 text-[11px] font-semibold ring-1 ring-inset ring-zinc-200/40">
                          {tx.category}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="py-4 text-zinc-400 text-sm tabular-nums">{formatDate(tx.date)}</td>
                      {/* Amount */}
                      <td className={`py-4 pr-6 text-right font-semibold tabular-nums text-sm ${isIncome ? 'text-emerald-600' : 'text-zinc-800'}`}>
                        {isIncome ? '+' : '-'}${Math.abs(amt).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {txData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zinc-400 text-sm">
                      No transactions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
