import { ArrowLeft, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { useBooks } from "@/features/books/book-api";
import { SessionForm } from "@/features/sessions/session-form";
import {
  useCreateReadingSession,
  useReadingSessions,
} from "@/features/sessions/session-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import {
  getRewardProgress,
  useRewardProgress,
} from "@/features/rewards/reward-api";

export function LogReadingPage() {
  const navigate = useNavigate();
  const { selectedReaderId } = useReaderSelection();
  const books = useBooks(selectedReaderId, "all");
  const recentSessions = useReadingSessions(selectedReaderId);
  const create = useCreateReadingSession();
  const rewards = useRewardProgress(selectedReaderId);
  const orderedBooks = orderBooksByRecentSessions(
    books.data ?? [],
    recentSessions.data ?? [],
  );

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
    <section className="mx-auto max-w-2xl">
      <Link
        to="/history"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#49675f]"
      >
        <ArrowLeft className="size-4" />
        Reading history
      </Link>
      <Card className="p-5 sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
          Quick entry
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-[#173f36]">
          Log reading
        </h1>
        <p className="mt-2 text-sm text-[#687b74]">
          Pick a book, enter the minutes, and save. Today and independent
          reading are preselected.
        </p>
        {orderedBooks.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-[#eef2ed] p-6 text-center">
            <BookOpen className="mx-auto size-8 text-[#56766d]" />
            <p className="mt-3 text-sm text-[#587068]">
              Add a book to this reader’s library before logging a session.
            </p>
            <Link
              to="/library"
              className="mt-3 inline-block text-sm font-bold text-[#c4543d]"
            >
              Open library
            </Link>
          </div>
        ) : (
          <div className="mt-7">
            <SessionForm
              readerId={selectedReaderId}
              books={orderedBooks}
              isPending={create.isPending}
              error={create.error}
              onCreate={async (data) => {
                const previouslyEarned = new Set(
                  rewards.data?.badges
                    .filter((badge) => badge.earned)
                    .map((badge) => badge.code) ?? [],
                );
                await create.mutateAsync(data);
                let newBadges: string[] = [];
                try {
                  const updated = await getRewardProgress(selectedReaderId);
                  newBadges = updated.badges
                    .filter(
                      (badge) =>
                        badge.earned && !previouslyEarned.has(badge.code),
                    )
                    .map((badge) => badge.name);
                } catch {
                  // The reading session is already safely stored. A temporary
                  // reward-summary failure should not invite a duplicate entry.
                }
                void navigate(newBadges.length ? "/rewards" : "/history", {
                  state: { newBadges },
                });
              }}
            />
          </div>
        )}
      </Card>
    </section>
  );
}

function orderBooksByRecentSessions<
  TBook extends { id: string },
  TSession extends { book_id: string },
>(books: TBook[], sessions: TSession[]) {
  const recentPosition = new Map<string, number>();
  for (const readingSession of sessions) {
    if (!recentPosition.has(readingSession.book_id)) {
      recentPosition.set(readingSession.book_id, recentPosition.size);
    }
  }
  return [...books].sort((first, second) => {
    const firstPosition =
      recentPosition.get(first.id) ?? Number.MAX_SAFE_INTEGER;
    const secondPosition =
      recentPosition.get(second.id) ?? Number.MAX_SAFE_INTEGER;
    return firstPosition - secondPosition;
  });
}
