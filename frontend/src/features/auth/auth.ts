import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthContextValue = {
  isConfigured: boolean;
  isDevAuthBypass: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  registerAdult: (details: {
    fullName: string;
    householdName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  activateInvitation: (details: {
    accountType: "caregiver" | "reader";
    email: string;
    password: string;
  }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
