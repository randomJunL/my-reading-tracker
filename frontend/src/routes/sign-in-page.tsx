import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/config/branding";
import { useAuth } from "@/features/auth/auth";
import { cn } from "@/lib/utils";

type AccountPath = "adult" | "reader";
type AuthMode = "sign-in" | "register" | "forgot-password";

const accountPaths = {
  adult: {
    eyebrow: "Parent or teacher",
    title: "Create or manage a family or classroom",
    description:
      "Manage readers, recommend books, review progress, manage rewards, and download reports.",
    emailHint: "Use the email for this family or classroom account.",
    placeholder: "parent@example.com",
    icon: UsersRound,
  },
  reader: {
    eyebrow: "Reader",
    title: "Open your invited reading account",
    description:
      "Log reading, manage your books, earn rewards, and view your progress.",
    emailHint:
      "Use the email and password you created from your invitation link.",
    placeholder: "reader@example.com",
    icon: BookOpenCheck,
  },
} as const;

const benefits = [
  {
    title: "Log reading quickly",
    description:
      "Record books, minutes, pages, reading activities, and completed sessions.",
    icon: Clock3,
  },
  {
    title: "Follow progress",
    description:
      "See reading days, history, finished books, streaks, badges, and other achievements.",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    title: "Encourage every reader",
    description:
      "Recommend books, offer rewards, celebrate milestones, and print achievement reports.",
    icon: Award,
  },
] as const;

export function SignInPage() {
  const {
    isConfigured,
    isDevAuthBypass,
    isLoading,
    registerAdult,
    requestPasswordReset,
    session,
    signInWithPassword,
  } = useAuth();
  const [accountPath, setAccountPath] = useState<AccountPath | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
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

  function chooseAccountPath(path: AccountPath) {
    setAccountPath(path);
    setAuthMode("sign-in");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setHouseholdName("");
    setMessage(null);
    setError(null);
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
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3eb] px-3 py-6 sm:px-5 sm:py-12">
      <div className={cn("w-full", accountPath ? "max-w-md" : "max-w-5xl")}>
        <div className="mb-4 flex items-center justify-center gap-3 text-[#173f36] sm:mb-7">
          <BrandMark />
          <span className="font-serif text-2xl font-bold">{APP_NAME}</span>
        </div>

        {accountPath ? (
          <SignInCard
            accountPath={accountPath}
            authMode={authMode}
            confirmPassword={confirmPassword}
            email={email}
            error={error}
            fullName={fullName}
            householdName={householdName}
            isConfigured={isConfigured}
            isSending={isSending}
            message={message}
            password={password}
            onChangeAuthMode={(mode) => {
              setAuthMode(mode);
              setMessage(null);
              setError(null);
              setPassword("");
              setConfirmPassword("");
            }}
            onChangeConfirmPassword={setConfirmPassword}
            onChangeEmail={setEmail}
            onChangeFullName={setFullName}
            onChangeHouseholdName={setHouseholdName}
            onChangePassword={setPassword}
            onChooseAnother={() => {
              setAccountPath(null);
              setAuthMode("sign-in");
              setEmail("");
              setPassword("");
              setMessage(null);
              setError(null);
            }}
            onSubmit={(event) => void handleSubmit(event)}
          />
        ) : (
          <AccountPathChooser onChoose={chooseAccountPath} />
        )}

        <p className="mt-5 text-center text-xs leading-5 text-[#7a8a84]">
          Your reading records stay private to your household or classroom.
        </p>
      </div>
    </main>
  );
}

function AccountPathChooser({
  onChoose,
}: {
  onChoose: (path: AccountPath) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <section className="bg-[#173f36] px-5 py-5 text-white sm:px-9 sm:py-9 lg:flex lg:flex-col lg:justify-center lg:px-11 lg:py-12">
          <p className="text-xs font-bold tracking-[0.14em] text-[#f4bd62] uppercase">
            Read · Track · Celebrate
          </p>
          <h1 className="mt-2 max-w-2xl font-serif text-2xl leading-[1.12] font-bold tracking-[-0.03em] sm:mt-3 sm:text-3xl">
            Build a reading habit—and watch it grow
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d6e2de] sm:mt-4 sm:text-base sm:leading-7">
            {APP_NAME} is a reading-tracking app for families and classrooms.
          </p>
          <p className="mt-2 hidden max-w-xl text-sm leading-6 text-[#b9cdc6] sm:block">
            Log books and reading time, follow each reader’s progress, celebrate
            achievements, manage rewards, and create printable reports.
          </p>

          <div
            aria-label="What you can do"
            className="mt-8 hidden gap-5 border-t border-white/15 pt-7 lg:grid"
          >
            {benefits.map(({ description, icon: Icon, title }) => (
              <section key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#f4bd62]">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="font-serif text-lg font-bold text-white">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-[#b9cdc6]">
                    {description}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="bg-white p-5 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-10">
          <span className="hidden size-11 items-center justify-center rounded-2xl bg-[#e4f0eb] text-[#28705f] sm:flex">
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="font-serif text-2xl font-bold tracking-[-0.025em] text-[#173f36] sm:mt-4 sm:text-3xl">
            How will you use {APP_NAME}?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7e77]">
            Choose an account type to continue.
          </p>

          <div className="mt-4 grid gap-3 sm:mt-6">
            {(
              Object.entries(accountPaths) as [
                AccountPath,
                (typeof accountPaths)[AccountPath],
              ][]
            ).map(([path, option]) => {
              const Icon = option.icon;
              return (
                <button
                  key={path}
                  type="button"
                  aria-label={`Continue as ${option.eyebrow}`}
                  onClick={() => onChoose(path)}
                  className="group cursor-pointer rounded-2xl border border-[#d7d5c9] bg-[#faf9f5] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#78a99c] hover:bg-white hover:shadow-[0_12px_30px_rgba(35,68,59,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28705f] sm:p-5"
                >
                  <span className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e4f0eb] text-[#28705f]">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-xs font-bold tracking-[0.12em] text-[#c65c43] uppercase">
                        {option.eyebrow}
                      </span>
                      <span className="mt-1 block font-serif text-lg leading-6 font-bold text-[#21483e]">
                        {option.title}
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 hidden text-sm leading-5 text-[#667b74] sm:block">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Card>
  );
}

function SignInCard({
  accountPath,
  authMode,
  confirmPassword,
  email,
  error,
  fullName,
  householdName,
  isConfigured,
  isSending,
  message,
  password,
  onChangeAuthMode,
  onChangeConfirmPassword,
  onChangeEmail,
  onChangeFullName,
  onChangeHouseholdName,
  onChangePassword,
  onChooseAnother,
  onSubmit,
}: {
  accountPath: AccountPath;
  authMode: AuthMode;
  confirmPassword: string;
  email: string;
  error: string | null;
  fullName: string;
  householdName: string;
  isConfigured: boolean;
  isSending: boolean;
  message: string | null;
  password: string;
  onChangeAuthMode: (mode: AuthMode) => void;
  onChangeConfirmPassword: (password: string) => void;
  onChangeEmail: (email: string) => void;
  onChangeFullName: (name: string) => void;
  onChangeHouseholdName: (name: string) => void;
  onChangePassword: (password: string) => void;
  onChooseAnother: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const option = accountPaths[accountPath];
  const isRegistering = accountPath === "adult" && authMode === "register";
  const isRequestingReset = authMode === "forgot-password";

  return (
    <Card className="p-7 sm:p-9">
      <button
        type="button"
        onClick={onChooseAnother}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#567069] hover:text-[#21483e]"
      >
        <ArrowLeft className="size-4" />
        Choose another role
      </button>

      <div className="mt-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e4f0eb] text-[#28705f]">
          {isRegistering ? (
            <UserPlus className="size-5" />
          ) : (
            <LockKeyhole className="size-5" />
          )}
        </span>
        <p className="mt-5 text-xs font-bold tracking-[0.12em] text-[#c65c43] uppercase">
          {option.eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-[-0.025em] text-[#173f36]">
          {isRegistering
            ? "Create your account"
            : isRequestingReset
              ? "Reset your password"
              : "Sign in to your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6b7e77]">
          {isRegistering
            ? "Tell us a little about your family or classroom. You’ll become its owner."
            : isRequestingReset
              ? "Enter your account email and we’ll send a secure reset link."
              : option.emailHint}
        </p>
      </div>

      <form className="mt-7" onSubmit={onSubmit}>
        {isRegistering && (
          <>
            <FormField
              autoComplete="name"
              id="full-name"
              label="Your name"
              placeholder="Jordan Smith"
              value={fullName}
              onChange={onChangeFullName}
            />
            <FormField
              autoComplete="organization"
              id="household-name"
              label="Family or classroom name"
              placeholder="The Smith Family or Room 12"
              value={householdName}
              onChange={onChangeHouseholdName}
            />
          </>
        )}
        <label htmlFor="email" className="text-sm font-semibold text-[#294d43]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => onChangeEmail(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
          placeholder={option.placeholder}
        />
        {!isRequestingReset && (
          <>
            <label
              htmlFor="password"
              className="mt-4 block text-sm font-semibold text-[#294d43]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => onChangePassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
              placeholder={
                isRegistering ? "At least 8 characters" : "Your password"
              }
            />
          </>
        )}
        {isRegistering && (
          <>
            <label
              htmlFor="confirm-password"
              className="mt-4 block text-sm font-semibold text-[#294d43]"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => onChangeConfirmPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
              placeholder="Enter the same password again"
            />
          </>
        )}
        {!isRegistering && !isRequestingReset && (
          <button
            type="button"
            onClick={() => onChangeAuthMode("forgot-password")}
            className="mt-3 cursor-pointer text-sm font-semibold text-[#28705f] hover:text-[#21483e]"
          >
            Forgot password?
          </button>
        )}
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
          {isSending
            ? isRegistering
              ? "Creating account…"
              : isRequestingReset
                ? "Sending reset link…"
                : "Signing in…"
            : isRegistering
              ? "Create parent or teacher account"
              : isRequestingReset
                ? "Send password reset link"
                : "Sign in"}
        </Button>
        {isRequestingReset && (
          <button
            type="button"
            onClick={() => onChangeAuthMode("sign-in")}
            className="mt-4 w-full cursor-pointer text-sm font-semibold text-[#567069] hover:text-[#21483e]"
          >
            Back to sign in
          </button>
        )}
        {accountPath === "adult" && !isRequestingReset ? (
          <p className="mt-5 text-center text-sm text-[#6b7e77]">
            {isRegistering ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() =>
                onChangeAuthMode(isRegistering ? "sign-in" : "register")
              }
              className="cursor-pointer font-semibold text-[#28705f] hover:text-[#21483e] hover:underline"
            >
              {isRegistering ? "Back to sign in" : "Create an account"}
            </button>
          </p>
        ) : null}
      </form>
    </Card>
  );
}

function FormField({
  autoComplete,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  autoComplete: string;
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
        type="text"
        autoComplete={autoComplete}
        maxLength={120}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm font-normal text-[#173f36] transition outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
        placeholder={placeholder}
      />
    </label>
  );
}
