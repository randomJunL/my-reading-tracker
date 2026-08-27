import { Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/config/branding";
import { useAuth } from "@/features/auth/auth";

export function SignInPage() {
  const { isConfigured, isDevAuthBypass, isLoading, session, sendMagicLink } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && (session || isDevAuthBypass)) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSending(true);
    try {
      if (authMode === "register") {
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }
        if (password !== confirmPassword) {
          throw new Error("The passwords do not match.");
        }
        await registerAdult({
          email,
          fullName,
          householdName,
          password,
        });
        setMessage("Your account is ready. Signing you in…");
      } else if (authMode === "forgot-password") {
        await requestPasswordReset(email);
        setMessage(
          "If an account exists for this email, a password reset link is on its way.",
        );
      } else {
        await signInWithPassword(email, password);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t complete the request.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3eb] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3 text-[#173f36]">
          <BrandMark />
          <span className="font-serif text-2xl font-bold">{APP_NAME}</span>
        </div>
        <Card className="p-7 sm:p-9">
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e4f0eb] text-[#28705f]">
              <Mail className="size-5" />
            </span>
            <h1 className="mt-5 font-serif text-3xl font-bold tracking-[-0.025em] text-[#173f36]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6b7e77]">
              Enter your email and we’ll send you a secure sign-in link.
            </p>
          </div>

          <form className="mt-7" onSubmit={(event) => void handleSubmit(event)}>
            <label
              htmlFor="email"
              className="text-sm font-semibold text-[#294d43]"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
              placeholder="parent@example.com"
            />
            {message && (
              <p className="mt-3 text-sm text-[#28705f]" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-3 text-sm text-[#b44733]" role="alert">
                {error}
              </p>
            )}
            {!isConfigured && (
              <p className="mt-3 text-sm text-[#b44733]" role="alert">
                Supabase is not configured. Add the frontend Supabase URL and
                publishable key to your environment.
              </p>
            )}
            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={!isConfigured || isSending}
            >
              {isSending ? "Sending link…" : "Email me a sign-in link"}
            </Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-[#7a8a84]">
          Your reading records stay private to your household.
        </p>
      </div>
    </main>
  );
}
