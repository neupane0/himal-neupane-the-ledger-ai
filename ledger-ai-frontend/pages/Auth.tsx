import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/UI';
import { AppRoute } from '../types';
import { auth, passwordReset } from '../services/api';
import { Shield, KeyRound } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Forgot Password (3-step OTP flow)
// ──────────────────────────────────────────────────────────────────────────────

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = React.useState<'email' | 'otp' | 'reset' | 'done'>('email');
    const [email, setEmail] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await passwordReset.forgotPassword(email.trim());
            setStep('otp');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await passwordReset.verifyOtp(email.trim(), otp.trim());
            setStep('reset');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await passwordReset.resetPassword(email.trim(), otp.trim(), newPassword);
            setStep('done');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="text-white" size={22} />
                    </div>
                    <h2 className="text-2xl font-bold">Reset Password</h2>
                    <p className="text-zinc-500 mt-1">
                        {step === 'email' && 'Enter your email to receive a one-time code.'}
                        {step === 'otp' && `Enter the 6-digit code sent to ${email}.`}
                        {step === 'reset' && 'Choose a new password.'}
                        {step === 'done' && 'Your password has been reset!'}
                    </p>
                </div>

                {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}

                {step === 'email' && (
                    <form className="space-y-4" onSubmit={handleSendOtp}>
                        <Input
                            label="Email address"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Sending…' : 'Send Reset Code'}
                        </Button>
                    </form>
                )}

                {step === 'otp' && (
                    <form className="space-y-4" onSubmit={handleVerifyOtp}>
                        <Input
                            label="One-Time Code"
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            autoFocus
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Verifying…' : 'Verify Code'}
                        </Button>
                        <button
                            type="button"
                            className="w-full text-sm text-zinc-500 hover:text-black hover:underline"
                            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                        >
                            Change email
                        </button>
                    </form>
                )}

                {step === 'reset' && (
                    <form className="space-y-4" onSubmit={handleResetPassword}>
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            autoFocus
                        />
                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Repeat your password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Resetting…' : 'Set New Password'}
                        </Button>
                    </form>
                )}

                {step === 'done' && (
                    <div className="text-center space-y-4">
                        <p className="text-emerald-600 font-semibold">Password reset successfully!</p>
                        <Button className="w-full" onClick={() => navigate(AppRoute.LOGIN)}>
                            Go to Login
                        </Button>
                    </div>
                )}

                {step !== 'done' && (
                    <div className="mt-6 text-center text-sm text-zinc-500">
                        Remembered it?{' '}
                        <span onClick={() => navigate(AppRoute.LOGIN)} className="text-black font-semibold cursor-pointer hover:underline">
                            Log in
                        </span>
                    </div>
                )}
            </Card>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────────────────────────────────────

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [needs2fa, setNeeds2fa] = React.useState(false);
    const [otpCode, setOtpCode] = React.useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await auth.login({ username, password });
            if (res.data.requires_2fa) {
                setNeeds2fa(true);
                return;
            }
            navigate(AppRoute.DASHBOARD);
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err?.response?.data?.error || 'Login failed. Please check your credentials.');
        }
    };

    const handleVerify2fa = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await auth.verify2fa(otpCode);
            navigate(AppRoute.DASHBOARD);
        } catch (err: any) {
            console.error("2FA verification failed", err);
            setError(err?.response?.data?.error || 'Invalid 2FA code.');
        }
    };

    if (needs2fa) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
                <Card className="w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Shield className="text-white" size={22} />
                        </div>
                        <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
                        <p className="text-zinc-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
                    </div>
                    {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}
                    <form className="space-y-4" onSubmit={handleVerify2fa}>
                        <Input
                            label="Verification Code"
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            autoFocus
                        />
                        <Button type="submit" className="w-full">Verify</Button>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            className="text-sm text-zinc-500 hover:text-black hover:underline"
                            onClick={() => { setNeeds2fa(false); setOtpCode(''); setError(''); }}
                        >
                            Back to login
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

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
                        <button
                            type="button"
                            className="text-sm text-zinc-500 hover:text-black hover:underline"
                            onClick={() => navigate(AppRoute.FORGOT_PASSWORD)}
                        >
                            Forgot password?
                        </button>
                    </div>
                    <Button type="submit" className="w-full">Sign In</Button>
                </form>
                <div className="mt-6 text-center text-sm text-zinc-500">
                    Don't have an account?{' '}
                    <span onClick={() => navigate(AppRoute.REGISTER)} className="text-black font-semibold cursor-pointer hover:underline">
                        Create one
                    </span>
                </div>
            </Card>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Register
// ──────────────────────────────────────────────────────────────────────────────

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
            setError(err?.response?.data?.error || 'Registration failed. Please try again.');
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
                    Already have an account?{' '}
                    <span onClick={() => navigate(AppRoute.LOGIN)} className="text-black font-semibold cursor-pointer hover:underline">
                        Log in
                    </span>
                </div>
            </Card>
        </div>
    );
};
