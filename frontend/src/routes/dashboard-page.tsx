import {
  ArrowRight,
  BookCheck,
  BookOpenText,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import {
  type CalendarReport,
  currentCalendarMonthRange,
  currentMonthRange,
  currentWeekRange,
  type ReportSummary,
  useCalendarReport,
  useReportSummary,
} from "@/features/reports/report-api";
import { useRewardProgress } from "@/features/rewards/reward-api";

export function DashboardPage() {
  const { selectedReaderId } = useReaderSelection();
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const week = useReportSummary(selectedReaderId, currentWeekRange());
  const month = useReportSummary(selectedReaderId, currentMonthRange());
  const calendar = useCalendarReport(
    selectedReaderId,
    currentCalendarMonthRange(calendarMonth),
  );
  const rewards = useRewardProgress(selectedReaderId);

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

  if (week.isLoading || month.isLoading || calendar.isLoading) {
    return <DashboardStatus message="Loading reading progress…" />;
  }
  if (
    week.error ||
    month.error ||
    calendar.error ||
    !week.data ||
    !month.data ||
    !calendar.data
  ) {
    return (
      <DashboardStatus
        message="Reading progress could not be loaded. Please try again."
        isError
      />
    );
  }

  return (
    <DashboardContent
      week={week.data}
      month={month.data}
      calendar={calendar.data}
      selectedCalendarMonth={calendarMonth}
      onCalendarMonthChange={setCalendarMonth}
      rewards={rewards.data}
    />
  );
}

function DashboardContent({
  week,
  month,
  calendar,
  selectedCalendarMonth,
  onCalendarMonthChange,
  rewards,
}: {
  week: ReportSummary;
  month: ReportSummary;
  calendar: CalendarReport;
  selectedCalendarMonth: Date;
  onCalendarMonthChange: (month: Date) => void;
  rewards?: ReturnType<typeof useRewardProgress>["data"];
}) {
  const hasWeeklyReading = week.sessions_count > 0;
  const cards = [
    {
      label: "Reading days this month",
      value: month.reading_days,
      note: `${month.total_minutes} minutes across ${month.sessions_count} ${month.sessions_count === 1 ? "session" : "sessions"}`,
      icon: CalendarCheck2,
      color: "bg-[#e4f0eb] text-[#28705f]",
    },
    {
      label: "Books finished so far",
      value: rewards?.finished_books ?? month.books_finished,
      note: "Every completed book in this reading journey",
      icon: BookCheck,
      color: "bg-[#fff0d5] text-[#a6651c]",
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
        className="grid gap-4 md:grid-cols-2"
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

      {rewards ? (
        <Card className="mt-5 flex flex-col gap-4 bg-[#173f36] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#f4bd62] uppercase">
              Reading rewards
            </p>
            <p className="mt-1 font-serif text-2xl font-bold">
              {rewards.credit_balance} available{" "}
              {rewards.credit_balance === 1 ? "credit" : "credits"}
            </p>
            <p className="mt-1 text-xs text-[#bed0ca]">
              {rewards.current_continuous_days}-day current run ·{" "}
              {rewards.current_week_reading_days} reading days this week
            </p>
          </div>
          <Link
            to="/rewards"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#f4bd62] px-4 text-sm font-bold text-[#173f36]"
          >
            View badges and gifts
          </Link>
        </Card>
      ) : null}

      <MonthlyReadingCalendar
        report={calendar}
        selectedMonth={selectedCalendarMonth}
        onMonthChange={onCalendarMonthChange}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <CurrentBooks books={week.current_books} />
        <RecentActivity sessions={week.recent_activity} />
      </div>
    </div>
  );
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    new Date(2020, month, 1),
  ),
);

function MonthlyReadingCalendar({
  report,
  selectedMonth,
  onMonthChange,
}: {
  report: CalendarReport;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}) {
  const monthStart = parseDate(report.date_from);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const activityByDate = new Map(report.days.map((day) => [day.date, day]));
  const monthName = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const selectedYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();
  const canGoForward =
    selectedYear < currentYear ||
    (selectedYear === currentYear && selectedMonthIndex < currentMonth);
  const earliestYear = Math.min(selectedYear, currentYear - 30);
  const yearOptions = Array.from(
    { length: currentYear - earliestYear + 1 },
    (_, index) => currentYear - index,
  );

  function moveMonth(offset: number) {
    onMonthChange(new Date(selectedYear, selectedMonthIndex + offset, 1));
  }

  function chooseMonth(monthIndex: number) {
    onMonthChange(new Date(selectedYear, monthIndex, 1));
  }

  function chooseYear(nextYear: number) {
    const allowedMonth =
      nextYear === currentYear
        ? Math.min(selectedMonthIndex, currentMonth)
        : selectedMonthIndex;
    onMonthChange(new Date(nextYear, allowedMonth, 1));
  }

  return (
    <Card className="mt-5 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#eceae2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-base font-bold text-[#23443b]">Reading calendar</p>
          <p className="mt-0.5 text-xs text-[#7a8a84]">
            Daily reading minutes for {monthName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
            className="flex size-9 items-center justify-center rounded-lg border border-[#d7d5c9] bg-white text-[#36594f] hover:bg-[#f7f5ef] focus-visible:ring-3 focus-visible:ring-[#f4bd62]/50 focus-visible:outline-none"
          >
            <ChevronLeft className="size-4" />
          </button>
          <label className="sr-only" htmlFor="calendar-month">
            Calendar month
          </label>
          <select
            id="calendar-month"
            aria-label="Calendar month"
            value={selectedMonthIndex}
            onChange={(event) => chooseMonth(Number(event.target.value))}
            className="h-9 rounded-lg border border-[#d7d5c9] bg-white px-2 text-sm font-semibold text-[#294f45] focus:ring-3 focus:ring-[#f4bd62]/50 focus:outline-none"
          >
            {monthNames.map((name, index) => (
              <option
                key={name}
                value={index}
                disabled={selectedYear === currentYear && index > currentMonth}
              >
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="calendar-year">
            Calendar year
          </label>
          <select
            id="calendar-year"
            aria-label="Calendar year"
            value={selectedYear}
            onChange={(event) => chooseYear(Number(event.target.value))}
            className="h-9 rounded-lg border border-[#d7d5c9] bg-white px-2 text-sm font-semibold text-[#294f45] focus:ring-3 focus:ring-[#f4bd62]/50 focus:outline-none"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => moveMonth(1)}
            className="flex size-9 items-center justify-center rounded-lg border border-[#d7d5c9] bg-white text-[#36594f] hover:bg-[#f7f5ef] focus-visible:ring-3 focus-visible:ring-[#f4bd62]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="hidden size-9 items-center justify-center rounded-lg bg-[#fbe5de] text-[#bb583f] lg:flex">
            <CalendarDays className="size-4" />
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid">
          {weekDays.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="pb-2 text-center text-[10px] font-bold tracking-wide text-[#81908b] uppercase sm:text-xs"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: leadingDays }, (_, index) => (
            <div key={`empty-${index}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const dayNumber = index + 1;
            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
            const activity = activityByDate.get(date);

            return (
              <div
                key={date}
                role="gridcell"
                aria-label={
                  activity
                    ? `${formatDate(date)}: ${activity.minutes} reading minutes across ${activity.sessions_count} ${activity.sessions_count === 1 ? "session" : "sessions"}`
                    : `${formatDate(date)}: no reading logged`
                }
                className={`flex min-h-16 flex-col rounded-xl border p-2 sm:min-h-20 sm:p-3 ${
                  activity
                    ? "border-[#b9d8cd] bg-[#e4f0eb] shadow-[inset_0_0_0_1px_rgba(40,112,95,0.05)]"
                    : "border-[#eceae2] bg-[#fbfaf7]"
                }`}
              >
                <span
                  className={`text-xs font-bold sm:text-sm ${activity ? "text-[#245f52]" : "text-[#7f8d88]"}`}
                >
                  {dayNumber}
                </span>
                {activity ? (
                  <span className="mt-auto text-[10px] leading-tight font-bold text-[#28705f] sm:text-xs">
                    {activity.minutes}
                    <span className="ml-0.5 font-medium">min</span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
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

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}
