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
        // Call onActivateComplete after a short delay to show success message
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Activate Your Account
          </h2>
        </div>

        {loading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Activating your account...</p>
          </div>
        )}

        {success && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="mt-4 text-green-600 font-medium">Account activated successfully!</p>
            <p className="mt-2 text-gray-600">Redirecting to login...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <p className="mt-4 text-red-600 font-medium">Activation Failed</p>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
