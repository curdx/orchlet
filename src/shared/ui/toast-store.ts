import { create } from "zustand";

export type ToastTone = "info" | "warning" | "error";

export type ToastMessage = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
  action?: string;
};

type ToastState = {
  toast: ToastMessage | null;
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: number) => void;
  clearToast: () => void;
};

const MAX_TOASTS = 4;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  toasts: [],
  showToast: (toast) =>
    set((state) => {
      const nextToast = {
        ...toast,
        id: Date.now(),
      };

      return {
        toast: nextToast,
        toasts: [...state.toasts, nextToast].slice(-MAX_TOASTS),
      };
    }),
  removeToast: (id) =>
    set((state) => {
      const toasts = state.toasts.filter((toast) => toast.id !== id);

      return {
        toasts,
        toast: toasts.length > 0 ? toasts[toasts.length - 1] : null,
      };
    }),
  clearToast: () => set({ toast: null, toasts: [] }),
}));
