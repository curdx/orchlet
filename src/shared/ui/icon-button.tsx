import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  icon: LucideIcon;
  label: string;
  tooltip: string;
};

export function IconButton({
  icon: Icon,
  label,
  tooltip,
  className = "",
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      className={`icon-button inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d7dfd2] bg-white text-[#334238] shadow-sm transition hover:border-[#9db19a] hover:bg-[#f7faf4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={2} />
      <span className="icon-button__tooltip" role="tooltip">
        {tooltip}
      </span>
    </button>
  );
}
