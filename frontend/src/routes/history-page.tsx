import { Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBooks } from "@/features/books/book-api";
import { SessionForm } from "@/features/sessions/session-form";
import {
  type ReadingSession,
  useDeleteReadingSession,
  useReadingSessions,
  useUpdateReadingSession,
} from "@/features/sessions/session-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";

const activityLabels = {
  independent: "Independent",
  with_adult: "With an adult",
  read_aloud: "Read aloud",
  audiobook: "Audiobook",
};

export function HistoryPage() {
  const { selectedReaderId } = useReaderSelection();
  const sessions = useReadingSessions(selectedReaderId);
  const books = useBooks(selectedReaderId, "all");
  const update = useUpdateReadingSession();
  const deletion = useDeleteReadingSession();
  const [editing, setEditing] = useState<ReadingSession | null>(null);
  const [deleting, setDeleting] = useState<ReadingSession | null>(null);

  if (!selectedReaderId) {
    return (
      <Card className="p-10 text-center">
        <h1 className="font-serif text-3xl font-bold">Choose a reader first</h1>
        <Link
          to="/readers"
          className="mt-5 inline-block text-sm font-bold text-[#c4543d]"
        >
          Manage readers
        </Link>
      </Card>
    );
  }

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
            Reading log
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold">History</h1>
        </div>
        <Link
          to="/log-reading"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#df6549] px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Log reading
        </Link>
      </div>

      {sessions.isLoading ? (
        <p className="text-sm text-[#687b74]">Loading reading history…</p>
      ) : null}
      {sessions.error ? (
        <p role="alert" className="text-sm text-[#943f30]">
          Reading history could not be loaded.
        </p>
      ) : null}
      {sessions.data?.length === 0 ? (
        <Card className="py-14 text-center">
          <Clock3 className="mx-auto size-10 text-[#6c8b82]" />
          <h2 className="mt-4 font-serif text-2xl font-bold">
            No reading logged yet
          </h2>
          <p className="mt-2 text-sm text-[#687b74]">
            Your first entry only needs a book and the number of minutes.
          </p>
          <Link
            to="/log-reading"
            className="mt-5 inline-block text-sm font-bold text-[#c4543d]"
          >
            Log the first session
          </Link>
        </Card>
      ) : null}

      <div className="space-y-3">
        {sessions.data?.map((session) => (
          <Card
            key={session.id}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e7eee9] text-[#315f53]">
              <Clock3 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl font-bold text-[#21483e]">
                {session.book_title}
              </h2>
              <p className="mt-1 text-sm text-[#687b74]">
                {formatDate(session.session_date)} · {session.minutes} minutes ·{" "}
                {activityLabels[session.activity_type]}
              </p>
              {session.start_page !== null || session.end_page !== null ? (
                <p className="mt-1 text-xs text-[#7a8a85]">
                  Pages {session.start_page ?? "?"}–{session.end_page ?? "?"}
                </p>
              ) : null}
              {session.notes ? (
                <p className="mt-2 text-sm text-[#536d65] italic">
                  “{session.notes}”
                </p>
              ) : null}
              {session.finished_book ? (
                <span className="mt-2 inline-block rounded-full bg-[#fff0d5] px-2.5 py-1 text-[10px] font-bold text-[#8a5b18] uppercase">
                  Finished book
                </span>
              ) : null}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${session.book_title} session`}
                onClick={() => setEditing(session)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${session.book_title} session`}
                className="text-[#a34435]"
                onClick={() => setDeleting(session)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102f29]/55 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-2xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold">
                  Edit reading session
                </h2>
                <p className="mt-1 text-sm text-[#687b74]">
                  Correct the time, pages, activity, or notes.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close edit form"
                onClick={() => setEditing(null)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <SessionForm
              readerId={selectedReaderId}
              books={books.data ?? []}
              session={editing}
              isPending={update.isPending}
              error={update.error}
              onCancel={() => setEditing(null)}
              onUpdate={async (data) => {
                await update.mutateAsync({ sessionId: editing.id, data });
                setEditing(null);
              }}
            />
          </Card>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4">
          <Card role="dialog" aria-modal="true" className="w-full max-w-md p-7">
            <Trash2 className="size-7 text-[#a34435]" />
            <h2 className="mt-4 font-serif text-2xl font-bold">
              Delete this session?
            </h2>
            <p className="mt-3 text-sm text-[#687b74]">
              Remove {deleting.minutes} minutes logged for {deleting.book_title}
              . The book stays in the library.
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                disabled={deletion.isPending}
                onClick={() =>
                  void deletion
                    .mutateAsync(deleting.id)
                    .then(() => setDeleting(null))
                }
              >
                {deletion.isPending ? "Deleting…" : "Delete session"}
              </Button>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
