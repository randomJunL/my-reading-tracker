import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useBook,
  useDeleteBook,
  useRemoveFromLibrary,
} from "@/features/books/book-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import { BookCover } from "@/routes/library-page";

export function BookDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { selectedReaderId } = useReaderSelection();
  const { data: book, isLoading } = useBook(bookId);
  const remove = useRemoveFromLibrary();
  const deletion = useDeleteBook();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  if (isLoading) return <p>Loading book…</p>;
  if (!book) return <Card className="p-8">Book not found.</Card>;
  const assignment = book.reader_books?.find(
    (item) => item.reader_id === selectedReaderId,
  );

  async function deleteEverywhere() {
    try {
      await deletion.mutateAsync({
        bookId: book!.id,
        confirmHistory: hasHistory,
      });
      void navigate("/library");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409)
        setHasHistory(true);
    }
  }

  return (
    <section>
      <Link
        to="/library"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#49675f]"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-7 sm:flex-row">
          <BookCover title={book.title} url={book.cover_url} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wider text-[#c65c43] uppercase">
              {assignment?.status?.replace("planned", "Want to read") ??
                "Household book"}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-bold text-[#173f36]">
              {book.title}
            </h1>
            {book.subtitle ? (
              <p className="mt-2 text-lg text-[#506a63]">{book.subtitle}</p>
            ) : null}
            <p className="mt-3 text-sm text-[#687b74]">
              {(book.authors ?? []).join(", ") || "Unknown author"}
            </p>
            <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-3">
              <Info label="Publisher" value={book.publisher} />
              <Info label="Published" value={book.published_date} />
              <Info label="Pages" value={book.page_count?.toString()} />
            </dl>
            {book.description ? (
              <p className="mt-7 max-w-3xl text-sm leading-7 text-[#536d65]">
                {book.description}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-2">
              {assignment && selectedReaderId ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void remove
                      .mutateAsync({
                        readerId: selectedReaderId,
                        bookId: book.id,
                      })
                      .then(() => navigate("/library"))
                  }
                >
                  Remove from this reader
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="text-[#a34435]"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete book everywhere
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4">
          <Card role="dialog" aria-modal="true" className="max-w-md p-7">
            <BookOpen className="size-8 text-[#a34435]" />
            <h2 className="mt-4 font-serif text-2xl font-bold">
              Delete {book.title}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#687b74]">
              {hasHistory
                ? "This book has reading history. Continuing permanently deletes those sessions too."
                : "This removes the book from every reader in this household. If reading history exists, you’ll be warned again."}
            </p>
            {deletion.error && !hasHistory ? (
              <p role="alert" className="mt-3 text-sm text-[#943f30]">
                {deletion.error.message}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <Button
                disabled={deletion.isPending}
                onClick={() => void deleteEverywhere()}
              >
                {hasHistory ? "Delete book and history" : "Delete book"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-bold text-[#31564c]">{label}</dt>
      <dd className="mt-1 text-[#687b74]">{value || "Not provided"}</dd>
    </div>
  );
}
