import { X } from "lucide-react";

import { IconButton } from "./icon-button";
import type { ToastMessage } from "./toast-store";

type ToastProps = {
  toast: ToastMessage;
  onClose: () => void;
};

const toneClass: Record<ToastMessage["tone"], string> = {
  info: "border-[#bfd9e6] bg-[#f2f9fc]",
  warning: "border-[#e5d39b] bg-[#fff9e7]",
  error: "border-[#e8b5a5] bg-[#fff4ef]",
};

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <aside
      role="status"
      className={`fixed bottom-5 right-5 z-30 w-[min(360px,calc(100vw-40px))] rounded-lg border p-4 shadow-lg ${toneClass[toast.tone]}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#17211b]">{toast.title}</p>
          <p className="mt-1 text-sm text-[#435147]">{toast.message}</p>
          {toast.action ? (
            <p className="mt-2 text-xs font-medium text-[#5c4b13]">{toast.action}</p>
          ) : null}
        </div>
        <IconButton icon={X} label="关闭提示" tooltip="关闭提示" onClick={onClose} />
      </div>
    </aside>
  );
}
