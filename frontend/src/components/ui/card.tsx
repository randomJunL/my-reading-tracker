import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[#deddd3] bg-white shadow-[0_12px_35px_rgba(35,68,59,0.05)]",
        className,
      )}
      {...props}
    />
  );
}
