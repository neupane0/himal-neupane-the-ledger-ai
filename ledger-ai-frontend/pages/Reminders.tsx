import React, { useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Bell, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { Reminder } from '../types';

const Reminders: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([
        { id: '1', title: 'Rent', amount: 1200, dueDate: '2023-11-01', paid: false },
        { id: '2', title: 'Internet Bill', amount: 65, dueDate: '2023-10-28', paid: false },
        { id: '3', title: 'Netflix', amount: 15, dueDate: '2023-10-25', paid: true },
    ]);

    const [isAdding, setIsAdding] = useState(false);
    const [newReminder, setNewReminder] = useState({ title: '', amount: '', date: '' });

    const togglePaid = (id: string) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, paid: !r.paid } : r));
    };

    const deleteReminder = (id: string) => {
        setReminders(reminders.filter(r => r.id !== id));
    };

    const addReminder = (e: React.FormEvent) => {
        e.preventDefault();
        const r: Reminder = {
            id: Date.now().toString(),
            title: newReminder.title,
            amount: parseFloat(newReminder.amount),
            dueDate: newReminder.date,
            paid: false
        };
        setReminders([...reminders, r]);
        setIsAdding(false);
        setNewReminder({ title: '', amount: '', date: '' });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Reminders</h1>
                    <p className="text-zinc-500 mt-1">Never miss a bill payment.</p>
                </div>
                <Button variant="primary" onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? 'Cancel' : 'Add Reminder'}
                </Button>
            </div>

            {isAdding && (
                <Card className="animate-fade-in border-black">
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
                        <div className="flex justify-end">
                            <Button type="submit" variant="primary">Save Reminder</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                {reminders.map((reminder) => {
                    const isOverdue = !reminder.paid && new Date(reminder.dueDate) < new Date();
                    
                    return (
                        <Card key={reminder.id} className={`flex items-center justify-between p-4 transition-all ${reminder.paid ? 'opacity-60 bg-zinc-50' : 'bg-white'}`}>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => togglePaid(reminder.id)}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${reminder.paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 hover:border-black'}`}
                                >
                                    {reminder.paid && <CheckCircle size={14} />}
                                </button>
                                <div>
                                    <h3 className={`font-bold ${reminder.paid ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{reminder.title}</h3>
                                    <div className="flex items-center gap-3 text-xs mt-1">
                                        <span className="font-medium text-zinc-600">${reminder.amount.toFixed(2)}</span>
                                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-zinc-400'}`}>
                                            <Clock size={12} />
                                            {isOverdue ? 'Overdue: ' : 'Due: '}{reminder.dueDate}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!reminder.paid && (
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Unpaid" />
                                )}
                                <button onClick={() => deleteReminder(reminder.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Reminders;