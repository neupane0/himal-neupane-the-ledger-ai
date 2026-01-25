import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { AppRoute } from '../types';
import { auth } from '../services/api';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await auth.login({ username, password });
            navigate(AppRoute.DASHBOARD);
        } catch (err: any) {
            console.error("Login failed", err);
            setError('Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-xl">L</span>
                    </div>
                    <h2 className="text-2xl font-bold">Welcome back</h2>
                    <p className="text-zinc-500">Enter your details to access your ledger.</p>
                </div>
                {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}
                <form className="space-y-4" onSubmit={handleLogin}>
                    <Input
                        label="Username or email"
                        type="text"
                        placeholder="johndoe or name@example.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button type="button" className="text-sm text-zinc-500 hover:text-black hover:underline">Forgot password?</button>
                    </div>
                    <Button type="submit" className="w-full">Sign In</Button>
                </form>
                <div className="mt-6 text-center text-sm text-zinc-500">
                    Don't have an account? <span onClick={() => navigate(AppRoute.REGISTER)} className="text-black font-semibold cursor-pointer hover:underline">Create one</span>
                </div>
            </Card>
        </div>
    );
};

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await auth.register({ username, email, password });
            navigate(AppRoute.DASHBOARD);
        } catch (err: any) {
            console.error("Registration failed", err);
            setError('Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-xl">L</span>
                    </div>
                    <h2 className="text-2xl font-bold">Create Account</h2>
                    <p className="text-zinc-500">Start tracking your finances intelligently.</p>
                </div>
                {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}
                <form className="space-y-4" onSubmit={handleRegister}>
                    <Input
                        label="Username"
                        type="text"
                        placeholder="johndoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Input
                        label="Email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" className="w-full">Create Account</Button>
                </form>
                <div className="mt-6 text-center text-sm text-zinc-500">
                    Already have an account? <span onClick={() => navigate(AppRoute.LOGIN)} className="text-black font-semibold cursor-pointer hover:underline">Log in</span>
                </div>
            </Card>
        </div>
    );
};
