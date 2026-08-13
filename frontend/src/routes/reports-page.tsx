import {
  Archive,
  Award,
  BookCheck,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ExportFormat,
  useReadingDataExport,
  useSchoolReportExport,
} from "@/features/exports/export-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";

const exportOptions = [
  {
    format: "csv" as const,
    title: "Reading history",
    description:
      "Every logged session with its date, reader, book, minutes, pages, activity, and notes.",
    button: "Download reading history CSV",
    icon: FileSpreadsheet,
    color: "bg-[#e4f0eb] text-[#28705f]",
  },
  {
    format: "finished-books-csv" as const,
    title: "Finished books",
    description:
      "One row per completed book with finish date, total reading time, pages, sessions, and reading dates.",
    button: "Download finished books CSV",
    icon: BookCheck,
    color: "bg-[#fbe5de] text-[#aa513d]",
  },
];

export function ReportsPage() {
  const { selectedReaderId } = useReaderSelection();
  const download = useReadingDataExport();
  const schoolReport = useSchoolReportExport();
  const defaultRange = schoolYearToDate();
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);

  function startDownload(format: ExportFormat) {
    download.reset();
    download.mutate(format);
  }

  function startSchoolReport() {
    if (!selectedReaderId) return;
    schoolReport.reset();
    schoolReport.mutate({ readerId: selectedReaderId, dateFrom, dateTo });
  }

  return (
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-7">
        <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
          Reports and exports
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
          Export reading data
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687b74]">
          Create a printable reader report, or download raw spreadsheet data for
          further work in Excel, Numbers, or Google Sheets.
        </p>
      </div>

      {download.error ? (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[#fbece8] p-4 text-sm text-[#943f30]"
        >
          The export could not be prepared. Your saved data is unchanged; please
          try again.
        </p>
      ) : null}

      {schoolReport.error ? (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[#fbece8] p-4 text-sm text-[#943f30]"
        >
          The school report could not be prepared. Please check the reporting
          dates and try again.
        </p>
      ) : null}

      <Card className="mb-5 overflow-hidden border-[#173f36] bg-[#173f36] text-white">
        <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f4bd62] text-[#173f36]">
              <Award className="size-6" />
            </span>
            <p className="mt-5 text-xs font-bold tracking-[0.14em] text-[#f4bd62] uppercase">
              Downloading PDF
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold">
              Reading achievement report
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c6d5d0]">
              Create a polished, printable report with the reader name,
              reporting period, reading minutes, active days, consecutive-day
              streak, completed books, pages, and sessions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[390px]">
            <label className="text-xs font-semibold text-[#dce7e3]">
              Report start
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#54766d] bg-white px-3 text-sm text-[#173f36] focus:ring-3 focus:ring-[#f4bd62]/50 focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-[#dce7e3]">
              Report end
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={todayLocal()}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#54766d] bg-white px-3 text-sm text-[#173f36] focus:ring-3 focus:ring-[#f4bd62]/50 focus:outline-none"
              />
            </label>
            <Button
              className="mt-1 sm:col-span-2"
              disabled={
                !selectedReaderId ||
                schoolReport.isPending ||
                !dateFrom ||
                !dateTo ||
                dateFrom > dateTo
              }
              onClick={startSchoolReport}
            >
              <Printer className="size-4" />
              {schoolReport.isPending
                ? "Creating printable report…"
                : "Download printable PDF"}
            </Button>
            {!selectedReaderId ? (
              <p className="text-xs text-[#f4bd62] sm:col-span-2">
                Select a reader first to create their school report.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="mx-auto w-full max-w-6xl overflow-hidden">
        <div className="border-b border-[#eceae2] bg-[#faf8f2] px-6 py-6 text-center sm:px-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[#416b60] shadow-sm ring-1 ring-[#dfddd2]">
            <FileSpreadsheet className="size-6" />
          </span>
          <p className="mt-4 text-xs font-bold tracking-[0.14em] text-[#71827c] uppercase">
            Raw data files
          </p>
          <h2 className="mt-1 font-serif text-3xl font-bold text-[#21483e]">
            Spreadsheet downloads
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#687b74]">
            Choose the data you need. Both options download a standard CSV file
            that opens directly in Excel, Numbers, and Google Sheets.
          </p>
        </div>

        <div
          className="grid gap-4 p-5 sm:p-7 md:grid-cols-2"
          role="group"
          aria-label="Spreadsheet download options"
        >
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isCurrent =
              download.isPending && download.variables === option.format;
            return (
              <section
                key={option.format}
                className="flex flex-col rounded-2xl border border-[#dfddd2] bg-[#faf9f5] p-5 text-left sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${option.color}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-[#dedbd0] bg-white px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#6d7d77] uppercase">
                    CSV · Excel-compatible
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold text-[#21483e]">
                  {option.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#687b74]">
                  {option.description}
                </p>
                <Button
                  variant="secondary"
                  className="mt-5 w-full"
                  disabled={download.isPending}
                  onClick={() => startDownload(option.format)}
                >
                  <FileSpreadsheet className="size-4" />
                  {isCurrent ? "Preparing spreadsheet…" : option.button}
                </Button>
              </section>
            );
          })}
        </div>
      </Card>

      <Card className="mt-5 flex gap-4 p-5 sm:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1ee] text-[#416b60]">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="font-bold text-[#294f45]">Your saved data is safe</h2>
          <p className="mt-1 text-sm leading-6 text-[#687b74]">
            Creating an export only reads your records. It does not change or
            remove anything, and book-search outages do not affect saved books.
          </p>
        </div>
        <Archive className="ml-auto hidden size-5 text-[#9aa9a4] sm:block" />
      </Card>
    </section>
  );
}

function schoolYearToDate(now = new Date()) {
  const schoolYearStart = new Date(
    now.getFullYear() - (now.getMonth() < 6 ? 1 : 0),
    6,
    1,
  );
  return { dateFrom: toLocalDate(schoolYearStart), dateTo: toLocalDate(now) };
}

function todayLocal() {
  return toLocalDate(new Date());
}

function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
