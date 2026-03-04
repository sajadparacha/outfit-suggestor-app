/**
 * Confirmation Modal Component
 * Shows a modal dialog for user confirmation
 */

import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-md w-full p-6 transform transition-all backdrop-blur">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-white/10 rounded-full mb-4 ring-1 ring-white/15">
            <span className="text-2xl">🔍</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <div className="text-sm text-slate-200 mb-6">
            {typeof message === 'string' ? (
              <p className="text-center">{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/10 text-slate-200 rounded-full hover:bg-white/20 transition-colors font-medium border border-white/15"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors font-medium"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;













