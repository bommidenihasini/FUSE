import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[8px] bg-linear-to-br from-[#72E7FF] to-[#2EA8D8] px-5 py-3 text-sm font-semibold text-bg transition duration-200 hover:-translate-y-px hover:brightness-110 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[8px] border border-border-strong bg-panel px-5 py-3 text-sm font-semibold text-text transition duration-200 hover:border-active hover:text-active disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
