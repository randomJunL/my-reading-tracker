import { AlertTriangle } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import { BrandMark } from "@/components/brand-mark";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status}: ${error.statusText}`
    : "Something unexpected interrupted this page.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3eb] px-5">
      <div className="w-full max-w-md rounded-[24px] border border-[#deddd3] bg-white p-8 text-center shadow-xl shadow-[#23443b]/5">
        <BrandMark className="mx-auto" />
        <AlertTriangle className="mx-auto mt-6 size-8 text-[#df6549]" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-[#173f36]">
          This page lost its place
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#687b74]">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#df6549] px-5 text-sm font-semibold text-white hover:bg-[#c9543b]"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
