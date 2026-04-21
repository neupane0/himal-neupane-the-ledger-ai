import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import {
    ArrowLeft, Plus, Trash2, UserPlus,
    Receipt, ChevronDown, ChevronUp, ArrowRight,
    Camera, Keyboard, Loader2, ScanLine,
    Smartphone, Building2, Mail, CheckCircle2, Clock,
} from 'lucide-react';
import { AppRoute, Group, GroupExpense, GroupExpenseCreateRequest, GroupSettlement, GroupConfirmedPayment } from '../types';
import { groups as groupsApi, auth, receipts } from '../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`;

function Avatar({ name }: { name: string }) {
    return (
        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
            {name[0].toUpperCase()}
        </div>
    );
}

// ── Expense card with expandable split ───────────────────────────────────────

const ExpenseRow: React.FC<{
    expense: GroupExpense;
    currentUser: string;
    onDelete: (id: number) => void;
}> = ({
    expense,
    currentUser,
    onDelete,
}) => {
    const [open, setOpen] = useState(false);
    const total = parseFloat(expense.amount);

    return (
        <div className="border border-zinc-100 rounded-xl overflow-hidden">
            {/* Main row */}
            <div className="flex items-center justify-between p-4 bg-white hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Receipt size={16} className="text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{expense.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Paid by{' '}
                            <span className={expense.paid_by_username === currentUser ? 'text-indigo-600 font-medium' : 'font-medium text-zinc-600'}>
                                {expense.paid_by_username === currentUser ? 'you' : expense.paid_by_username}
                            </span>
                            {' · '}{new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                        <p className="font-bold text-zinc-900">{fmt(total)}</p>
                        <p className="text-xs text-zinc-400">{fmt(expense.share_per_member)}/person</p>
                    </div>
                    <button
                        onClick={() => setOpen(v => !v)}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
                        title="Show split"
                    >
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                        title="Delete expense"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Expandable split breakdown */}
            {open && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Split breakdown</p>
                    <div className="space-y-1.5">
                        {expense.split_details.map(d => (
                            <div key={d.username} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Avatar name={d.username} />
                                    <span className={d.username === currentUser ? 'font-semibold text-zinc-900' : 'text-zinc-700'}>
                                        {d.username === currentUser ? 'You' : d.username}
                                    </span>
                                    {d.paid && (
                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                            PAID
                                        </span>
                                    )}
                                </div>
                                <span className={`font-semibold tabular-nums ${d.paid ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {d.paid ? `+${fmt(parseFloat(expense.amount) - d.share)}` : `-${fmt(d.share)}`}
                                </span>
                            </div>
                        ))}
                    </div>
                    {expense.notes && (
                        <p className="mt-2 text-xs text-zinc-400 italic">"{expense.notes}"</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Add expense form ──────────────────────────────────────────────────────────

function AddExpenseForm({
    memberCount,
    members,
    onSave,
    onCancel,
}: {
    memberCount: number;
    members: { username: string }[];
    onSave: (data: GroupExpenseCreateRequest) => Promise<void>;
    onCancel: () => void;
}) {
    const [mode, setMode] = useState<'choose' | 'manual' | 'receipt'>('choose');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const share = amount && memberCount > 0
        ? (parseFloat(amount) / memberCount).toFixed(2)
        : null;

    // ── Receipt scan ────────────────────────────────────────────────────────
    const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setReceiptPreview(URL.createObjectURL(file));
        setScanError('');
        setScanning(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await receipts.upload(fd);
            const d = res.data;
            if (d.title)  setTitle(d.title);
            if (d.amount) setAmount(String(d.amount));
            if (d.date)   setDate(d.date);
            setMode('manual'); // show form with pre-filled values
        } catch {
            setScanError('Could not read the receipt. Fill in the details manually.');
            setMode('manual');
        } finally {
            setScanning(false);
        }
    };

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        const parsed = parseFloat(amount);
        if (!title.trim()) { setSubmitError('Please enter a description.'); return; }
        if (!parsed || parsed <= 0) { setSubmitError('Please enter a valid amount.'); return; }
        setLoading(true);
        try {
            await onSave({ title: title.trim(), amount: parsed, date, notes });
        } catch (err: any) {
            const detail = err?.response?.data;
            setSubmitError(detail ? JSON.stringify(detail) : 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Mode: choose ────────────────────────────────────────────────────────
    if (mode === 'choose') {
        return (
            <Card className="border-2 border-indigo-100">
                <h3 className="font-bold text-lg mb-1">Add Expense</h3>
                <p className="text-sm text-zinc-500 mb-5">How do you want to add this bill?</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setMode('manual')}
                        className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                    >
                        <Keyboard size={28} className="text-zinc-400 group-hover:text-indigo-500" />
                        <span className="font-semibold text-sm text-zinc-700 group-hover:text-indigo-700">Type manually</span>
                        <span className="text-xs text-zinc-400">Enter details by hand</span>
                    </button>
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                    >
                        <Camera size={28} className="text-zinc-400 group-hover:text-emerald-500" />
                        <span className="font-semibold text-sm text-zinc-700 group-hover:text-emerald-700">Scan receipt</span>
                        <span className="text-xs text-zinc-400">Auto-fill from photo</span>
                    </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptFile} />
                <button onClick={onCancel} className="mt-4 w-full text-sm text-zinc-400 hover:text-zinc-600">Cancel</button>
            </Card>
        );
    }

    // ── Mode: scanning ──────────────────────────────────────────────────────
    if (scanning) {
        return (
            <Card className="border-2 border-emerald-100">
                <div className="flex flex-col items-center py-8 gap-4">
                    {receiptPreview && (
                        <img src={receiptPreview} alt="Receipt" className="w-32 h-40 object-cover rounded-xl border border-zinc-200 shadow" />
                    )}
                    <Loader2 size={28} className="animate-spin text-emerald-500" />
                    <div className="text-center">
                        <p className="font-semibold text-zinc-800">Scanning receipt…</p>
                        <p className="text-xs text-zinc-400 mt-1">Reading amount, date and description</p>
                    </div>
                </div>
            </Card>
        );
    }

    // ── Mode: manual (with optional receipt preview) ─────────────────────────
    return (
        <Card className="border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                    {receiptPreview ? 'Confirm Receipt Details' : 'Add Expense'}
                </h3>
                {!receiptPreview && (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                        <ScanLine size={13} /> Scan receipt instead
                    </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptFile} />
            </div>

            {scanError && (
                <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {scanError}
                </div>
            )}

            {receiptPreview && (
                <div className="flex gap-4 mb-5 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <img src={receiptPreview} alt="Receipt" className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                            <ScanLine size={12} /> Scanned — review and confirm
                        </p>
                        <p className="text-xs text-zinc-500">The fields below were filled from your receipt. Edit anything that looks wrong.</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="What was the bill for?"
                    placeholder="e.g. Dinner at Sushi Place"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    autoFocus={!receiptPreview}
                />
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Input
                            label="Total amount ($)"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                        {share && (
                            <p className="mt-1 text-xs text-indigo-600 font-medium">
                                = ${share}/person · split among {memberCount}
                            </p>
                        )}
                    </div>
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                    />
                </div>
                <Input
                    label="Notes (optional)"
                    placeholder="Any extra details…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />

                {/* Split preview */}
                {amount && parseFloat(amount) > 0 && memberCount > 0 && (
                    <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Split preview</p>
                        <div className="space-y-1.5">
                            {members.map(m => (
                                <div key={m.username} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                            {m.username[0].toUpperCase()}
                                        </div>
                                        <span className="text-zinc-700">{m.username}</span>
                                    </div>
                                    <span className="font-semibold text-zinc-800 tabular-nums">
                                        ${(parseFloat(amount) / memberCount).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {submitError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {submitError}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                        {loading ? 'Saving…' : 'Add Expense'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

// ── Settled payment card ─────────────────────────────────────────────────────

const SettledCard: React.FC<{ payment: GroupConfirmedPayment; currentUser: string }> = ({ payment, currentUser }) => {
    const [showInfo, setShowInfo] = useState(false);

    const fromLabel = payment.from === currentUser ? 'You' : payment.from;
    const toLabel   = payment.to   === currentUser ? 'You' : payment.to;

    const confirmedDate = payment.confirmed_at
        ? new Date(payment.confirmed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <Card className="border border-emerald-200 bg-emerald-50/40">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">Settled</span>
                </div>
                <button
                    onClick={() => setShowInfo(v => !v)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 bg-white rounded-lg px-2.5 py-1 transition-colors"
                >
                    {showInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Info
                </button>
            </div>

            {/* Summary line */}
            <div className="flex items-center gap-2 mt-3">
                <Avatar name={payment.from} />
                <span className={`text-sm font-medium ${payment.from === currentUser ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {fromLabel}
                </span>
                <ArrowRight size={13} className="text-zinc-400" />
                <Avatar name={payment.to} />
                <span className={`text-sm font-medium ${payment.to === currentUser ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {toLabel}
                </span>
                <span className="ml-auto font-bold text-zinc-900 tabular-nums">{fmt(payment.amount)}</span>
            </div>

            {/* Expandable info */}
            {showInfo && (
                <div className="mt-4 pt-4 border-t border-emerald-200 space-y-1.5 text-sm text-zinc-600">
                    <div className="flex justify-between">
                        <span className="text-zinc-400">Paid by</span>
                        <span className="font-medium">{fromLabel}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-400">Received by</span>
                        <span className="font-medium">{toLabel}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-400">Amount</span>
                        <span className="font-medium">{fmt(payment.amount)}</span>
                    </div>
                    {confirmedDate && (
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Confirmed on</span>
                            <span className="font-medium">{confirmedDate}</span>
                        </div>
                    )}
                    {payment.note && (
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Note</span>
                            <span className="font-medium italic">"{payment.note}"</span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}


// ── Settlement card ───────────────────────────────────────────────────────────

const SettlementCard: React.FC<{
    settlement: GroupSettlement;
    currentUser: string;
    groupId: number;
    onRefresh: () => void;
}> = ({ settlement: s, currentUser, groupId, onRefresh }) => {
    const iAmDebtor   = s.from === currentUser;
    const iAmCreditor = s.to === currentUser;
    const info = s.to_payment_info;
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRecordPayment = async () => {
        setLoading(true); setMsg('');
        try {
            await groupsApi.recordPayment(groupId, s.to, s.amount, note);
            setMsg('Payment recorded! Waiting for confirmation from ' + s.to + '.');
            onRefresh();
        } catch (err: any) {
            setMsg(err?.response?.data?.error || 'Failed to record payment.');
        } finally { setLoading(false); }
    };

    const handleConfirm = async () => {
        if (!s.pending_payment) return;
        setLoading(true); setMsg('');
        try {
            await groupsApi.confirmPayment(groupId, s.pending_payment.id);
            setMsg('Payment confirmed! Balance updated.');
            onRefresh();
        } catch (err: any) {
            setMsg(err?.response?.data?.error || 'Failed to confirm.');
        } finally { setLoading(false); }
    };

    const handleRequestInfo = async () => {
        setLoading(true); setMsg('');
        try {
            await groupsApi.requestPaymentInfo(groupId, s.to);
            setMsg(`Payment info request sent to ${s.to}.`);
        } catch (err: any) {
            setMsg(err?.response?.data?.error || 'Failed to send request.');
        } finally { setLoading(false); }
    };

    return (
        <Card className={`border ${iAmDebtor ? 'border-red-100 bg-red-50/30' : iAmCreditor ? 'border-emerald-100 bg-emerald-50/30' : 'border-zinc-100'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Settle Up</p>

            {/* Who owes whom */}
            <div className="flex items-center gap-2 mb-4">
                <Avatar name={s.from} />
                <span className={`font-semibold text-sm ${iAmDebtor ? 'text-red-600' : 'text-zinc-800'}`}>
                    {s.from === currentUser ? 'You' : s.from}
                </span>
                <ArrowRight size={14} className="text-zinc-400" />
                <Avatar name={s.to} />
                <span className={`font-semibold text-sm ${iAmCreditor ? 'text-emerald-600' : 'text-zinc-800'}`}>
                    {s.to === currentUser ? 'You' : s.to}
                </span>
                <span className="ml-auto font-bold text-lg tabular-nums text-zinc-900">{fmt(s.amount)}</span>
            </div>

            {/* Payee payment info (shown to debtor) */}
            {iAmDebtor && (
                <>
                    {info?.has_info ? (
                        <div className="space-y-2 mb-4">
                            {info.esewa_id && (
                                <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3 py-2.5">
                                    <Smartphone size={15} className="text-purple-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">eSewa ID</p>
                                        <p className="font-semibold text-zinc-900 text-sm">{info.esewa_id}</p>
                                    </div>
                                </div>
                            )}
                            {info.bank_account_number && (
                                <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3 py-2.5">
                                    <Building2 size={15} className="text-blue-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                                            {info.bank_name || 'Bank'} Account
                                        </p>
                                        <p className="font-semibold text-zinc-900 text-sm">{info.bank_account_number}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <strong>{s.to}</strong> hasn't added payment info yet.
                            <button
                                onClick={handleRequestInfo}
                                disabled={loading}
                                className="ml-2 underline font-semibold hover:text-amber-900"
                            >
                                <Mail size={12} className="inline mr-1" />Request via email
                            </button>
                        </div>
                    )}

                    {/* Pending payment status */}
                    {s.pending_payment ? (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-sm text-indigo-700 mb-3">
                            <Clock size={14} className="flex-shrink-0" />
                            <span>Payment of {fmt(s.pending_payment.amount)} recorded — waiting for {s.to} to confirm.</span>
                        </div>
                    ) : info?.has_info ? (
                        <>
                            <Input
                                placeholder="Add a note (optional)"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="mb-2"
                            />
                            <Button variant="primary" className="w-full" disabled={loading} onClick={handleRecordPayment}>
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                I've Paid {fmt(s.amount)} to {s.to}
                            </Button>
                        </>
                    ) : null}
                </>
            )}

            {/* Creditor sees pending payment to confirm */}
            {iAmCreditor && s.pending_payment && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-sm text-indigo-700">
                        <Clock size={14} className="flex-shrink-0" />
                        <span><strong>{s.from}</strong> says they paid {fmt(s.pending_payment.amount)}.</span>
                    </div>
                    <Button variant="primary" className="w-full" disabled={loading} onClick={handleConfirm}>
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Confirm — I Received the Payment
                    </Button>
                </div>
            )}

            {msg && <p className={`mt-2 text-xs font-medium ${msg.includes('Failed') ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</p>}
        </Card>
    );
}


// ── Main page ─────────────────────────────────────────────────────────────────

const GroupDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteMsg, setInviteMsg] = useState('');
    const [currentUser, setCurrentUser] = useState('');

    const fetchGroup = () => {
        if (!id) return;
        groupsApi.get(Number(id))
            .then(res => setGroup(res.data))
            .catch(() => setError('Failed to load group.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchGroup();
        auth.getCurrentUser()
            .then(res => setCurrentUser(res.data.user?.username || ''))
            .catch(() => {});
    }, [id]);

    const handleAddExpense = async (data: GroupExpenseCreateRequest) => {
        if (!id) return;
        try {
            await groupsApi.addExpense(Number(id), data);
            setShowExpenseForm(false);
            fetchGroup();
        } catch (err: any) {
            const msg = err?.response?.data
                ? JSON.stringify(err.response.data)
                : 'Failed to add expense.';
            setError(msg);
        }
    };

    const handleDeleteExpense = async (expenseId: number) => {
        if (!id) return;
        try {
            await groupsApi.deleteExpense(Number(id), expenseId);
            fetchGroup();
        } catch {
            setError('Failed to delete expense.');
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !inviteEmail) return;
        try {
            const res = await groupsApi.inviteMember(Number(id), inviteEmail.trim());
            setInviteMsg(res.data.message);
            setInviteEmail('');
            fetchGroup();
        } catch (err: any) {
            setInviteMsg(err?.response?.data?.error || 'Failed to invite.');
        }
    };

    if (loading) return <div className="text-zinc-400 text-center py-16">Loading…</div>;
    if (!group) return <div className="text-red-500 text-center py-16">{error || 'Group not found.'}</div>;

    const expenses = group.expenses ?? [];
    const settlements = group.settlements ?? [];
    const members = group.members ?? [];
    const balance = group.your_balance ?? 0;
    const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    return (
        <div className="space-y-6">
            {/* Back */}
            <Button variant="ghost" onClick={() => navigate(AppRoute.GROUPS)} className="pl-0 gap-1 text-zinc-500 hover:text-black hover:bg-transparent">
                <ArrowLeft size={16} /> Back to Groups
            </Button>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">{group.name}</h1>
                    <p className="text-zinc-500 mt-1">{group.member_count} member{group.member_count !== 1 ? 's' : ''} · {expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
                </div>
                <Button variant="primary" onClick={() => setShowExpenseForm(v => !v)}>
                    <Plus size={16} /> Add Expense
                </Button>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            {/* Add expense form */}
            {showExpenseForm && (
                <AddExpenseForm
                    memberCount={group.member_count}
                    members={members}
                    onSave={handleAddExpense}
                    onCancel={() => setShowExpenseForm(false)}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Expenses list */}
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-bold text-zinc-800">Expenses</h2>
                    {expenses.length === 0 ? (
                        <Card className="text-center py-10 text-zinc-400">
                            <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No expenses yet. Add the first one!</p>
                        </Card>
                    ) : (
                        expenses.map(ex => (
                            <ExpenseRow
                                key={ex.id}
                                expense={ex}
                                currentUser={currentUser}
                                onDelete={handleDeleteExpense}
                            />
                        ))
                    )}
                </div>

                {/* Right: Summary sidebar */}
                <div className="space-y-4">
                    {/* Your balance */}
                    <Card>
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Your Balance</p>
                        {balance > 0.005 ? (
                            <>
                                <p className="text-2xl font-bold text-red-500">-{fmt(balance)}</p>
                                <p className="text-xs text-zinc-400 mt-1">You owe the group</p>
                            </>
                        ) : balance < -0.005 ? (
                            <>
                                <p className="text-2xl font-bold text-emerald-600">+{fmt(balance)}</p>
                                <p className="text-xs text-zinc-400 mt-1">The group owes you</p>
                            </>
                        ) : expenses.length === 0 ? (
                            <p className="text-lg font-medium text-zinc-400">No expenses yet</p>
                        ) : (
                            <p className="text-2xl font-bold text-emerald-600">All settled up!</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between text-sm">
                            <span className="text-zinc-500">Total group spend</span>
                            <span className="font-bold text-zinc-900">{fmt(totalSpent)}</span>
                        </div>
                    </Card>

                    {/* Who owes whom — Settle Up */}
                    {settlements.length > 0 && settlements.map((s, i) => (
                        <SettlementCard
                            key={i}
                            settlement={s}
                            currentUser={currentUser}
                            groupId={Number(id)}
                            onRefresh={fetchGroup}
                        />
                    ))}

                    {/* Settled payments */}
                    {(group.confirmed_payments ?? []).map(p => (
                        <SettledCard key={p.id} payment={p} currentUser={currentUser} />
                    ))}

                    {/* Members */}
                    <Card>
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Members</p>
                        <div className="space-y-2 mb-3">
                            {members.map(m => (
                                <div key={m.id} className="flex items-center gap-2 text-sm">
                                    <Avatar name={m.username} />
                                    <div>
                                        <p className="font-medium text-zinc-800">
                                            {m.username === currentUser ? `${m.username} (you)` : m.username}
                                        </p>
                                        <p className="text-xs text-zinc-400">{m.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full text-xs" onClick={() => setShowInvite(v => !v)}>
                            <UserPlus size={14} /> Invite Member
                        </Button>
                        {showInvite && (
                            <form onSubmit={handleInvite} className="mt-3 space-y-2">
                                <Input
                                    placeholder="friend@example.com"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    required
                                />
                                <Button type="submit" variant="primary" className="w-full text-xs">Add to Group</Button>
                                {inviteMsg && <p className="text-xs text-zinc-500 mt-1">{inviteMsg}</p>}
                            </form>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default GroupDetails;
