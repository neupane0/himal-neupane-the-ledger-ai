import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { User, Mail, Lock, Shield, CheckCircle, XCircle, Copy, Loader2 } from 'lucide-react';
import { incomeSources, profile as profileApi } from '../services/api';
import { IncomeSource, UserProfile } from '../types';

type TwoFAStep = 'idle' | 'loading' | 'scan' | 'verify' | 'disable';

const Profile: React.FC = () => {
    // ── Profile data ──────────────────────────────────────────────
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileMsg, setProfileMsg] = useState('');

    // ── Password ──────────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [pwMsg, setPwMsg] = useState('');
    const [pwError, setPwError] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    // ── 2FA ───────────────────────────────────────────────────────
    const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('idle');
    const [qrCode, setQrCode] = useState('');
    const [totpSecret, setTotpSecret] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [twoFAMsg, setTwoFAMsg] = useState('');
    const [twoFAError, setTwoFAError] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    // ── Income Sources ────────────────────────────────────────────
    const [sources, setSources] = useState<IncomeSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [monthlyAmount, setMonthlyAmount] = useState<number>(0);

    // ── Fetch on mount ────────────────────────────────────────────

    useEffect(() => {
        fetchProfile();
        fetchSources();
    }, []);

    const fetchProfile = async () => {
        setProfileLoading(true);
        try {
            const res = await profileApi.get();
            const p = res.data;
            setProfileData(p);
            setUsername(p.username);
            setEmail(p.email);
            setFirstName(p.first_name || '');
            setLastName(p.last_name || '');
            setIs2FAEnabled(p.is_2fa_enabled);
        } catch (e) {
            console.error('Failed to load profile', e);
        } finally {
            setProfileLoading(false);
        }
    };

    const fetchSources = async () => {
        try {
            const res = await incomeSources.getAll();
            setSources(res.data || []);
        } catch (e) {
            console.error('Failed to load income sources', e);
        }
    };

    // ── Profile save ──────────────────────────────────────────────

    const handleSaveProfile = async () => {
        setProfileMsg('');
        try {
            const res = await profileApi.update({ username, email, first_name: firstName, last_name: lastName });
            setProfileData(res.data);
            setProfileMsg('Profile updated.');
            setTimeout(() => setProfileMsg(''), 3000);
        } catch (e: any) {
            setProfileMsg(e?.response?.data?.username?.[0] || e?.response?.data?.email?.[0] || 'Failed to update.');
        }
    };

    // ── Password change ───────────────────────────────────────────

    const handleChangePassword = async () => {
        setPwMsg(''); setPwError('');
        if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
        setPwLoading(true);
        try {
            await profileApi.changePassword({ current_password: currentPassword, new_password: newPassword });
            setPwMsg('Password updated successfully.');
            setCurrentPassword(''); setNewPassword('');
            setTimeout(() => setPwMsg(''), 3000);
        } catch (e: any) {
            setPwError(e?.response?.data?.error || 'Failed to change password.');
        } finally {
            setPwLoading(false);
        }
    };

    // ── 2FA setup ─────────────────────────────────────────────────

    const handleStart2FASetup = async () => {
        setTwoFAStep('loading'); setTwoFAMsg(''); setTwoFAError('');
        try {
            const res = await profileApi.setup2fa();
            setQrCode(res.data.qr_code);
            setTotpSecret(res.data.secret);
            setTwoFAStep('scan');
        } catch (e: any) {
            setTwoFAError('Failed to start 2FA setup.');
            setTwoFAStep('idle');
        }
    };

    const handleVerify2FA = async () => {
        setTwoFAMsg(''); setTwoFAError('');
        try {
            await profileApi.verify2fa(otpCode);
            setIs2FAEnabled(true);
            setTwoFAMsg('2FA enabled successfully!');
            setTwoFAStep('idle');
            setOtpCode('');
            setTimeout(() => setTwoFAMsg(''), 4000);
        } catch (e: any) {
            setTwoFAError(e?.response?.data?.error || 'Invalid code.');
        }
    };

    const handleDisable2FA = async () => {
        setTwoFAMsg(''); setTwoFAError('');
        try {
            await profileApi.disable2fa(otpCode);
            setIs2FAEnabled(false);
            setTwoFAMsg('2FA disabled.');
            setTwoFAStep('idle');
            setOtpCode('');
            setTimeout(() => setTwoFAMsg(''), 4000);
        } catch (e: any) {
            setTwoFAError(e?.response?.data?.error || 'Invalid code.');
        }
    };

    // ── Income source handlers ────────────────────────────────────

    const handleAdd = async () => {
        if (!name.trim() || !monthlyAmount || monthlyAmount <= 0) return;
        setIsLoading(true);
        try {
            await incomeSources.create({ name: name.trim(), monthly_amount: monthlyAmount, active: true });
            setName(''); setMonthlyAmount(0);
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

    // ── Computed ──────────────────────────────────────────────────

    const initials = profileData
        ? (profileData.first_name && profileData.last_name
            ? `${profileData.first_name[0]}${profileData.last_name[0]}`
            : profileData.username.slice(0, 2)).toUpperCase()
        : '..';

    const memberSince = profileData?.date_joined
        ? new Date(profileData.date_joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';

    // ── Render ────────────────────────────────────────────────────

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            <h1 className="text-3xl font-bold text-zinc-900">Account Settings</h1>

            {/* Avatar + name */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center text-3xl font-bold text-white tracking-wide shadow-lg shadow-zinc-900/20">
                    {profileLoading ? '...' : initials}
                </div>
                <div>
                    <p className="text-lg font-semibold text-zinc-900">{profileData?.username || '—'}</p>
                    <p className="text-sm text-zinc-400">{profileData?.email || '—'}</p>
                    {memberSince && <p className="text-xs text-zinc-400 mt-1">Member since {memberSince}</p>}
                </div>
            </div>

            {/* ── Personal Information ────────────────────────────── */}
            <Card title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="First Name" value={firstName} onChange={(e: any) => setFirstName(e.target.value)} icon={<User size={16} />} placeholder="First" />
                    <Input label="Last Name" value={lastName} onChange={(e: any) => setLastName(e.target.value)} placeholder="Last" />
                    <Input label="Username" value={username} onChange={(e: any) => setUsername(e.target.value)} icon={<User size={16} />} />
                    <Input label="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={16} />} />
                </div>
                {profileMsg && <p className={`text-sm mt-3 ${profileMsg.includes('updated') ? 'text-emerald-600' : 'text-red-500'}`}>{profileMsg}</p>}
                <div className="mt-6 flex justify-end">
                    <Button variant="primary" onClick={handleSaveProfile}>Save Changes</Button>
                </div>
            </Card>

            {/* ── Security ───────────────────────────────────────── */}
            <Card title="Security">
                <div className="space-y-4">
                    <Input label="Current Password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e: any) => setCurrentPassword(e.target.value)} icon={<Lock size={16} />} />
                    <Input label="New Password" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} icon={<Lock size={16} />} />
                </div>
                {pwMsg && <p className="text-sm text-emerald-600 mt-3">{pwMsg}</p>}
                {pwError && <p className="text-sm text-red-500 mt-3">{pwError}</p>}
                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" onClick={handleChangePassword} isLoading={pwLoading}>Update Password</Button>
                </div>
            </Card>

            {/* ── Two-Factor Authentication ───────────────────────── */}
            <Card title="Two-Factor Authentication">
                <div className="space-y-5">
                    {/* Status row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200/50' : 'bg-zinc-100 ring-1 ring-inset ring-zinc-200/50'}`}>
                                <Shield size={18} className={is2FAEnabled ? 'text-emerald-600' : 'text-zinc-400'} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-800">TOTP Authenticator</p>
                                <p className="text-[11px] text-zinc-400">
                                    {is2FAEnabled ? 'Enabled — an authenticator code is required at login.' : 'Not enabled — add an extra layer of security.'}
                                </p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${is2FAEnabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200'}`}>
                            {is2FAEnabled ? 'Active' : 'Off'}
                        </span>
                    </div>

                    {/* Success/error messages */}
                    {twoFAMsg && <p className="text-sm text-emerald-600">{twoFAMsg}</p>}
                    {twoFAError && <p className="text-sm text-red-500">{twoFAError}</p>}

                    {/* Idle — show enable/disable button */}
                    {twoFAStep === 'idle' && !is2FAEnabled && (
                        <Button variant="primary" onClick={handleStart2FASetup}>Enable 2FA</Button>
                    )}
                    {twoFAStep === 'idle' && is2FAEnabled && (
                        <Button variant="secondary" onClick={() => { setTwoFAStep('disable'); setOtpCode(''); setTwoFAError(''); }}>Disable 2FA</Button>
                    )}

                    {/* Loading */}
                    {twoFAStep === 'loading' && (
                        <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                            <Loader2 size={16} className="animate-spin" /> Generating your secret…
                        </div>
                    )}

                    {/* Scan QR step */}
                    {twoFAStep === 'scan' && (
                        <div className="space-y-4 p-5 rounded-xl bg-zinc-50 ring-1 ring-inset ring-zinc-100">
                            <p className="text-sm text-zinc-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
                            <div className="flex justify-center">
                                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg ring-1 ring-inset ring-zinc-200 font-mono text-zinc-700 select-all break-all">
                                    {totpSecret}
                                </code>
                                <button
                                    className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                                    onClick={() => { navigator.clipboard.writeText(totpSecret); }}
                                    title="Copy secret"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                            <p className="text-xs text-zinc-400">Can't scan? Manually enter the secret above into your authenticator app.</p>
                            <Button variant="primary" onClick={() => setTwoFAStep('verify')}>Next: Verify Code</Button>
                        </div>
                    )}

                    {/* Verify step (enable) */}
                    {twoFAStep === 'verify' && (
                        <div className="space-y-4 p-5 rounded-xl bg-zinc-50 ring-1 ring-inset ring-zinc-100">
                            <p className="text-sm text-zinc-600">Enter the 6-digit code from your authenticator app to confirm setup:</p>
                            <Input
                                label="Verification Code"
                                type="text"
                                inputMode="numeric"
                                placeholder="000000"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e: any) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button variant="primary" onClick={handleVerify2FA}>Verify & Enable</Button>
                                <Button variant="ghost" onClick={() => { setTwoFAStep('idle'); setOtpCode(''); setTwoFAError(''); }}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Disable step */}
                    {twoFAStep === 'disable' && (
                        <div className="space-y-4 p-5 rounded-xl bg-red-50/50 ring-1 ring-inset ring-red-100">
                            <p className="text-sm text-zinc-600">Enter your current authenticator code to disable 2FA:</p>
                            <Input
                                label="Current 2FA Code"
                                type="text"
                                inputMode="numeric"
                                placeholder="000000"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e: any) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleDisable2FA}>Disable 2FA</Button>
                                <Button variant="ghost" onClick={() => { setTwoFAStep('idle'); setOtpCode(''); setTwoFAError(''); }}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* ── Income Sources ──────────────────────────────────── */}
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