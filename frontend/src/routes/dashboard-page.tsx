import {
  ArrowRight,
  BookCheck,
  BookOpenText,
  CalendarDays,
  Clock3,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import {
  currentMonthRange,
  currentWeekRange,
  type ReportSummary,
  useReportSummary,
} from "@/features/reports/report-api";

export function DashboardPage() {
  const { selectedReaderId } = useReaderSelection();
  const week = useReportSummary(selectedReaderId, currentWeekRange());
  const month = useReportSummary(selectedReaderId, currentMonthRange());

  if (!selectedReaderId) {
    return (
      <Card className="p-10 text-center">
        <h1 className="font-serif text-3xl font-bold">Choose a reader first</h1>
        <p className="mt-2 text-sm text-[#687b74]">
          Select a reader to see their progress and recent activity.
        </p>
        <Link
          to="/readers"
          className="mt-5 inline-block text-sm font-bold text-[#c4543d]"
        >
          Manage readers
        </Link>
      </Card>
    );
  }

  if (week.isLoading || month.isLoading) {
    return <DashboardStatus message="Loading reading progress…" />;
  }
  if (week.error || month.error || !week.data || !month.data) {
    return (
      <DashboardStatus
        message="Reading progress could not be loaded. Please try again."
        isError
      />
    );
  }

  return <DashboardContent week={week.data} month={month.data} />;
}

function DashboardContent({
  week,
  month,
}: {
  week: ReportSummary;
  month: ReportSummary;
}) {
  const hasWeeklyReading = week.sessions_count > 0;
  const cards = [
    {
      label: "Minutes this week",
      value: week.total_minutes,
      note: `${week.sessions_count} reading ${week.sessions_count === 1 ? "session" : "sessions"}`,
      icon: Clock3,
      color: "bg-[#e4f0eb] text-[#28705f]",
    },
    {
      label: "Pages this week",
      value: week.pages_read,
      note: `${week.reading_days} reading ${week.reading_days === 1 ? "day" : "days"}`,
      icon: BookOpenText,
      color: "bg-[#fff0d5] text-[#a6651c]",
    },
    {
      label: "Minutes this month",
      value: month.total_minutes,
      note: `${month.books_finished} ${month.books_finished === 1 ? "book" : "books"} finished`,
      icon: CalendarDays,
      color: "bg-[#fbe5de] text-[#bb583f]",
    },
  ];

  return (
    <div className="animate-[fade-in_400ms_ease-out]">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
            Reading dashboard
          </p>
          <h1 className="mt-2 max-w-2xl font-serif text-[38px] leading-[1.08] font-bold tracking-[-0.035em] text-[#173f36] sm:text-[46px]">
            {hasWeeklyReading
              ? "A good week of reading"
              : "Ready for a new reading week"}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#667972]">
            {hasWeeklyReading
              ? `${week.reading_days} reading ${week.reading_days === 1 ? "day" : "days"} and ${week.total_minutes} minutes logged so far this week.`
              : "No sessions are logged this week yet. Current books and earlier activity are still shown below."}
          </p>
        </div>
        <Link
          to="/history"
          className="inline-flex h-11 items-center gap-2 self-start rounded-xl border border-[#d7d5c9] bg-white px-4 text-sm font-semibold text-[#23443b] hover:bg-[#f7f5ef] sm:self-auto"
        >
          View full history
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <section
        aria-label="Reading summary"
        className="grid gap-4 md:grid-cols-3"
      >
        {cards.map(({ label, value, note, icon: Icon, color }) => (
          <Card key={label} className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b7e77]">{label}</p>
                <p className="mt-2 font-serif text-[38px] leading-none font-bold tracking-[-0.03em] text-[#173f36]">
                  {value}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${color}`}>
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-xs font-medium text-[#71827c]">{note}</p>
          </Card>
        ))}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <CurrentBooks books={week.current_books} />
        <RecentActivity sessions={week.recent_activity} />
      </div>
    </div>
  );
}

function CurrentBooks({ books }: { books: ReportSummary["current_books"] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Continue reading"
        note={`${books.length} ${books.length === 1 ? "book" : "books"} in progress`}
        link="/library"
        linkLabel="View library"
      />
      {books.length === 0 ? (
        <EmptyPanel
          icon={<BookOpenText className="size-7" />}
          title="No books in progress"
          detail="Mark a library book as reading or log a session to begin tracking progress."
        />
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          {books.map((book) => (
            <article
              key={book.book_id}
              className="flex min-w-0 gap-4 rounded-2xl bg-[#f2f5ee] p-4"
            >
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt=""
                  className="h-28 w-[76px] shrink-0 rounded-lg object-cover shadow-md"
                />
              ) : (
                <div className="flex h-28 w-[76px] shrink-0 items-center justify-center rounded-lg bg-[#2f7868] text-white shadow-md">
                  <BookOpenText className="size-6" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col py-1">
                <p className="text-xs font-bold tracking-[0.1em] text-[#578077] uppercase">
                  Current book
                </p>
                <h2 className="mt-2 line-clamp-2 font-serif text-base leading-tight font-bold text-[#1e4037]">
                  {book.title}
                </h2>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-[#60756e]">
                    <span>
                      {book.last_page === null
                        ? "No page logged"
                        : `Page ${book.last_page}`}
                    </span>
                    <span>
                      {book.progress_percent === null
                        ? "—"
                        : `${book.progress_percent}%`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#d7e2dc]">
                    <div
                      className="h-full rounded-full bg-[#df6549]"
                      style={{ width: `${book.progress_percent ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentActivity({
  sessions,
}: {
  sessions: ReportSummary["recent_activity"];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Recent activity"
        note="The latest reading moments"
        link="/history"
        linkLabel="View all"
      />
      {sessions.length === 0 ? (
        <EmptyPanel
          icon={<Clock3 className="size-7" />}
          title="No activity yet"
          detail="Logged reading sessions will appear here."
        />
      ) : (
        <div className="divide-y divide-[#eeece5] px-5 sm:px-6">
          {sessions.map((session) => (
            <article key={session.id} className="flex gap-3 py-4">
              <span className="mt-0.5 rounded-xl bg-[#e4f0eb] p-2.5 text-[#28705f]">
                {session.finished_book ? (
                  <BookCheck className="size-4" />
                ) : (
                  <Clock3 className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#274a41]">
                  {session.finished_book
                    ? "Finished a book"
                    : "Reading session"}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#70817b]">
                  {session.book_title} · {session.minutes} minutes
                  {session.pages_read > 0
                    ? ` · ${session.pages_read} pages`
                    : ""}
                </p>
                <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#99a49f] uppercase">
                  {formatDate(session.session_date)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function CardHeader({
  title,
  note,
  link,
  linkLabel,
}: {
  title: string;
  note: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#eceae2] px-5 py-4 sm:px-6">
      <div>
        <p className="text-base font-bold text-[#23443b]">{title}</p>
        <p className="mt-0.5 text-xs text-[#7a8a84]">{note}</p>
      </div>
      <Link to={link} className="text-xs font-bold text-[#42645b]">
        {linkLabel}
      </Link>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="px-6 py-12 text-center text-[#648078]">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#edf2ee]">
        {icon}
      </span>
      <p className="mt-3 font-serif text-lg font-bold text-[#23443b]">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5">{detail}</p>
    </div>
  );
}

function DashboardStatus({
  message,
  isError = false,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <Card className="p-10 text-center">
      <p
        role={isError ? "alert" : undefined}
        className={isError ? "text-[#943f30]" : "text-[#687b74]"}
      >
        {message}
      </p>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
