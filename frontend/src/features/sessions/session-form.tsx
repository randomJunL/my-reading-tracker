import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Book } from "@/features/books/book-api";
import type {
  ActivityType,
  ReadingSession,
  ReadingSessionCreate,
  ReadingSessionUpdate,
} from "@/features/sessions/session-api";

const activities: { value: ActivityType; label: string }[] = [
  { value: "independent", label: "Independent" },
  { value: "with_adult", label: "With an adult" },
  { value: "read_aloud", label: "Read aloud" },
  { value: "audiobook", label: "Audiobook" },
];

export function SessionForm({
  readerId,
  books,
  session,
  isPending,
  error,
  onCancel,
  onCreate,
  onUpdate,
}: {
  readerId: string;
  books: Book[];
  session?: ReadingSession;
  isPending: boolean;
  error: Error | null;
  onCancel?: () => void;
  onCreate?: (data: ReadingSessionCreate) => Promise<void>;
  onUpdate?: (data: ReadingSessionUpdate) => Promise<void>;
}) {
  const [bookId, setBookId] = useState(session?.book_id ?? books[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(
    session?.session_date ?? localDateValue(new Date()),
  );
  const [minutes, setMinutes] = useState(session?.minutes.toString() ?? "");
  const [startPage, setStartPage] = useState(
    session?.start_page?.toString() ?? "",
  );
  const [endPage, setEndPage] = useState(session?.end_page?.toString() ?? "");
  const [activityType, setActivityType] = useState<ActivityType>(
    session?.activity_type ?? "independent",
  );
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [finishedBook, setFinishedBook] = useState(
    session?.finished_book ?? false,
  );
  const [validation, setValidation] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedMinutes = Number(minutes);
    const parsedStart = startPage === "" ? null : Number(startPage);
    const parsedEnd = endPage === "" ? null : Number(endPage);
    if (
      !bookId ||
      !sessionDate ||
      !Number.isInteger(parsedMinutes) ||
      parsedMinutes <= 0
    ) {
      setValidation("Choose a book, date, and positive number of minutes");
      return;
    }
    if (parsedStart !== null && parsedEnd !== null && parsedEnd < parsedStart) {
      setValidation("End page cannot be before start page");
      return;
    }
    setValidation("");
    const values = {
      session_date: sessionDate,
      minutes: parsedMinutes,
      start_page: parsedStart,
      end_page: parsedEnd,
      activity_type: activityType,
      notes: notes.trim() || null,
      finished_book: finishedBook,
    };
    if (session && onUpdate) {
      await onUpdate(values);
    } else if (onCreate) {
      await onCreate({ ...values, reader_id: readerId, book_id: bookId });
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Book" className="sm:col-span-2">
        <select
          value={bookId}
          onChange={(event) => setBookId(event.target.value)}
          disabled={Boolean(session)}
        >
          <option value="">Choose a book</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input
          type="date"
          value={sessionDate}
          onChange={(event) => setSessionDate(event.target.value)}
        />
      </Field>
      <Field label="Minutes">
        <input
          aria-label="Minutes"
          type="number"
          min="1"
          max="1440"
          inputMode="numeric"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Start page">
        <input
          type="number"
          min="0"
          value={startPage}
          onChange={(event) => setStartPage(event.target.value)}
        />
      </Field>
      <Field label="End page">
        <input
          type="number"
          min="0"
          value={endPage}
          onChange={(event) => setEndPage(event.target.value)}
        />
      </Field>
      <Field label="Reading type" className="sm:col-span-2">
        <select
          value={activityType}
          onChange={(event) =>
            setActivityType(event.target.value as ActivityType)
          }
        >
          {activities.map((activity) => (
            <option key={activity.value} value={activity.value}>
              {activity.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <textarea
          value={notes ?? ""}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm font-semibold text-[#31564c] sm:col-span-2">
        <input
          type="checkbox"
          checked={finishedBook}
          onChange={(event) => setFinishedBook(event.target.checked)}
          className="size-4 accent-[#df6549]"
        />
        Finished this book
      </label>
      {validation || error ? (
        <p role="alert" className="text-sm text-[#a34435] sm:col-span-2">
          {validation || error?.message}
        </p>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : session ? "Save changes" : "Log reading"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-[#31564c]">
        {label}
      </span>
      <span className="[&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#d7d5c9] [&_input]:bg-[#fcfbf7] [&_input]:px-3.5 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#d7d5c9] [&_select]:bg-[#fcfbf7] [&_select]:px-3.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#d7d5c9] [&_textarea]:bg-[#fcfbf7] [&_textarea]:p-3.5">
        {children}
      </span>
    </label>
  );
}

function localDateValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
