import React from 'react';
import { Card, Button, Input } from '../components/UI';
import { User, Mail, Lock, Moon, Shield, Bell } from 'lucide-react';

const Profile: React.FC = () => {
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
        </div>
    );
};

export default Profile;