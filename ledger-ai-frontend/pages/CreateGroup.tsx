import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { Users, X, Plus } from 'lucide-react';
import { AppRoute } from '../types';

const CreateGroup: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [members, setMembers] = useState<string[]>(['']);

    const addMemberField = () => setMembers([...members, '']);
    const updateMember = (index: number, val: string) => {
        const newMembers = [...members];
        newMembers[index] = val;
        setMembers(newMembers);
    };
    const removeMember = (index: number) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Logic to save group would go here
        navigate(AppRoute.GROUPS);
    };

    return (
        <div className="max-w-xl mx-auto py-10">
            <h1 className="text-3xl font-bold text-zinc-900 mb-6">Create New Group</h1>
            <Card>
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
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Members</label>
                        <div className="space-y-3">
                            {members.map((email, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input 
                                        placeholder="friend@example.com" 
                                        value={email}
                                        onChange={(e) => updateMember(index, e.target.value)}
                                        className="flex-1"
                                    />
                                    {members.length > 1 && (
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
                        <Button type="submit" variant="primary" className="flex-1">
                            Create Group
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateGroup;