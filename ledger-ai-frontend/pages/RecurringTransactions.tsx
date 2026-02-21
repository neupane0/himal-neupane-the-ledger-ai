import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Input, Select } from '../components/UI';
import {
  Plus, Repeat, Trash2, Pause, Play, X, Calendar,
  DollarSign, Tag, FileText, Clock, Loader2,
} from 'lucide-react';
import { recurringTransactions } from '../services/api';
import { RecurringTransaction, RecurringTransactionCreateRequest } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const FREQUENCIES = Object.keys(FREQ_LABELS);

const humanDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const nextInLabel = (iso: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `in ${diffDays}d`;
  if (diffDays < 30) return `in ${Math.round(diffDays / 7)}w`;
  return `in ${Math.round(diffDays / 30)}mo`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RecurringTransactions: React.FC = () => {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<RecurringTransactionCreateRequest>({
    title: '',
    amount: 0,
    category: 'Uncategorized',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    notes: '',
  });

  // Fetch
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await recurringTransactions.getAll();
      setRules(res.data);
    } catch (err) {
      console.error('Failed to load recurring transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  // Stats
  const activeRules = useMemo(() => rules.filter((r) => r.is_active), [rules]);
  const monthlyEstimate = useMemo(() => {
    let total = 0;
    for (const r of activeRules) {
      const amt = parseFloat(r.amount);
      switch (r.frequency) {
        case 'daily': total += amt * 30; break;
        case 'weekly': total += amt * 4.33; break;
        case 'biweekly': total += amt * 2.17; break;
        case 'monthly': total += amt; break;
        case 'yearly': total += amt / 12; break;
      }
    }
    return total;
  }, [activeRules]);

  // Actions
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) return;
    setSaving(true);
    try {
      await recurringTransactions.create(form);
      setShowForm(false);
      setForm({
        title: '', amount: 0, category: 'Uncategorized', frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0], end_date: null, notes: '',
      });
      fetchRules();
    } catch (err) {
      alert('Failed to create recurring transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await recurringTransactions.toggleActive(id);
      setRules((prev) => prev.map((r) => (r.id === id ? res.data : r)));
    } catch {
      alert('Failed to toggle status.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this recurring transaction?')) return;
    try {
      await recurringTransactions.delete(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Failed to delete.');
    }
  };

  const categoryOptions = useMemo(() => ['Uncategorized', ...TRANSACTION_CATEGORIES], []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between page-enter stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Recurring</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Autopilot expenses that generate transactions for you.</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={15} strokeWidth={1.5} />
          Add Rule
        </Button>
      </div>

      {/* Summary Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 page-enter stagger-2">
        <Card noHover className="!p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Active rules</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">{activeRules.length}</p>
        </Card>
        <Card noHover className="!p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Monthly est.</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">
            ${monthlyEstimate.toFixed(2)}
          </p>
        </Card>
        <Card noHover className="!p-4 hidden sm:block">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total rules</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">{rules.length}</p>
        </Card>
      </div>

      {/* ── Modal-like Create Form ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md mx-4 !p-0 overflow-hidden animate-in" noHover onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100/80">
              <h2 className="text-base font-semibold text-zinc-800">New Recurring Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Title */}
              <div className="relative group">
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
                <div className="relative">
                  <FileText size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Netflix subscription"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-300 bg-zinc-50/40 border border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white focus:shadow-[0_0_15px_rgba(0,0,0,0.04)] outline-none transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Amount + Frequency row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Amount</label>
                  <div className="relative">
                    <DollarSign size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.amount || ''}
                      onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-300 bg-zinc-50/40 border border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white outline-none transition-all duration-200 tabular-nums"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Frequency</label>
                  <div className="relative group">
                    <Clock size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors pointer-events-none z-10" />
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border border-zinc-200/80 appearance-none cursor-pointer focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white outline-none transition-all duration-200"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Category</label>
                <div className="relative group">
                  <Tag size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors pointer-events-none" />
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border border-zinc-200/80 appearance-none cursor-pointer focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white outline-none transition-all duration-200"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start date + End date row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Start date</label>
                  <div className="relative">
                    <Calendar size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white outline-none transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                <div className="relative group">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">End date <span className="text-zinc-300">(opt.)</span></label>
                  <div className="relative">
                    <Calendar size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                    <input
                      type="date"
                      value={form.end_date || ''}
                      onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value || null }))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white outline-none transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Save */}
              <Button type="submit" isLoading={saving} className="w-full mt-2">
                {saving ? 'Creating…' : 'Create Rule'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Rules List ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-zinc-300" />
        </div>
      ) : rules.length === 0 ? (
        /* ── Empty State ────────────────────────────────────────── */
        <Card noHover className="text-center py-16 page-enter stagger-3">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/50 flex items-center justify-center">
            <Repeat size={24} strokeWidth={1.5} className="text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800">No recurring expenses yet</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs mx-auto">
            Set up autopilot for bills and subscriptions — we'll generate transactions automatically.
          </p>
          <Button size="sm" className="mt-5 mx-auto" onClick={() => setShowForm(true)}>
            <Plus size={15} strokeWidth={1.5} />
            Add your first rule
          </Button>
        </Card>
      ) : (
        <div className="space-y-3 page-enter stagger-3">
          {rules.map((rule) => (
            <Card key={rule.id} noHover className="!p-0">
              <div className="flex items-center gap-4 p-4 sm:p-5">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-inset ${
                  rule.is_active
                    ? 'bg-emerald-50/80 ring-emerald-100/50 text-emerald-600'
                    : 'bg-zinc-100/80 ring-zinc-200/50 text-zinc-400'
                }`}>
                  <Repeat size={18} strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${rule.is_active ? 'text-zinc-800' : 'text-zinc-400 line-through'}`}>
                      {rule.title}
                    </p>
                    <Badge type={rule.is_active ? 'success' : 'neutral'}>
                      {rule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span className="tabular-nums font-medium text-zinc-600">${parseFloat(rule.amount).toFixed(2)}</span>
                    <span>·</span>
                    <span>{FREQ_LABELS[rule.frequency] || rule.frequency}</span>
                    <span>·</span>
                    <span>{rule.category || 'Uncategorized'}</span>
                  </div>
                </div>

                {/* Next due */}
                <div className="hidden sm:block text-right">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Next</p>
                  <p className="text-sm font-medium text-zinc-700 tabular-nums mt-0.5">
                    {rule.is_active ? nextInLabel(rule.next_due_date) : '—'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.is_active
                        ? 'text-zinc-400 hover:text-amber-500 hover:bg-amber-50'
                        : 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50'
                    }`}
                    title={rule.is_active ? 'Pause' : 'Resume'}
                  >
                    {rule.is_active ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringTransactions;
