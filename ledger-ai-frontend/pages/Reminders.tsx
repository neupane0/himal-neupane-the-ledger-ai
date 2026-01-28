import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Bell, CheckCircle, Clock, Plus, Trash2, Mail, RefreshCw } from 'lucide-react';
import { Reminder } from '../types';
import { reminders as remindersApi } from '../services/api';

const Reminders: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

    const [isAdding, setIsAdding] = useState(false);
    const [newReminder, setNewReminder] = useState({ 
        title: '', 
        amount: '', 
        date: '',
        frequency: 'once',
        email_reminder: true,
        reminder_days_before: '1'
    });
    const [saving, setSaving] = useState(false);

    const fetchReminders = async () => {
        setLoading(true);
        try {
            const statusFilter = filter === 'all' ? undefined : filter;
            const response = await remindersApi.getAll(statusFilter as any);
            setReminders(response.data);
        } catch (error) {
            console.error('Failed to fetch reminders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReminders();
    }, [filter]);

    const togglePaid = async (id: number) => {
        try {
            await remindersApi.togglePaid(id);
            await fetchReminders();
        } catch (error) {
            console.error('Failed to toggle paid status', error);
        }
    };

    const deleteReminder = async (id: number) => {
        if (!confirm('Are you sure you want to delete this reminder?')) return;
        try {
            await remindersApi.delete(id);
            await fetchReminders();
        } catch (error) {
            console.error('Failed to delete reminder', error);
        }
    };

    const addReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await remindersApi.create({
                title: newReminder.title,
                amount: parseFloat(newReminder.amount),
                due_date: newReminder.date,
                frequency: newReminder.frequency,
                email_reminder: newReminder.email_reminder,
                reminder_days_before: parseInt(newReminder.reminder_days_before) || 1,
            });
            await fetchReminders();
            setIsAdding(false);
            setNewReminder({ 
                title: '', 
                amount: '', 
                date: '',
                frequency: 'once',
                email_reminder: true,
                reminder_days_before: '1'
            });
        } catch (error) {
            console.error('Failed to add reminder', error);
            alert('Failed to add reminder');
        } finally {
            setSaving(false);
        }
    };

    const sendTestEmail = async () => {
        try {
            await remindersApi.sendTestEmail();
            alert('Test email sent! Check your inbox (or console in dev mode).');
        } catch (error) {
            console.error('Failed to send test email', error);
            alert('Failed to send test email. Check email configuration.');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const pendingCount = reminders.filter(r => !r.is_paid).length;
    const overdueCount = reminders.filter(r => r.is_overdue).length;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Reminders</h1>
                    <p className="text-zinc-500 mt-1">Never miss a bill payment.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={sendTestEmail} title="Send test email">
                        <Mail size={16} />
                    </Button>
                    <Button variant="primary" onClick={() => setIsAdding(!isAdding)}>
                        {isAdding ? 'Cancel' : <><Plus size={16} /> Add Reminder</>}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    All ({reminders.length})
                </button>
                <button 
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                    Pending ({pendingCount})
                </button>
                <button 
                    onClick={() => setFilter('overdue')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'overdue' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                    Overdue ({overdueCount})
                </button>
                <button 
                    onClick={() => setFilter('paid')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                    Paid
                </button>
            </div>

            {isAdding && (
                <Card className="border-black">
                    <form onSubmit={addReminder} className="space-y-4">
                        <Input 
                            label="Title" 
                            placeholder="e.g. Credit Card Bill" 
                            value={newReminder.title} 
                            onChange={e => setNewReminder({...newReminder, title: e.target.value})} 
                            required 
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <Input 
                                label="Amount" 
                                type="number" 
                                placeholder="0.00" 
                                value={newReminder.amount} 
                                onChange={e => setNewReminder({...newReminder, amount: e.target.value})} 
                                required 
                            />
                             <Input 
                                label="Due Date" 
                                type="date" 
                                value={newReminder.date} 
                                onChange={e => setNewReminder({...newReminder, date: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Frequency</label>
                                <select
                                    value={newReminder.frequency}
                                    onChange={e => setNewReminder({...newReminder, frequency: e.target.value})}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/10"
                                >
                                    <option value="once">One-time</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <Input 
                                label="Remind days before" 
                                type="number" 
                                min="0"
                                max="30"
                                value={newReminder.reminder_days_before} 
                                onChange={e => setNewReminder({...newReminder, reminder_days_before: e.target.value})} 
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="email_reminder"
                                checked={newReminder.email_reminder}
                                onChange={e => setNewReminder({...newReminder, email_reminder: e.target.checked})}
                                className="w-4 h-4"
                            />
                            <label htmlFor="email_reminder" className="text-sm text-zinc-700">
                                Send email reminder before due date
                            </label>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" isLoading={saving}>
                                Save Reminder
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {loading ? (
                <Card className="p-8 text-center">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    <p className="text-zinc-500">Loading reminders...</p>
                </Card>
            ) : reminders.length === 0 ? (
                <Card className="p-8 text-center">
                    <Bell className="mx-auto mb-4 text-zinc-300" size={48} />
                    <p className="text-zinc-500 mb-4">No reminders yet</p>
                    <Button variant="outline" onClick={() => setIsAdding(true)}>
                        <Plus size={16} />
                        Create your first reminder
                    </Button>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reminders.map((reminder) => (
                        <Card 
                            key={reminder.id} 
                            className={`flex items-center justify-between p-4 ${reminder.is_paid ? 'opacity-60 bg-zinc-50' : 'bg-white'}`}
                        >
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => togglePaid(reminder.id)}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${reminder.is_paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 hover:border-black'}`}
                                >
                                    {reminder.is_paid && <CheckCircle size={14} />}
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold ${reminder.is_paid ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                                            {reminder.title}
                                        </h3>
                                        {reminder.email_reminder && (
                                            <Mail size={12} className="text-zinc-400" title="Email reminder enabled" />
                                        )}
                                        {reminder.frequency !== 'once' && (
                                            <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">
                                                {reminder.frequency}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs mt-1">
                                        <span className="font-medium text-zinc-600">
                                            ${parseFloat(String(reminder.amount)).toFixed(2)}
                                        </span>
                                        <span className={`flex items-center gap-1 ${reminder.is_overdue ? 'text-red-600 font-bold' : 'text-zinc-400'}`}>
                                            <Clock size={12} />
                                            {reminder.is_overdue ? 'Overdue: ' : 'Due: '}{formatDate(reminder.due_date)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!reminder.is_paid && reminder.is_overdue && (
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Overdue" />
                                )}
                                <button 
                                    onClick={() => deleteReminder(reminder.id)} 
                                    className="p-2 text-zinc-300 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reminders;