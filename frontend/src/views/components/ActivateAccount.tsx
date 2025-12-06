/**
 * Account Activation Component
 * Handles email activation when user clicks activation link
 */

import React, { useState, useEffect } from 'react';
import ApiService from '../../services/ApiService';

interface ActivateAccountProps {
  token: string;
  onActivateComplete: () => void;
}

const ActivateAccount: React.FC<ActivateAccountProps> = ({ token, onActivateComplete }) => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const activate = async () => {
      try {
        setLoading(true);
        const result = await ApiService.activateAccount(token);
        setMessage(result.message);
        setError('');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          onActivateComplete();
        }, 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Activation failed');
        setMessage('');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      activate();
    }
  }, [token, onActivateComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg text-center">
        {loading && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Activating your account...</p>
          </>
        )}

        {message && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Activated!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </>
        )}

        {error && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Activation Failed</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={onActivateComplete}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivateAccount;

