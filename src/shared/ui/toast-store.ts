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
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  clearToast: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (toast) =>
    set({
      toast: {
        ...toast,
        id: Date.now(),
      },
    }),
  clearToast: () => set({ toast: null }),
}));
