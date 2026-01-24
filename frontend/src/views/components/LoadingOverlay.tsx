import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message = 'Generating AI suggestion...' }) => {
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full mx-4 flex flex-col items-center">
        <div className="mb-4">
          <svg
            className="animate-spin h-12 w-12 text-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Suggestion</h3>
        <p className="text-gray-600 text-center">{message}</p>
        <p className="text-sm text-gray-500 mt-4 text-center">Please wait while we create your outfit suggestion...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
