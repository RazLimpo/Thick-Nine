// hooks/useToast.ts
import { useCallback } from 'react';

export type ToastType = 'success' | 'removed' | 'info';

export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (typeof window === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'removed' ? 'removed' : ''}`;

    const icon = document.createElement('i');
    if (type === 'removed') {
      icon.className = 'fa-solid fa-triangle-exclamation';
    } else if (type === 'info') {
      icon.className = 'fa-solid fa-circle-info';
    } else {
      icon.className = 'fa-solid fa-circle-check';
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(textSpan);
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }, []);

  return { showToast };
}