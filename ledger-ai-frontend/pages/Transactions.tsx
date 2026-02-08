import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, AnimatedText } from '../components/UI';
import {
  Search, Download, Upload, Trash2, Pencil, X,
  ArrowLeft, ArrowRight,
  Utensils, ShoppingBag, Car, Home, Zap, Film,
  GraduationCap, Plane, Heart, TrendingUp,
  MoreHorizontal, Calendar, SlidersHorizontal,
  ArrowDownLeft, ArrowUpRight, Receipt,
} from 'lucide-react';
import { Transaction } from '../types';
import { transactions as apiTransactions } from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

/** Map category names to Lucide icon components */
const CATEGORY_ICON_MAP: Record<string, React.FC<{ size?: number; strokeWidth?: number; className?: string }>> = {
  'Food & Dining':    Utensils,
  Food:               Utensils,
  Groceries:          ShoppingBag,
  Shopping:           ShoppingBag,
  Transportation:     Car,
  Transport:          Car,
  'Bills & Utilities': Zap,
  Utilities:          Zap,
  Entertainment:      Film,
  Healthcare:         Heart,
  Health:             Heart,
  Travel:             Plane,
  Education:          GraduationCap,
  Income:             TrendingUp,
  Housing:            Home,
};

/** Soft pastel palette per category for the avatar circle */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Food & Dining':     { bg: 'bg-orange-50',  text: 'text-orange-500' },
  Food:                { bg: 'bg-orange-50',  text: 'text-orange-500' },
  Groceries:           { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  Shopping:            { bg: 'bg-pink-50',    text: 'text-pink-500' },
  Transportation:      { bg: 'bg-sky-50',     text: 'text-sky-500' },
  Transport:           { bg: 'bg-sky-50',     text: 'text-sky-500' },
  'Bills & Utilities': { bg: 'bg-amber-50',   text: 'text-amber-500' },
  Utilities:           { bg: 'bg-amber-50',   text: 'text-amber-500' },
  Entertainment:       { bg: 'bg-violet-50',  text: 'text-violet-500' },
  Healthcare:          { bg: 'bg-rose-50',    text: 'text-rose-500' },
  Health:              { bg: 'bg-rose-50',    text: 'text-rose-500' },
  Travel:              { bg: 'bg-cyan-50',    text: 'text-cyan-500' },
  Education:           { bg: 'bg-indigo-50',  text: 'text-indigo-500' },
  Income:              { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Housing:             { bg: 'bg-slate-100',  text: 'text-slate-500' },
};

const DEFAULT_COLOR = { bg: 'bg-zinc-100', text: 'text-zinc-500' };

const ALL_CATEGORIES = [
  'All', 'Food', 'Food & Dining', 'Groceries', 'Transport', 'Transportation',
  'Shopping', 'Utilities', 'Bills & Utilities', 'Entertainment',
  'Health', 'Healthcare', 'Travel', 'Education', 'Income', 'Housing', 'Other',
];

type QuickFilter = 'all' | 'expenses' | 'income' | 'high';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-friendly relative date: "Today", "Yesterday", "Feb 3", "Dec 28, 2025" */
function humanDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function parseAmount(tx: Transaction): number {
  const v = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
  return Number.isFinite(v) ? v : 0;
}

function isIncome(tx: Transaction): boolean {
  return String(tx.category || '').toLowerCase() === 'income';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Category avatar — icon if available, otherwise first-letter initial */
const CategoryAvatar: React.FC<{ category: string }> = ({ category }) => {
  const IconComp = CATEGORY_ICON_MAP[category];
  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  return (
    <div className={`w-9 h-9 rounded-xl ${color.bg} ring-1 ring-inset ring-black/[0.04] flex items-center justify-center flex-shrink-0`}>
      {IconComp ? (
        <IconComp size={16} strokeWidth={1.5} className={color.text} />
      ) : (
        <span className={`text-sm font-semibold ${color.text}`}>
          {(category || '?')[0].toUpperCase()}
        </span>
      )}
    </div>
  );
};

/** Three-dot action menu per row */
const RowActions: React.FC<{ tx: Transaction; onDelete: (id: number) => void }> = ({ tx, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100/80 transition-colors"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-zinc-200/60 shadow-xl shadow-zinc-900/10 ring-1 ring-inset ring-zinc-100/50 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
            onClick={() => { setOpen(false); /* edit logic */ }}
          >
            <Pencil size={14} strokeWidth={1.5} /> Edit
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => { setOpen(false); onDelete(tx.id); }}
          >
            <Trash2 size={14} strokeWidth={1.5} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiTransactions.getAll();
        setTransactions(res.data);
      } catch (e) {
        console.error('Failed to fetch transactions', e);
      }
    };
    fetch();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await apiTransactions.export();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await apiTransactions.import(fd);
      const res = await apiTransactions.getAll();
      setTransactions(res.data);
    } catch (e) {
      console.error('Import failed', e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiTransactions.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = transactions;

    // category
    if (categoryFilter !== 'All') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    // quick filters
    if (quickFilter === 'expenses') {
      list = list.filter((t) => !isIncome(t));
    } else if (quickFilter === 'income') {
      list = list.filter((t) => isIncome(t));
    } else if (quickFilter === 'high') {
      list = list.filter((t) => Math.abs(parseAmount(t)) >= 100);
    }

    // search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [transactions, categoryFilter, quickFilter, searchTerm]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [searchTerm, categoryFilter, quickFilter]);

  // ── Summary numbers ────────────────────────────────────────────────────
  const totalIncome = useMemo(
    () => filtered.filter(isIncome).reduce((s, t) => s + Math.abs(parseAmount(t)), 0),
    [filtered],
  );
  const totalExpenses = useMemo(
    () => filtered.filter((t) => !isIncome(t)).reduce((s, t) => s + Math.abs(parseAmount(t)), 0),
    [filtered],
  );

  // ── Unique categories from data (for the dropdown) ────────────────────
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return ['All', ...Array.from(cats).sort()];
  }, [transactions]);

  // ── Quick filter pills ─────────────────────────────────────────────────
  const pills: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'income', label: 'Income' },
    { key: 'high', label: '$100+' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            <AnimatedText text="Transactions" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1 page-enter stagger-1">
            View and manage your financial history.
          </p>
        </div>
        <div className="flex gap-2 page-enter stagger-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} strokeWidth={1.5} />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} strokeWidth={1.5} />
            Export
          </Button>
        </div>
      </div>

      {/* ── Summary Strips ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 page-enter stagger-2">
        {/* Total Transactions */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-zinc-200/60 ring-1 ring-inset ring-zinc-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-2 rounded-xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/50">
            <Receipt size={16} strokeWidth={1.5} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Transactions</p>
            <p className="text-lg font-bold text-zinc-900 tabular-nums">{filtered.length}</p>
          </div>
        </div>
        {/* Total Income */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-zinc-200/60 ring-1 ring-inset ring-zinc-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-2 rounded-xl bg-emerald-50/80 ring-1 ring-inset ring-emerald-100/60">
            <ArrowDownLeft size={16} strokeWidth={1.5} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Income</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">+${totalIncome.toFixed(2)}</p>
          </div>
        </div>
        {/* Total Expenses */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-zinc-200/60 ring-1 ring-inset ring-zinc-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-2 rounded-xl bg-red-50/80 ring-1 ring-inset ring-red-100/60">
            <ArrowUpRight size={16} strokeWidth={1.5} className="text-red-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Expenses</p>
            <p className="text-lg font-bold text-zinc-800 tabular-nums">-${totalExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ── Smart Filter Bar ────────────────────────────────────────────── */}
      <Card className="!p-0 overflow-hidden page-enter stagger-3">
        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-zinc-100/80">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
            <input
              type="text"
              placeholder="Search by name, category…"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200/80 bg-zinc-50/40 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 focus:bg-white transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <div className="relative">
            <SlidersHorizontal size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <select
              className="appearance-none pl-9 pr-8 py-2 rounded-xl border border-zinc-200/80 bg-zinc-50/40 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 focus:bg-white cursor-pointer transition-all duration-200"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Quick-filter pills */}
          <div className="flex items-center gap-1.5 ml-auto">
            {pills.map((p) => (
              <button
                key={p.key}
                onClick={() => setQuickFilter(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  quickFilter === p.key
                    ? 'bg-zinc-900 text-white shadow-sm shadow-zinc-900/20'
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead>
              <tr className="text-[11px] text-zinc-400 uppercase tracking-wider">
                <th className="py-3 pl-5 font-semibold">Transaction</th>
                <th className="py-3 font-semibold">Category</th>
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 font-semibold text-right">Amount</th>
                <th className="py-3 pr-5 font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((tx) => {
                const amt = parseAmount(tx);
                const income = isIncome(tx);
                return (
                  <tr
                    key={tx.id}
                    className="group border-t border-zinc-100/60 hover:bg-zinc-50/50 transition-colors duration-150"
                  >
                    {/* Transaction — avatar + title + source */}
                    <td className="py-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <CategoryAvatar category={tx.category} />
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-800 text-sm truncate capitalize">{tx.title}</p>
                          {tx.source && (
                            <p className="text-[11px] text-zinc-400 mt-0.5">via {tx.source}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category badge */}
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100/60 text-zinc-500 text-[11px] font-semibold ring-1 ring-inset ring-zinc-200/40">
                        {tx.category}
                      </span>
                    </td>

                    {/* Date — human-friendly */}
                    <td className="py-3.5 text-zinc-400 text-sm tabular-nums">
                      {humanDate(tx.date)}
                    </td>

                    {/* Amount — correct color logic */}
                    <td className={`py-3.5 text-right font-semibold tabular-nums text-sm pr-2 ${
                      income ? 'text-emerald-600' : 'text-zinc-800'
                    }`}>
                      {income ? '+' : '-'}${Math.abs(amt).toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-5 text-right">
                      <RowActions tx={tx} onDelete={handleDelete} />
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/40 flex items-center justify-center">
                        <Receipt size={20} strokeWidth={1.5} className="text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-400 mt-2">No transactions found</p>
                      <p className="text-xs text-zinc-300">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100/80">
          <p className="text-xs text-zinc-400 tabular-nums">
            Showing <span className="font-semibold text-zinc-600">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-semibold text-zinc-600">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={15} strokeWidth={1.5} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((item, i) =>
                item === '...' ? (
                  <span key={`dot-${i}`} className="px-1 text-zinc-300 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                      item === safePage
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Transactions;
