import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth";
import {
  useCurrentUser,
  useUpdateCurrentUser,
} from "@/features/auth/current-user";
import { useReaders, useUpdateReader } from "@/features/readers/reader-api";

export function AccountPage() {
  const { isDevAuthBypass, updatePassword, updateProfile, user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const updateCurrentUser = useUpdateCurrentUser();
  const { data: readers = [] } = useReaders();
  const updateReader = useUpdateReader();
  const [profileNameInput, setProfileNameInput] = useState<string | null>(null);
  const [householdNameInput, setHouseholdNameInput] = useState<string | null>(
    null,
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linkedReader = readers.find(
    (reader) => reader.id === currentUser?.reader_id,
  );
  const displayName =
    typeof user?.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const profileName = profileNameInput ?? displayName ?? "";
  const householdName = householdNameInput ?? currentUser?.household_name ?? "";

  async function handleProfileChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    const trimmedName = profileName.trim();
    const trimmedHouseholdName = householdName.trim();
    if (!trimmedName && !isDevAuthBypass) {
      setProfileError("Enter your name.");
      return;
    }
    if (currentUser?.role === "owner" && !trimmedHouseholdName) {
      setProfileError("Enter a family or classroom name.");
      return;
    }

    setIsSavingProfile(true);
    try {
      if (!isDevAuthBypass) {
        await updateProfile({ fullName: trimmedName });
      }
      if (currentUser?.role === "owner") {
        await updateCurrentUser.mutateAsync({
          household_name: trimmedHouseholdName,
        });
      } else if (currentUser?.reader_id) {
        await updateReader.mutateAsync({
          readerId: currentUser.reader_id,
          data: { name: trimmedName },
        });
      }
      setProfileNameInput(trimmedName);
      setHouseholdNameInput(trimmedHouseholdName);
      setProfileMessage("Your account information has been updated.");
    } catch (requestError) {
      setProfileError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t update your account information.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
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
      setPassword("");
      setConfirmPassword("");
      setMessage("Your password has been updated.");
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
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
          Security and access
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-[-0.035em] text-[#173f36] sm:text-[44px]">
          Account
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#667b74] sm:text-base">
          Update your account information and manage your password.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#e7f0eb] text-[#28705f]">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#21483e]">
                Edit account
              </h2>
              <p className="text-sm text-[#6b7e77]">
                Your personal and household details
              </p>
            </div>
          </div>

          <form
            className="mt-6"
            onSubmit={(event) => void handleProfileChange(event)}
          >
            <TextField
              id="account-name"
              label="Name"
              value={profileName}
              onChange={setProfileNameInput}
              autoComplete="name"
              maxLength={80}
              disabled={isDevAuthBypass}
            />
            {currentUser?.role === "owner" ? (
              <TextField
                id="account-household-name"
                label="Family or classroom name"
                value={householdName}
                onChange={setHouseholdNameInput}
                autoComplete="organization"
                maxLength={120}
              />
            ) : null}
            {isDevAuthBypass ? (
              <p className="-mt-1 mb-4 text-xs leading-5 text-[#6b7e77]">
                Name changes require a signed-in account. The family or
                classroom name can still be changed locally.
              </p>
            ) : null}
            {profileMessage ? (
              <p className="mb-3 text-sm text-[#28705f]" role="status">
                {profileMessage}
              </p>
            ) : null}
            {profileError ? (
              <p className="mb-3 text-sm text-[#b44733]" role="alert">
                {profileError}
              </p>
            ) : null}
            <Button type="submit" disabled={isSavingProfile || !currentUser}>
              <Save className="size-4" />
              {isSavingProfile ? "Saving changes…" : "Save changes"}
            </Button>
          </form>

          <dl className="mt-6 divide-y divide-[#e7e4da] border-t border-[#e7e4da] text-sm">
            <Detail
              label="Email"
              value={currentUser?.email ?? user?.email ?? "—"}
            />
            <Detail
              label="Role"
              value={currentUser?.role === "owner" ? "Owner" : "Reader"}
            />
            {currentUser?.role !== "owner" ? (
              <Detail
                label="Family or classroom"
                value={currentUser?.household_name ?? "—"}
              />
            ) : null}
            <Detail
              label="Reader profile"
              value={
                currentUser?.role === "owner"
                  ? "Manages all reader profiles"
                  : (linkedReader?.name ?? "Linked reader")
              }
            />
          </dl>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#fff1dc] text-[#b15a3f]">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#21483e]">
                Change password
              </h2>
              <p className="text-sm text-[#6b7e77]">No email is required</p>
            </div>
          </div>

          {isDevAuthBypass ? (
            <div className="mt-6 rounded-xl bg-[#f5f3eb] p-4 text-sm leading-6 text-[#667b74]">
              Password changes are unavailable while the local authentication
              bypass is enabled.
            </div>
          ) : (
            <form
              className="mt-6"
              onSubmit={(event) => void handlePasswordChange(event)}
            >
              <PasswordField
                id="account-new-password"
                label="New password"
                value={password}
                onChange={setPassword}
              />
              <PasswordField
                id="account-confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
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
              <Button type="submit" className="mt-5" disabled={isSaving}>
                <ShieldCheck className="size-4" />
                {isSaving ? "Updating password…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </section>
  );
}

function TextField({
  autoComplete,
  disabled = false,
  id,
  label,
  maxLength,
  onChange,
  value,
}: {
  autoComplete: string;
  disabled?: boolean;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
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
        type="text"
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={!disabled}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 font-normal text-[#173f36] outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15 disabled:cursor-not-allowed disabled:bg-[#f2f0e8] disabled:text-[#7b8984]"
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="font-semibold text-[#667b74]">{label}</dt>
      <dd className="break-words text-[#21483e]">{value}</dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
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
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d5c9] bg-white px-4 font-normal text-[#173f36] outline-none focus:border-[#28705f] focus:ring-3 focus:ring-[#28705f]/15"
        placeholder="At least 8 characters"
      />
    </label>
  );
}
