/**
 * Toast Controller Hook
 * Manages toast notifications
 */

import { useState, useCallback } from 'react';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface UseToastControllerReturn {
  toast: Toast | null;
  showToast: (message: string, type: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useToastController = (): UseToastControllerReturn => {
  const [toast, setToast] = useState<Toast | null>(null);

  /**
   * Show toast notification
   * @param message - Toast message
   * @param type - Toast type (success or error)
   */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast(null), 3000);
  }, []);

  /**
   * Hide toast notification
   */
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};

