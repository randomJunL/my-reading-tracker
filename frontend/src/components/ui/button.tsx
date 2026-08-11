import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#f4bd62]/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#df6549] px-4 py-2.5 text-white shadow-[0_8px_18px_rgba(223,101,73,0.2)] hover:bg-[#c9543b]",
        secondary:
          "border border-[#d7d5c9] bg-white px-4 py-2.5 text-[#23443b] hover:bg-[#f7f5ef]",
        ghost: "px-3 py-2 text-[#36594f] hover:bg-[#e9eee9]",
      },
      size: {
        default: "h-11",
        sm: "h-9 rounded-lg px-3",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
