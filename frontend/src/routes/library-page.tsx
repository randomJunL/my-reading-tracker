import { BookOpen, Library, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookEditor } from "@/features/books/book-editor";
import {
  type BookSearchResult,
  type ReadingStatus,
  useBooks,
  useCreateAndAssignBook,
  useSearchBooks,
  useUpdateBookStatus,
} from "@/features/books/book-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";

const filters: { value: ReadingStatus | "all"; label: string }[] = [
  { value: "all", label: "All books" },
  { value: "reading", label: "Reading" },
  { value: "planned", label: "Want to read" },
  { value: "finished", label: "Finished" },
];

export function LibraryPage() {
  const { selectedReaderId } = useReaderSelection();
  const [filter, setFilter] = useState<ReadingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<BookSearchResult | "manual" | null>(
    null,
  );
  const books = useBooks(selectedReaderId, filter);
  const search = useSearchBooks();
  const create = useCreateAndAssignBook();
  const statusMutation = useUpdateBookStatus();

  if (!selectedReaderId) {
    return (
      <Card className="p-10 text-center">
        <Library className="mx-auto size-10 text-[#4d7167]" />
        <h1 className="mt-4 font-serif text-3xl font-bold">
          Choose or add a reader first
        </h1>
        <Link
          to="/readers"
          className="mt-5 inline-block text-sm font-bold text-[#c4543d]"
        >
          Manage readers
        </Link>
      </Card>
    );
  }

  async function saveBook(
    data: Parameters<typeof create.mutateAsync>[0]["data"],
    status: ReadingStatus,
  ) {
    await create.mutateAsync({ readerId: selectedReaderId!, data, status });
    setEditing(null);
    search.reset();
    setQuery("");
  }

  return (
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
            Selected reader’s collection
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
            Library
          </h1>
        </div>
        <Button variant="secondary" onClick={() => setEditing("manual")}>
          <Plus className="size-4" />
          Manual entry
        </Button>
      </div>

      <Card className="mb-6 p-5 sm:p-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) search.mutate(query.trim());
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Search books</span>
            <Search className="absolute top-3.5 left-3.5 size-4 text-[#74857f]" />
            <input
              aria-label="Search books"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, or ISBN"
              className="h-11 w-full rounded-xl border border-[#d7d5c9] bg-[#fcfbf7] pr-3 pl-10"
            />
          </label>
          <Button type="submit" disabled={search.isPending}>
            {search.isPending ? "Searching…" : "Search"}
          </Button>
        </form>
      </Card>

      {search.error ? (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-[#fbece8] p-4 text-sm text-[#943f30]"
        >
          {search.error.message} You can try again or use manual entry.
        </p>
      ) : null}

      {editing ? (
        <Card className="mb-6 p-5 sm:p-7">
          <div className="mb-5 flex justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold">
                {editing === "manual"
                  ? "Add a book manually"
                  : "Review book details"}
              </h2>
              <p className="mt-1 text-sm text-[#687b74]">
                Correct anything before saving it to this reader’s library.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close book form"
              onClick={() => setEditing(null)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <BookEditor
            source={editing === "manual" ? undefined : editing}
            isPending={create.isPending}
            error={create.error}
            onCancel={() => setEditing(null)}
            onSave={saveBook}
          />
        </Card>
      ) : null}

      {search.data && !editing ? (
        <div className="mb-8">
          <h2 className="mb-3 font-serif text-2xl font-bold">Search results</h2>
          {search.data.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {search.data.map((result) => (
                <button
                  type="button"
                  key={`${result.source}-${result.external_source_id}`}
                  onClick={() => setEditing(result)}
                  className="flex cursor-pointer gap-4 rounded-2xl border border-[#deddd3] bg-white p-4 text-left hover:border-[#dfa260]"
                >
                  <BookCover title={result.title} url={result.cover_url} />
                  <span>
                    <strong className="block font-serif text-lg text-[#21483e]">
                      {result.title}
                    </strong>
                    <span className="mt-1 block text-sm text-[#687b74]">
                      {(result.authors ?? []).join(", ") || "Unknown author"}
                    </span>
                    <span className="mt-2 block text-xs font-bold text-[#c65c43]">
                      Review and add
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#687b74]">
              No matches found. Try another search or use manual entry.
            </p>
          )}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${filter === item.value ? "bg-[#173f36] text-white" : "bg-white text-[#49675f]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {books.isLoading ? (
        <p className="text-sm text-[#687b74]">Loading library…</p>
      ) : null}
      {books.error ? (
        <p role="alert" className="mb-5 text-sm text-[#943f30]">
          The library could not be loaded. Please try again.
        </p>
      ) : null}
      {books.data?.length === 0 ? (
        <Card className="py-12 text-center">
          <BookOpen className="mx-auto size-9 text-[#719087]" />
          <h2 className="mt-3 font-serif text-2xl font-bold">
            No books here yet
          </h2>
          <p className="mt-2 text-sm text-[#687b74]">
            Search above or add a book manually.
          </p>
        </Card>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {books.data?.map((book) => {
          const assignment = book.reader_books?.find(
            (item) => item.reader_id === selectedReaderId,
          );
          return (
            <Card key={book.id} className="flex gap-4 p-4">
              <Link to={`/library/${book.id}`}>
                <BookCover title={book.title} url={book.cover_url} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/library/${book.id}`}
                  className="font-serif text-xl font-bold text-[#21483e] hover:text-[#c4543d]"
                >
                  {book.title}
                </Link>
                <p className="mt-1 truncate text-sm text-[#687b74]">
                  {(book.authors ?? []).join(", ") || "Unknown author"}
                </p>
                <select
                  aria-label={`Status for ${book.title}`}
                  value={assignment?.status ?? "planned"}
                  onChange={(e) =>
                    statusMutation.mutate({
                      readerId: selectedReaderId,
                      bookId: book.id,
                      status: e.target.value as ReadingStatus,
                    })
                  }
                  className="mt-4 rounded-lg border border-[#d7d5c9] bg-[#faf9f4] px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="planned">Want to read</option>
                  <option value="reading">Reading</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function BookCover({
  title,
  url,
}: {
  title: string;
  url?: string | null;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className="h-28 w-20 shrink-0 rounded-lg bg-[#e9e5da] object-cover shadow-sm"
    />
  ) : (
    <span className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-[#e5ece8] px-2 text-center font-serif text-xs font-bold text-[#45665d]">
      {title}
    </span>
  );
}
