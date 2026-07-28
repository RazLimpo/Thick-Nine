// hooks/useToast.ts

// ==========================================
// BLOCK 1: IMPORTS & TYPE DEFINITIONS
// ==========================================
import { useCallback } from 'react';

export type ToastType = 'success' | 'removed' | 'info';

export interface UseToastReturn {
  showToast: (message: string, type?: ToastType) => void;
}


// ==========================================
// BLOCK 2: TOAST CREATION & LIFECYCLE MANAGEMENT
// ==========================================
export function useToast(): UseToastReturn {
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
    const iconClassMap: Record<ToastType, string> = {
      removed: 'fa-solid fa-triangle-exclamation',
      info: 'fa-solid fa-circle-info',
      success: 'fa-solid fa-circle-check',
    };
    icon.className = iconClassMap[type] || iconClassMap.success;

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


