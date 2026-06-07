import React, { useState } from 'react';
import { RegisterRequest } from '../../models/AuthModels';

interface RegisterProps {
  onRegister: (data: RegisterRequest) => Promise<void>;
  onSwitchToLogin: () => void;
  loading: boolean;
  error: string | null;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    try {
      await onRegister({ email, password, full_name: fullName || undefined });
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-center text-2xl font-bold text-white">Create your account</h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium text-brand-blue transition hover:text-brand-purple"
            >
              sign in to your existing account
            </button>
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}
          <div className="space-y-3">
            <input
              id="full-name"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-brand w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500"
              placeholder="Full Name (Optional)"
            />
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-brand w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500"
              placeholder="Email address"
            />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brand w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500"
              placeholder="Password"
            />
            <div>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-brand w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500"
                placeholder="Confirm Password"
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (password !== confirmPassword && confirmPassword !== '')}
            className={`btn-brand w-full rounded-xl py-2.5 text-sm font-semibold ${
              loading || (password !== confirmPassword && confirmPassword !== '') ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
