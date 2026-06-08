import React, { useState } from 'react';
import { LoginRequest } from '../../models/AuthModels';

interface LoginProps {
  onLogin: (credentials: LoginRequest) => Promise<void>;
  onSwitchToRegister: () => void;
  loading: boolean;
  error: string | null;
  headline?: string;
  subheadline?: string;
}

const Login: React.FC<LoginProps> = ({
  onLogin,
  onSwitchToRegister,
  loading,
  error,
  headline,
  subheadline,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onLogin({ username: email, password });
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-center text-2xl font-bold text-white">
            {headline ?? 'Sign in to your account'}
          </h2>
          {subheadline ? (
            <p className="mt-2 text-center text-sm text-slate-300">{subheadline}</p>
          ) : null}
          <p className={`text-center text-sm text-slate-400 ${subheadline ? 'mt-3' : 'mt-2'}`}>
            Or{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-medium text-brand-blue transition hover:text-brand-purple"
            >
              create a new account
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
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
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
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-brand w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-brand w-full rounded-xl py-2.5 text-sm font-semibold ${
              loading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
