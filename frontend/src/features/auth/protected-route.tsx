import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth";
import { useCurrentUser } from "@/features/auth/current-user";

export function ProtectedRoute() {
  const location = useLocation();
  const { isDevAuthBypass, isLoading, session, signOut } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (!session && !isDevAuthBypass) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return <AuthenticatedApp signOut={signOut} />;
}

function AuthenticatedApp({ signOut }: { signOut: () => Promise<void> }) {
  const currentUser = useCurrentUser();

  if (currentUser.isPending) return <AuthLoadingScreen />;
  if (currentUser.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3eb] p-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl font-bold text-[#173f36]">
            We couldn’t open your account
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#667972]">
            Check the API and Supabase configuration, then try again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void currentUser.refetch()}
            >
              Try again
            </Button>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3eb]">
      <p className="text-sm font-semibold text-[#567069]" role="status">
        Opening your family library…
      </p>
    </main>
  );
}
