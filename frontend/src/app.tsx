import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/features/auth/auth-context";
import { ReaderSelectionProvider } from "@/features/readers/reader-selection";
import { router } from "@/routes/router";

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ReaderSelectionProvider>
          <RouterProvider router={router} />
        </ReaderSelectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
