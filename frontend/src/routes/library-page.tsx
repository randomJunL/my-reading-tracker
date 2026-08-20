import {
  BookOpen,
  Library,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/current-user";
import { BookEditor } from "@/features/books/book-editor";
import {
  type BookRecommendation,
  type BookSearchResult,
  type ReadingStatus,
  bookCreateFromSearchResult,
  useAddRecommendedBookToLibrary,
  useBookRecommendations,
  useBooks,
  useCreateAndAssignBook,
  useCreateBookRecommendation,
  useRemoveBookRecommendation,
  useRemoveFromLibrary,
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

const statusLabels: Record<ReadingStatus, string> = {
  planned: "Want to read",
  reading: "Reading",
  finished: "Finished",
};

export function LibraryPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.is_admin ?? false;
  const { selectedReaderId } = useReaderSelection();
  const [filter, setFilter] = useState<ReadingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<BookSearchResult | "manual" | null>(
    null,
  );
  const [bookToRemove, setBookToRemove] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const books = useBooks(selectedReaderId, filter);
  const recommendations = useBookRecommendations();
  const search = useSearchBooks();
  const create = useCreateAndAssignBook();
  const createRecommendation = useCreateBookRecommendation();
  const removeRecommendation = useRemoveBookRecommendation();
  const removeFromLibrary = useRemoveFromLibrary();
  const addRecommendation = useAddRecommendedBookToLibrary();
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

  async function removeSelectedBook() {
    if (!bookToRemove) return;
    try {
      await removeFromLibrary.mutateAsync({
        readerId: selectedReaderId!,
        bookId: bookToRemove.id,
      });
      setBookToRemove(null);
    } catch {
      // The mutation error remains visible in the confirmation dialog.
    }
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
        {isAdmin ? (
          <Button variant="secondary" onClick={() => setEditing("manual")}>
            <Plus className="size-4" />
            Manual entry
          </Button>
        ) : null}
      </div>

      {isAdmin ? (
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
      ) : null}

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

      {isAdmin && search.data && !editing ? (
        <div className="mb-8">
          <h2 className="mb-3 font-serif text-2xl font-bold">Search results</h2>
          {search.data.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {search.data.map((result, index) => {
                const alreadyRecommended = recommendations.data?.some(
                  ({ book }) =>
                    book.metadata_source === result.source &&
                    book.external_source_id === result.external_source_id,
                );
                return (
                  <article
                    key={`${result.source}-${result.external_source_id ?? `${result.title}-${index}`}`}
                    className="flex gap-4 rounded-2xl border border-[#deddd3] bg-white p-4 text-left"
                  >
                    <BookCover title={result.title} url={result.cover_url} />
                    <div className="min-w-0 flex-1">
                      <strong className="block font-serif text-lg text-[#21483e]">
                        {result.title}
                      </strong>
                      <span className="mt-1 block text-sm text-[#687b74]">
                        {(result.authors ?? []).join(", ") || "Unknown author"}
                      </span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          aria-label={`Review and add ${result.title}`}
                          onClick={() => setEditing(result)}
                        >
                          Add to reader
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={
                            alreadyRecommended || createRecommendation.isPending
                          }
                          onClick={() =>
                            createRecommendation.mutate({
                              book: bookCreateFromSearchResult(result),
                              note: null,
                            })
                          }
                        >
                          {alreadyRecommended ? "Recommended" : "Recommend"}
                        </Button>
                      </div>
                      {createRecommendation.error &&
                      createRecommendation.variables?.book
                        .external_source_id === result.external_source_id ? (
                        <span className="mt-2 block text-xs text-[#943f30]">
                          {createRecommendation.error.message}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#687b74]">
              No matches found. Try another search or use manual entry.
            </p>
          )}
        </div>
      ) : null}

      <section
        className="mb-10 rounded-[26px] border border-[#ead8a8] bg-[#fff8e6] p-5 shadow-[0_12px_35px_rgba(126,91,29,0.06)] sm:p-6"
        aria-labelledby="recommendations-heading"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#a9671d]">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#f4bd62]/35">
                <Sparkles className="size-4" />
              </span>
              <p className="text-xs font-bold tracking-[0.14em] uppercase">
                Browse teacher &amp; admin picks
              </p>
            </div>
            <h2
              id="recommendations-heading"
              className="mt-2 font-serif text-3xl font-bold text-[#5d431d]"
            >
              Recommended books
            </h2>
            <p className="mt-1 text-sm text-[#786342]">
              {isAdmin
                ? "Search above and choose Recommend to manage this shared list."
                : "Choose a recommended book and add it to your library."}
            </p>
          </div>
        </div>

        {recommendations.isLoading ? (
          <p className="text-sm text-[#687b74]">Loading recommendations…</p>
        ) : null}
        {recommendations.error ? (
          <p role="alert" className="text-sm text-[#943f30]">
            Recommendations could not be loaded. Please try again.
          </p>
        ) : null}
        {recommendations.data?.length === 0 ? (
          <Card className="border-dashed p-6 text-center">
            <p className="font-serif text-lg font-bold text-[#31564c]">
              No recommendations yet
            </p>
            <p className="mt-1 text-sm text-[#687b74]">
              Search for a book, then choose Recommend on its result card.
            </p>
          </Card>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recommendations.data?.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              readerId={selectedReaderId}
              isAdding={addRecommendation.isPending}
              addError={
                addRecommendation.variables?.bookId === recommendation.book_id
                  ? addRecommendation.error
                  : null
              }
              onAdd={(status) =>
                addRecommendation.mutateAsync({
                  readerId: selectedReaderId,
                  bookId: recommendation.book_id,
                  status,
                })
              }
              onRemove={() => removeRecommendation.mutate(recommendation.id)}
              canManage={isAdmin}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="my-library-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#d9ded8] pb-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#dfeae5] text-[#315f53]">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#527068] uppercase">
                Selected reader’s collection
              </p>
              <h2
                id="my-library-heading"
                className="mt-1 font-serif text-3xl font-bold text-[#173f36]"
              >
                My library
              </h2>
              <p className="mt-1 text-sm text-[#687b74]">
                Books already added to this reader’s personal library.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${filter === item.value ? "bg-[#173f36] text-white" : "border border-[#d9ded8] bg-white text-[#49675f]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
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
              {isAdmin
                ? "Search above or add a book manually."
                : "Choose a book from the recommended collection above."}
            </p>
          </Card>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.data?.map((book) => {
            const assignment = book.reader_books?.find(
              (item) => item.reader_id === selectedReaderId,
            );
            return (
              <Card
                key={book.id}
                className="relative flex gap-4 border-[#d7dfda] bg-white p-4 shadow-[0_10px_28px_rgba(35,68,59,0.05)]"
              >
                <Link to={`/library/${book.id}`}>
                  <BookCover title={book.title} url={book.cover_url} />
                </Link>
                <div className="min-w-0 flex-1 pr-6">
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
                <button
                  type="button"
                  aria-label={`Remove ${book.title} from library`}
                  title="Remove from library"
                  onClick={() =>
                    setBookToRemove({ id: book.id, title: book.title })
                  }
                  className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[#87958f] hover:bg-[#f7e9e5] hover:text-[#a34435]"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      {bookToRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-book-heading"
            className="max-w-md p-7"
          >
            <Trash2 className="size-8 text-[#a34435]" />
            <h2
              id="remove-book-heading"
              className="mt-4 font-serif text-2xl font-bold"
            >
              Remove {bookToRemove.title}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#687b74]">
              This removes the book from the selected reader’s library. It
              remains available to other readers and in the recommendation pool.
            </p>
            {removeFromLibrary.error ? (
              <p role="alert" className="mt-3 text-sm text-[#943f30]">
                {removeFromLibrary.error.message}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <Button
                disabled={removeFromLibrary.isPending}
                onClick={() => void removeSelectedBook()}
              >
                {removeFromLibrary.isPending ? "Removing…" : "Remove book"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  removeFromLibrary.reset();
                  setBookToRemove(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function RecommendationCard({
  recommendation,
  readerId,
  isAdding,
  addError,
  onAdd,
  onRemove,
  canManage,
}: {
  recommendation: BookRecommendation;
  readerId: string;
  isAdding: boolean;
  addError: Error | null;
  onAdd: (status: ReadingStatus) => Promise<unknown>;
  onRemove: () => void;
  canManage: boolean;
}) {
  const [status, setStatus] = useState<ReadingStatus>("planned");
  const assignment = recommendation.book.reader_books?.find(
    (item) => item.reader_id === readerId,
  );

  return (
    <Card className="relative flex gap-4 border-[#e2c77e] bg-white p-4 shadow-[0_10px_25px_rgba(126,91,29,0.08)]">
      <BookCover
        title={recommendation.book.title}
        url={recommendation.book.cover_url}
      />
      <div className="min-w-0 flex-1 pr-6">
        <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#fff0c7] px-2 py-1 text-[10px] font-bold tracking-wide text-[#8a5b18] uppercase">
          <Sparkles className="size-3" />
          Recommended pick
        </p>
        <h3 className="font-serif text-xl font-bold text-[#21483e]">
          {recommendation.book.title}
        </h3>
        <p className="mt-1 truncate text-sm text-[#687b74]">
          {(recommendation.book.authors ?? []).join(", ") || "Unknown author"}
        </p>
        {recommendation.note ? (
          <p className="mt-2 text-xs leading-relaxed text-[#596f68]">
            {recommendation.note}
          </p>
        ) : null}

        {assignment ? (
          <p className="mt-4 inline-flex rounded-full bg-[#e3eee9] px-3 py-1.5 text-xs font-bold text-[#315f53]">
            In library · {statusLabels[assignment.status]}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              aria-label={`Add ${recommendation.book.title} as`}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ReadingStatus)
              }
              className="rounded-lg border border-[#d7d5c9] bg-white px-2 py-1.5 text-xs font-semibold"
            >
              <option value="planned">Want to read</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
            <Button
              size="sm"
              disabled={isAdding}
              onClick={() => void onAdd(status)}
            >
              {isAdding ? "Adding…" : "Add to library"}
            </Button>
          </div>
        )}
        {addError ? (
          <p role="alert" className="mt-2 text-xs text-[#943f30]">
            {addError.message}
          </p>
        ) : null}
      </div>
      {canManage ? (
        <button
          type="button"
          aria-label={`Remove ${recommendation.book.title} from recommendations`}
          title="Remove recommendation"
          onClick={onRemove}
          className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[#87958f] hover:bg-[#f7e9e5] hover:text-[#a34435]"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </Card>
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
