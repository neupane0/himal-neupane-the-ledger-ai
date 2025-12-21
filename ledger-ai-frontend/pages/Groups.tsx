import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/UI';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { AppRoute, Group } from '../types';

const Groups: React.FC = () => {
    const navigate = useNavigate();
    
    // Mock Groups Data
    const groups: Group[] = [
        { id: '1', name: 'Trip to Japan', members: 4, owe: 120, owed: 0 },
        { id: '2', name: 'Apartment 4B', members: 3, owe: 0, owed: 450 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Groups</h1>
                    <p className="text-zinc-500 mt-1">Manage shared expenses and split bills.</p>
                </div>
                <Button variant="primary" onClick={() => navigate(AppRoute.CREATE_GROUP)}>
                    <Plus size={18} />
                    New Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group) => (
                    <Card key={group.id} className="cursor-pointer group relative overflow-hidden transition-all hover:ring-2 hover:ring-black/5" onClick={() => navigate(`/groups/${group.id}`)}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={100} />
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{group.name}</h3>
                                <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                                    <Users size={14} /> {group.members} members
                                </p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between mt-8">
                            <div>
                                <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-1">Your Status</p>
                                {group.owe > 0 ? (
                                    <span className="text-red-600 font-bold text-lg">You owe ${group.owe}</span>
                                ) : (
                                    <span className="text-emerald-600 font-bold text-lg">You are owed ${group.owed}</span>
                                )}
                            </div>
                            <Button variant="ghost" className="hover:bg-zinc-100">
                                <ArrowRight size={20} />
                            </Button>
                        </div>
                    </Card>
                ))}
                
                {/* Create New Placeholder */}
                <button 
                    onClick={() => navigate(AppRoute.CREATE_GROUP)}
                    className="border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-8 text-zinc-400 hover:text-black hover:border-black transition-all bg-white hover:bg-zinc-50 h-full min-h-[200px]"
                >
                    <Plus size={32} />
                    <span className="font-medium mt-2">Create New Group</span>
                </button>
            </div>
        </div>
    );
};

export default Groups;