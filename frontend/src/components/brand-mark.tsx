import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-[14px] bg-[#f4bd62] text-[#173f36] shadow-[inset_0_-2px_0_rgba(23,63,54,0.12)]",
        className,
      )}
      aria-hidden="true"
    >
      <BookOpen className="size-5" strokeWidth={2.4} />
    </span>
  );
}
