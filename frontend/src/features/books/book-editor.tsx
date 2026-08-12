import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  BookCreate,
  BookSearchResult,
  ReadingStatus,
} from "@/features/books/book-api";

export function BookEditor({
  source,
  isPending,
  error,
  onCancel,
  onSave,
}: {
  source?: BookSearchResult;
  isPending: boolean;
  error: Error | null;
  onCancel: () => void;
  onSave: (book: BookCreate, status: ReadingStatus) => Promise<void>;
}) {
  const [title, setTitle] = useState(source?.title ?? "");
  const [authors, setAuthors] = useState((source?.authors ?? []).join(", "));
  const [coverUrl, setCoverUrl] = useState(source?.cover_url ?? "");
  const [publisher, setPublisher] = useState(source?.publisher ?? "");
  const [publishedDate, setPublishedDate] = useState(
    source?.published_date ?? "",
  );
  const [pageCount, setPageCount] = useState(
    source?.page_count?.toString() ?? "",
  );
  const [status, setStatus] = useState<ReadingStatus>("planned");
  const [validation, setValidation] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setValidation("Enter a book title");
      return;
    }
    await onSave(
      {
        title: title.trim(),
        subtitle: source?.subtitle ?? null,
        authors: authors
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        isbn_10: source?.isbn_10 ?? null,
        isbn_13: source?.isbn_13 ?? null,
        cover_url: coverUrl.trim() || null,
        publisher: publisher.trim() || null,
        published_date: publishedDate.trim() || null,
        page_count: pageCount ? Number(pageCount) : null,
        description: source?.description ?? null,
        language: source?.language ?? null,
        metadata_source: source?.source ?? "manual",
        external_source_id: source?.external_source_id ?? null,
      },
      status,
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Title" className="sm:col-span-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Authors (comma separated)" className="sm:col-span-2">
        <input value={authors} onChange={(e) => setAuthors(e.target.value)} />
      </Field>
      <Field label="Cover URL" className="sm:col-span-2">
        <input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          type="url"
        />
      </Field>
      <Field label="Publisher">
        <input
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
        />
      </Field>
      <Field label="Published date">
        <input
          value={publishedDate}
          onChange={(e) => setPublishedDate(e.target.value)}
        />
      </Field>
      <Field label="Page count">
        <input
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          type="number"
          min="1"
        />
      </Field>
      <Field label="Add as">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReadingStatus)}
        >
          <option value="planned">Want to read</option>
          <option value="reading">Reading now</option>
          <option value="finished">Finished</option>
        </select>
      </Field>
      {validation || error ? (
        <p role="alert" className="text-sm text-[#a34435] sm:col-span-2">
          {validation || error?.message}
        </p>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save to library"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
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
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-[#31564c]">
        {label}
      </span>
      <span className="[&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#d7d5c9] [&_input]:bg-[#fcfbf7] [&_input]:px-3.5 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#d7d5c9] [&_select]:bg-[#fcfbf7] [&_select]:px-3.5">
        {children}
      </span>
    </label>
  );
}
