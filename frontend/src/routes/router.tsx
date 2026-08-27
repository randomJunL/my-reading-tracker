import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/layouts/app-layout";
import { AccountPage } from "@/routes/account-page";
import { AcceptInvitationPage } from "@/routes/accept-invitation-page";
import { AdminRoute } from "@/features/auth/admin-route";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { DashboardPage } from "@/routes/dashboard-page";
import { BookDetailPage } from "@/routes/book-detail-page";
import { LibraryPage } from "@/routes/library-page";
import { HistoryPage } from "@/routes/history-page";
import { LogReadingPage } from "@/routes/log-reading-page";
import { ReportsPage } from "@/routes/reports-page";
import { RewardsPage } from "@/routes/rewards-page";
import { ReadersPage } from "@/routes/readers-page";
import { ResetPasswordPage } from "@/routes/reset-password-page";
import { RouteErrorBoundary } from "@/routes/route-error-boundary";
import { SignInPage } from "@/routes/sign-in-page";

export const router = createBrowserRouter([
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/accept-invite", element: <AcceptInvitationPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "account", element: <AccountPage /> },
          {
            element: <AdminRoute />,
            children: [{ path: "readers", element: <ReadersPage /> }],
          },
          { path: "library", element: <LibraryPage /> },
          { path: "library/:bookId", element: <BookDetailPage /> },
          { path: "log-reading", element: <LogReadingPage /> },
          { path: "history", element: <HistoryPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "rewards", element: <RewardsPage /> },
        ],
      },
    ],
  },
]);
