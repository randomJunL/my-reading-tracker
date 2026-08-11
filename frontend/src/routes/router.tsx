import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/layouts/app-layout";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { DashboardPage } from "@/routes/dashboard-page";
import { PlaceholderPage } from "@/routes/placeholder-page";
import { RouteErrorBoundary } from "@/routes/route-error-boundary";
import { SignInPage } from "@/routes/sign-in-page";

export const router = createBrowserRouter([
  { path: "/sign-in", element: <SignInPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "readers", element: <PlaceholderPage /> },
          { path: "library", element: <PlaceholderPage /> },
          { path: "history", element: <PlaceholderPage /> },
          { path: "reports", element: <PlaceholderPage /> },
        ],
      },
    ],
  },
]);
