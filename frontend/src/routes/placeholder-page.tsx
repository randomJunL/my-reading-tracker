import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Card } from "@/components/ui/card";

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const title = pathname.slice(1) || "Home";

  return (
    <Card className="mx-auto max-w-xl p-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fff0d5] text-[#a6651c]">
        <Construction className="size-6" />
      </span>
      <h1 className="mt-5 font-serif text-3xl font-bold text-[#173f36] capitalize">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#687b74]">
        This area is ready for its feature step. The application shell, routing,
        and navigation are already in place.
      </p>
    </Card>
  );
}
