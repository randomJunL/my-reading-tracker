import { LockKeyhole } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/config/branding";
import { useAuth } from "@/features/auth/auth";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { isConfigured, isLoading, session, signOut, updatePassword } =
    useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(password);
      await signOut();
      void navigate("/sign-in", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t update your password.",
      );
    } finally {
      setIsSaving(false);
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
              <LockKeyhole className="size-5" />
            </span>
            <h1 className="mt-5 font-serif text-3xl font-bold tracking-[-0.025em] text-[#173f36]">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6b7e77]">
              Use a password that is difficult for someone else to guess.
            </p>
          </div>

          {isLoading ? (
            <p
              className="mt-7 text-center text-sm font-semibold text-[#567069]"
              role="status"
            >
              Checking your reset link…
            </p>
          ) : session ? (
            <form
              className="mt-7"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <PasswordField
                id="new-password"
                label="New password"
                placeholder="At least 8 characters"
                value={password}
                onChange={setPassword}
              />
              <PasswordField
                id="confirm-new-password"
                label="Confirm new password"
                placeholder="Enter the same password again"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
              {error && (
                <p className="mt-3 text-sm text-[#b44733]" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-5 w-full"
                disabled={!isConfigured || isSaving}
              >
                {isSaving ? "Updating password…" : "Update password"}
              </Button>
            </form>
          ) : (
            <div className="mt-7 text-center">
              <p className="text-sm leading-6 text-[#b44733]" role="alert">
                This reset link is invalid or has expired. Request a new link
                from the sign-in page.
              </p>
              <Link
                to="/sign-in"
                className="mt-5 inline-flex text-sm font-semibold text-[#28705f] hover:text-[#21483e]"
              >
                Return to sign in
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label
      className="mb-4 block text-sm font-semibold text-[#294d43]"
      htmlFor={id}
    >
      {label}
      <input
        id={id}
        name={id}
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm font-normal text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
        placeholder={placeholder}
      />
    </label>
  );
}
