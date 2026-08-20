import { Navigate, Outlet } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/current-user";

export function AdminRoute() {
  const currentUser = useCurrentUser();
  if (currentUser.isLoading) {
    return <Card className="p-8 text-center">Checking access…</Card>;
  }
  if (!currentUser.data?.is_admin) return <Navigate to="/" replace />;
  return <Outlet />;
}
