import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { X, Plus } from 'lucide-react';
import { AppRoute } from '../types';
import { groups as groupsApi } from '../services/api';

const CreateGroup: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [memberEmails, setMemberEmails] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const addMemberField = () => setMemberEmails([...memberEmails, '']);
    const updateMember = (index: number, val: string) => {
        const updated = [...memberEmails];
        updated[index] = val;
        setMemberEmails(updated);
    };
    const removeMember = (index: number) => {
        setMemberEmails(memberEmails.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await groupsApi.create(name.trim());
            const groupId = res.data.id;

            // Invite each non-empty email
            const invites = memberEmails.filter(em => em.trim());
            await Promise.allSettled(invites.map(email => groupsApi.inviteMember(groupId, email.trim())));

            navigate(AppRoute.GROUPS);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to create group.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-10">
            <h1 className="text-3xl font-bold text-zinc-900 mb-6">Create New Group</h1>
            <Card>
                {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Input
                            label="Group Name"
                            placeholder="e.g. Summer Roadtrip"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Invite Members (by email)
                        </label>
                        <div className="space-y-3">
                            {memberEmails.map((email, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="friend@example.com"
                                        value={email}
                                        onChange={(e) => updateMember(index, e.target.value)}
                                        className="flex-1"
                                    />
                                    {memberEmails.length > 1 && (
                                        <Button type="button" variant="ghost" onClick={() => removeMember(index)}>
                                            <X size={18} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addMemberField}
                            className="mt-3 text-sm font-medium text-black flex items-center gap-1 hover:underline"
                        >
                            <Plus size={14} /> Add another person
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(AppRoute.GROUPS)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                            {loading ? 'Creating…' : 'Create Group'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateGroup;
