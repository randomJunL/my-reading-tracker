import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth";
import { DEV_AUTH_BYPASS } from "@/features/auth/dev-auth";
import { isSupabaseConfigured, supabase } from "@/features/auth/supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(supabase) && !DEV_AUTH_BYPASS,
  );
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase || DEV_AUTH_BYPASS) return;

    let active = true;
    const updateSession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) {
        queryClient.clear();
        activeUserId.current = nextUserId;
      }
      setSession(nextSession);
      setIsLoading(false);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        updateSession(nextSession);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        updateSession(data.session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured || DEV_AUTH_BYPASS,
      isDevAuthBypass: DEV_AUTH_BYPASS,
      isLoading,
      session,
      user: session?.user ?? null,
      async completeInvitation({ fullName, password }) {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) {
          throw new Error("Supabase authentication is not configured.");
        }
        const { error } = await supabase.auth.updateUser({
          password,
          data: {
            account_type: "reader",
            full_name: fullName.trim(),
          },
        });
        if (error) throw error;
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
      },
      async signInWithPassword(email: string, password: string) {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) {
          throw new Error("Supabase authentication is not configured.");
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      async registerAdult({ fullName, householdName, email, password }) {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) {
          throw new Error("Supabase authentication is not configured.");
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              account_type: "adult",
              full_name: fullName.trim(),
              household_name: householdName.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          throw new Error(
            "An account with this email already exists. Sign in or reset the password.",
          );
        }
        if (!data.session) {
          throw new Error(
            "Email confirmation is still enabled in Supabase. Disable Confirm email, then try again.",
          );
        }
      },
      async requestPasswordReset(email: string) {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) {
          throw new Error("Supabase authentication is not configured.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (error) throw error;
      },
      async updatePassword(password: string) {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) {
          throw new Error("Supabase authentication is not configured.");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      async signOut() {
        if (DEV_AUTH_BYPASS) return;
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
