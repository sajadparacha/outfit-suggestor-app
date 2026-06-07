import React, { useState, useEffect } from 'react';
import ApiService from '../../services/ApiService';

interface ActivateAccountProps {
  token: string;
  onActivateComplete: () => void;
}

const ActivateAccount: React.FC<ActivateAccountProps> = ({ token, onActivateComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const activate = async () => {
      try {
        setLoading(true);
        setError(null);
        await ApiService.activateAccount(token);
        setSuccess(true);
        setTimeout(() => {
          onActivateComplete();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Activation failed');
        setLoading(false);
      }
    };

    if (token) {
      activate();
    }
  }, [token, onActivateComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <h2 className="text-center text-3xl font-bold text-white">Activate Your Account</h2>

        {loading && (
          <div className="text-center">
            <div className="spinner-brand mx-auto h-12 w-12" />
            <p className="mt-4 text-slate-300">Activating your account...</p>
          </div>
        )}

        {success && (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/20">
              <svg className="h-6 w-6 text-brand-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-brand-blue">Account activated successfully!</p>
            <p className="mt-2 text-slate-400">Redirecting to login...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-red-300">Activation Failed</p>
            <p className="mt-2 text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="btn-brand mt-4 rounded-xl px-4 py-2 text-sm"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivateAccount;
