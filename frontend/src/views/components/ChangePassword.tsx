/**
 * Change Password Component
 * Allows authenticated users to change their password
 */

import React, { useState } from 'react';
import ApiService from '../../services/ApiService';

interface ChangePasswordProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess, onCancel }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await ApiService.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Password Changed!</h2>
        <p className="text-slate-300 mb-4">Your password has been successfully changed.</p>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-brand rounded-xl px-4 py-2 text-sm">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-slate-200">
            Current Password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-brand w-full rounded-xl px-3 py-2"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-200">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-brand w-full rounded-xl px-3 py-2"
            required
            minLength={6}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters long</p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-200">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-brand w-full rounded-xl px-3 py-2"
            required
            disabled={loading}
          />
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`btn-brand flex-1 rounded-xl px-4 py-2 text-sm ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
