import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div
        className={`px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 max-w-md ${
          type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
        role="alert"
      >
        <div className="text-2xl">
          {type === 'success' ? '✅' : '❌'}
        </div>
        <p className="font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 hover:opacity-75 transition-opacity"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;

