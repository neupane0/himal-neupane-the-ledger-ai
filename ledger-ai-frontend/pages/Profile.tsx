import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { User, Mail, Lock, Moon, Shield, Bell } from 'lucide-react';
import { incomeSources } from '../services/api';
import { IncomeSource } from '../types';

const Profile: React.FC = () => {
    const [sources, setSources] = useState<IncomeSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [monthlyAmount, setMonthlyAmount] = useState<number>(0);

    const fetchSources = async () => {
        try {
            const res = await incomeSources.getAll();
            setSources(res.data || []);
        } catch (e) {
            console.error('Failed to load income sources', e);
        }
    };

    useEffect(() => {
        fetchSources();
    }, []);

    const handleAdd = async () => {
        if (!name.trim() || !monthlyAmount || monthlyAmount <= 0) return;
        setIsLoading(true);
        try {
            await incomeSources.create({ name: name.trim(), monthly_amount: monthlyAmount, active: true });
            setName('');
            setMonthlyAmount(0);
            await fetchSources();
        } catch (e) {
            console.error('Failed to add income source', e);
            alert('Failed to add income source');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this income source?')) return;
        try {
            await incomeSources.delete(id);
            await fetchSources();
        } catch (e) {
            console.error('Failed to delete income source', e);
            alert('Failed to delete income source');
        }
    };

    const totalMonthlyIncome = sources
        .filter(s => s.active)
        .reduce((acc, s) => acc + (Number(s.monthly_amount) || 0), 0);

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-zinc-900">Account Settings</h1>

            <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-zinc-200 flex items-center justify-center text-4xl font-bold text-zinc-400">
                    JD
                </div>
                <div>
                    <Button variant="outline" className="text-sm">Change Avatar</Button>
                </div>
            </div>

            <Card title="Personal Information">
                <div className="space-y-4">
                    <Input label="Username" defaultValue="johndoe" icon={<User size={16} />} />
                    <Input label="Email Address" defaultValue="john@example.com" icon={<Mail size={16} />} />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button variant="primary">Save Changes</Button>
                </div>
            </Card>

            <Card title="Security">
                <div className="space-y-4">
                    <Input label="Current Password" type="password" placeholder="••••••••" />
                    <Input label="New Password" type="password" placeholder="••••••••" />
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button variant="secondary">Update Password</Button>
                </div>
            </Card>

            <Card title="Preferences">
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 text-zinc-700">
                            <Moon size={20} />
                            <span>Dark Mode</span>
                        </div>
                        <div className="w-11 h-6 bg-zinc-200 rounded-full relative cursor-pointer">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 text-zinc-700">
                            <Bell size={20} />
                            <span>Email Notifications</span>
                        </div>
                        <div className="w-11 h-6 bg-black rounded-full relative cursor-pointer">
                             <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                     <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 text-zinc-700">
                            <Shield size={20} />
                            <span>Two-Factor Authentication</span>
                        </div>
                         <div className="w-11 h-6 bg-zinc-200 rounded-full relative cursor-pointer">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Income Sources">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">Monthly income (active sources)</p>
                            <p className="text-2xl font-bold text-zinc-900">${totalMonthlyIncome.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Source Name"
                            type="text"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            placeholder="e.g. Salary"
                        />
                        <Input
                            label="Monthly Amount"
                            type="number"
                            step="0.01"
                            value={monthlyAmount}
                            onChange={(e: any) => setMonthlyAmount(parseFloat(e.target.value || '0'))}
                            placeholder="0.00"
                        />
                        <div className="flex items-end">
                            <Button variant="primary" className="w-full" onClick={handleAdd} isLoading={isLoading}>
                                Add
                            </Button>
                        </div>
                    </div>

                    {sources.length === 0 ? (
                        <p className="text-sm text-zinc-500">No income sources added yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-xs tracking-wider">
                                        <th className="pb-3 font-semibold">Name</th>
                                        <th className="pb-3 font-semibold">Monthly</th>
                                        <th className="pb-3 font-semibold">Status</th>
                                        <th className="pb-3 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {sources.map((s) => (
                                        <tr key={s.id}>
                                            <td className="py-4 font-medium text-zinc-900">{s.name}</td>
                                            <td className="py-4 text-zinc-700">${Number(s.monthly_amount).toFixed(2)}</td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                                                    {s.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <Button variant="ghost" onClick={() => handleDelete(s.id)}>
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Profile;