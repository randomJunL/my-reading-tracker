import { zodResolver } from "@hookform/resolvers/zod";
import {
  KeyRound,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type Reader,
  type ReaderCreate,
  type ReaderLoginInvitation,
  useCreateReader,
  useCreateReaderLoginInvitation,
  useDeleteReader,
  useDeleteReaderLoginInvitation,
  useReaderLoginInvitations,
  useReaders,
  useUpdateReader,
} from "@/features/readers/reader-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import { cn } from "@/lib/utils";

const AVATARS = [
  { key: "coral", className: "bg-[#f0a28a] text-[#693225]" },
  { key: "gold", className: "bg-[#f4cb78] text-[#634a17]" },
  { key: "teal", className: "bg-[#8fc8bb] text-[#174a3f]" },
  { key: "blue", className: "bg-[#9ebbd9] text-[#244666]" },
] as const;

const readerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the reader’s name")
    .max(80, "Use 80 characters or fewer"),
  avatar_key: z.enum(["coral", "gold", "teal", "blue"]),
});

type ReaderFormValues = z.infer<typeof readerFormSchema>;

export function ReadersPage() {
  const { data: readers = [], isLoading, error } = useReaders();
  const createMutation = useCreateReader();
  const invitations = useReaderLoginInvitations();
  const createInvitation = useCreateReaderLoginInvitation();
  const deleteInvitation = useDeleteReaderLoginInvitation();
  const updateMutation = useUpdateReader();
  const { selectedReaderId, setSelectedReaderId } = useReaderSelection();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [deletingReader, setDeletingReader] = useState<Reader | null>(null);
  const [accessToRemove, setAccessToRemove] =
    useState<ReaderLoginInvitation | null>(null);

  async function handleCreate(data: ReaderCreate) {
    const reader = await createMutation.mutateAsync(data);
    if (!selectedReaderId) setSelectedReaderId(reader.id);
    setShowCreateForm(false);
  }

  async function handleUpdate(data: ReaderCreate) {
    if (!editingReader) return;
    await updateMutation.mutateAsync({ readerId: editingReader.id, data });
    setEditingReader(null);
  }

  return (
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
            Family profiles
          </p>
          <h1 className="font-serif text-4xl font-bold tracking-[-0.035em] text-[#173f36] sm:text-[44px]">
            Readers
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#667b74] sm:text-base">
            Give each child a profile so books, sessions, and progress stay
            organized.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="size-4" />
          Add reader
        </Button>
      </div>

      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-1 size-5 text-[#c65c43]" />
          <div>
            <h2 className="font-serif text-xl font-bold text-[#21483e]">
              Invite a reader
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667b74]">
              Enter the reader’s email to create an invitation. When they click
              the link in the invitation email, they’ll enter their name and
              password. Their profile card will be created automatically.
            </p>
          </div>
        </div>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const email = form.get("email");
            if (typeof email !== "string") {
              return;
            }
            createInvitation.mutate({ email });
            event.currentTarget.reset();
          }}
        >
          <input
            name="email"
            type="email"
            required
            aria-label="Reader login email"
            placeholder="reader@school.org"
            className="h-11 rounded-xl border border-[#d7d5c9] bg-white px-3 text-sm"
          />
          <Button disabled={createInvitation.isPending}>
            {createInvitation.isPending ? "Inviting…" : "Invite reader"}
          </Button>
        </form>
        <p className="mt-2 text-xs leading-5 text-[#667b74]">
          The activation link will be sent to this email address.
        </p>
        {createInvitation.isSuccess ? (
          <p role="status" className="mt-3 text-sm text-[#28705f]">
            Invitation email sent. The reader can now use its activation link.
          </p>
        ) : null}
        {createInvitation.error ? (
          <p role="alert" className="mt-3 text-sm text-[#943f30]">
            {createInvitation.error.message}
          </p>
        ) : null}
      </Card>

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-[#e8e6dc] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 text-[#28705f]" />
            <div>
              <h2 className="font-serif text-xl font-bold text-[#21483e]">
                Manage reader access
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#667b74]">
                Review pending invitations and active reader logins. These
                controls change sign-in access; they do not delete reader
                profiles or reading history.
              </p>
            </div>
          </div>
        </div>

        {invitations.isLoading ? (
          <p className="p-6 text-sm text-[#667b74]" role="status">
            Loading reader access…
          </p>
        ) : invitations.data?.length ? (
          <div className="divide-y divide-[#eceae2]">
            {invitations.data.map((item) => {
              const reader = readers.find(
                (value) => value.id === item.reader_id,
              );
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#edf3ef] text-[#28705f]">
                      <Mail className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#21483e]">
                          {reader?.name ?? "Invited reader"}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
                            item.accepted
                              ? "bg-[#e5f2ec] text-[#276653]"
                              : "bg-[#fff3d8] text-[#8a5b18]",
                          )}
                        >
                          {item.accepted
                            ? "Active access"
                            : "Pending invitation"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[#667b74]">
                        {item.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start text-[#9e4232] hover:bg-[#fbece8] sm:self-auto"
                    onClick={() => {
                      deleteInvitation.reset();
                      setAccessToRemove(item);
                    }}
                  >
                    {item.accepted ? "Revoke access" : "Cancel invitation"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm leading-6 text-[#667b74]">
            No pending invitations or separate reader logins yet.
          </p>
        )}
      </Card>

      {showCreateForm ? (
        <Card className="mb-6 p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#21483e]">
                Add a reader
              </h2>
              <p className="mt-1 text-sm text-[#6a7e77]">
                You can change these details at any time.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close new reader form"
              onClick={() => setShowCreateForm(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <ReaderForm
            submitLabel="Create reader"
            isPending={createMutation.isPending}
            error={createMutation.error}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      ) : null}

      {isLoading ? <ReaderGridSkeleton /> : null}

      {error ? (
        <Card className="border-[#e9b3a6] p-6 text-sm text-[#8b3e2d]">
          Readers could not be loaded. Check the API connection and try again.
        </Card>
      ) : null}

      {!isLoading && !error && readers.length === 0 && !showCreateForm ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#e8efe9] text-[#35675a]">
            <UsersRound className="size-8" />
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#21483e]">
            Add your first reader
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#667b74]">
            Reader profiles keep every child’s library and reading history
            separate.
          </p>
          <Button className="mt-6" onClick={() => setShowCreateForm(true)}>
            <Plus className="size-4" />
            Add reader
          </Button>
        </Card>
      ) : null}

      {!isLoading && readers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {readers.map((reader) =>
            editingReader?.id === reader.id ? (
              <Card key={reader.id} className="p-5 sm:p-6">
                <h2 className="mb-5 font-serif text-xl font-bold text-[#21483e]">
                  Edit {reader.name}
                </h2>
                <ReaderForm
                  reader={reader}
                  submitLabel="Save changes"
                  isPending={updateMutation.isPending}
                  error={updateMutation.error}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingReader(null)}
                />
              </Card>
            ) : (
              <ReaderCard
                key={reader.id}
                reader={reader}
                isSelected={reader.id === selectedReaderId}
                onSelect={() => setSelectedReaderId(reader.id)}
                onEdit={() => setEditingReader(reader)}
                onDelete={() => setDeletingReader(reader)}
              />
            ),
          )}
        </div>
      ) : null}

      {deletingReader ? (
        <DeleteReaderDialog
          key={deletingReader.id}
          reader={deletingReader}
          onDismiss={() => setDeletingReader(null)}
          onDeleted={() => {
            if (selectedReaderId === deletingReader.id) {
              setSelectedReaderId(null);
            }
            setDeletingReader(null);
          }}
        />
      ) : null}

      {accessToRemove ? (
        <RemoveReaderAccessDialog
          invitation={accessToRemove}
          readerName={
            readers.find((reader) => reader.id === accessToRemove.reader_id)
              ?.name
          }
          isPending={deleteInvitation.isPending}
          error={deleteInvitation.error}
          onDismiss={() => {
            deleteInvitation.reset();
            setAccessToRemove(null);
          }}
          onConfirm={async () => {
            await deleteInvitation.mutateAsync(accessToRemove.id);
            setAccessToRemove(null);
          }}
        />
      ) : null}
    </section>
  );
}

function RemoveReaderAccessDialog({
  invitation,
  readerName,
  error,
  isPending,
  onConfirm,
  onDismiss,
}: {
  invitation: ReaderLoginInvitation;
  readerName?: string;
  error: Error | null;
  isPending: boolean;
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}) {
  const isActive = invitation.accepted;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onDismiss();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-reader-access-title"
        className="w-full max-w-md p-6 sm:p-7"
      >
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#fbe8e3] text-[#ad4936]">
          <KeyRound className="size-5" />
        </span>
        <h2
          id="remove-reader-access-title"
          className="font-serif text-2xl font-bold text-[#21483e]"
        >
          {isActive
            ? `Revoke access for ${readerName ?? invitation.email}?`
            : "Cancel this invitation?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#667b74]">
          {isActive
            ? `${invitation.email} will no longer be able to sign in. The reader profile, books, and reading history will remain.`
            : `The activation link sent to ${invitation.email} will no longer grant reader access, and no profile will be created from this invitation.`}
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-[#9e4232]">
            {error.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button
            className="bg-[#b94d38] hover:bg-[#9f3f2d]"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending
              ? isActive
                ? "Revoking…"
                : "Cancelling…"
              : isActive
                ? "Revoke reader access"
                : "Cancel invitation"}
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={onDismiss}>
            {isActive ? "Keep access" : "Keep invitation"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ReaderCard({
  reader,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  reader: Reader;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative p-5 transition-shadow hover:shadow-[0_16px_40px_rgba(35,68,59,0.09)] sm:p-6",
        isSelected && "border-[#dfa260] ring-2 ring-[#f4bd62]/35",
      )}
    >
      {isSelected ? (
        <span className="absolute top-4 right-4 rounded-full bg-[#fff3d8] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#8a5b18] uppercase">
          Selected
        </span>
      ) : null}
      <Avatar reader={reader} />
      <h2 className="mt-4 font-serif text-2xl font-bold text-[#21483e]">
        {reader.name}
      </h2>
      <p className="mt-1 text-sm text-[#71827d]">Reader profile</p>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-[#eeece4] pt-4">
        {!isSelected ? (
          <Button variant="secondary" size="sm" onClick={onSelect}>
            Use profile
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#a34435] hover:bg-[#fbece8]"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

function ReaderForm({
  reader,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  reader?: Reader;
  submitLabel: string;
  isPending: boolean;
  error: Error | null;
  onSubmit: (data: ReaderCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReaderFormValues>({
    resolver: zodResolver(readerFormSchema),
    defaultValues: {
      name: reader?.name ?? "",
      avatar_key:
        (reader?.avatar_key as ReaderFormValues["avatar_key"] | undefined) ??
        "coral",
    },
  });
  const avatarKey = useWatch({ control, name: "avatar_key" });
  const name = useWatch({ control, name: "name" });

  return (
    <form
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="space-y-5"
    >
      <div className="flex items-center gap-4">
        <Avatar name={name || "Reader"} avatarKey={avatarKey} />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`reader-name-${reader?.id ?? "new"}`}
            className="mb-1.5 block text-sm font-semibold text-[#31564c]"
          >
            Name
          </label>
          <input
            id={`reader-name-${reader?.id ?? "new"}`}
            autoFocus
            autoComplete="off"
            {...register("name")}
            className="h-11 w-full rounded-xl border border-[#d7d5c9] bg-[#fcfbf7] px-3.5 text-sm text-[#21483e] outline-none focus:border-[#df6549] focus:ring-3 focus:ring-[#f4bd62]/30"
          />
          {errors.name ? (
            <p className="mt-1.5 text-xs font-medium text-[#aa4432]">
              {errors.name.message}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[#31564c]">
          Profile color
        </legend>
        <div className="flex gap-2.5">
          {AVATARS.map((avatar) => (
            <label key={avatar.key} className="cursor-pointer">
              <input
                type="radio"
                value={avatar.key}
                {...register("avatar_key")}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block size-9 rounded-full border-2 border-white shadow-sm ring-1 ring-[#deddd3] peer-checked:ring-3 peer-checked:ring-[#df6549]",
                  avatar.className,
                )}
              />
              <span className="sr-only">{avatar.key}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-[#9e4232]">
          {error.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteReaderDialog({
  reader,
  onDismiss,
  onDeleted,
}: {
  reader: Reader;
  onDismiss: () => void;
  onDeleted: () => void;
}) {
  const mutation = useDeleteReader();
  const [hasHistory, setHasHistory] = useState(false);

  async function handleDelete(confirmHistory: boolean) {
    try {
      await mutation.mutateAsync({ readerId: reader.id, confirmHistory });
      onDeleted();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setHasHistory(true);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !mutation.isPending) {
          onDismiss();
        }
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-reader-title"
        className="w-full max-w-md p-6 sm:p-7"
      >
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#fbe8e3] text-[#ad4936]">
          <Trash2 className="size-5" />
        </span>
        <h2
          id="delete-reader-title"
          className="font-serif text-2xl font-bold text-[#21483e]"
        >
          Delete {reader.name}?
        </h2>
        {hasHistory ? (
          <p className="mt-3 text-sm leading-6 text-[#8d4234]">
            This profile has books or reading history. Continuing permanently
            deletes that data too.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#667b74]">
            This removes the reader profile. We’ll warn you again before
            deleting any books or reading history linked to it.
          </p>
        )}

        {mutation.error && !hasHistory ? (
          <p role="alert" className="mt-3 text-sm text-[#9e4232]">
            {mutation.error.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button
            className="bg-[#b94d38] hover:bg-[#9f3f2d]"
            disabled={mutation.isPending}
            onClick={() => void handleDelete(hasHistory)}
          >
            {mutation.isPending
              ? "Deleting…"
              : hasHistory
                ? "Delete profile and history"
                : "Delete profile"}
          </Button>
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={onDismiss}
          >
            Keep reader
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Avatar({
  reader,
  name,
  avatarKey,
}: {
  reader?: Reader;
  name?: string;
  avatarKey?: string | null;
}) {
  const displayName = reader?.name ?? name ?? "Reader";
  const key = reader?.avatar_key ?? avatarKey ?? "coral";
  const avatar = AVATARS.find((option) => option.key === key) ?? AVATARS[0];
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold shadow-sm",
        avatar.className,
      )}
      aria-hidden="true"
    >
      {displayName.trim().charAt(0).toUpperCase() || (
        <UserRound className="size-6" />
      )}
    </span>
  );
}

function ReaderGridSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading readers"
    >
      {[0, 1, 2].map((item) => (
        <Card key={item} className="animate-pulse p-6">
          <div className="size-14 rounded-full bg-[#e7e5dc]" />
          <div className="mt-4 h-7 w-32 rounded bg-[#e7e5dc]" />
          <div className="mt-3 h-4 w-24 rounded bg-[#efede6]" />
          <div className="mt-8 h-9 w-40 rounded bg-[#efede6]" />
        </Card>
      ))}
    </div>
  );
}
