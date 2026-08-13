import {
  Archive,
  BookCheck,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ExportFormat,
  useReadingDataExport,
} from "@/features/exports/export-api";

const exportOptions = [
  {
    format: "json" as const,
    title: "Complete JSON backup",
    description:
      "Download your household, readers, books, library statuses, and every reading session in one structured file.",
    button: "Download JSON backup",
    icon: FileJson,
    color: "bg-[#e4f0eb] text-[#28705f]",
  },
  {
    format: "csv" as const,
    title: "Reading history spreadsheet",
    description:
      "Download a human-readable session list that opens in Excel, Numbers, Google Sheets, or any text editor.",
    button: "Download session CSV",
    icon: FileSpreadsheet,
    color: "bg-[#fff0d5] text-[#9a621e]",
  },
  {
    format: "finished-books-csv" as const,
    title: "Finished books report",
    description:
      "Download one row per finished reader and book, with completion date, total reading time, pages, sessions, and reading dates.",
    button: "Download finished books",
    icon: BookCheck,
    color: "bg-[#fbe5de] text-[#aa513d]",
  },
];

export function ReportsPage() {
  const download = useReadingDataExport();

  function startDownload(format: ExportFormat) {
    download.reset();
    download.mutate(format);
  }

  return (
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-7">
        <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
          Reports and backup
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
          Export reading data
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687b74]">
          Keep a private backup or move the reading log into a spreadsheet.
          Exports always include only your authenticated household.
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

      <div className="grid gap-5 lg:grid-cols-3">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const isCurrent =
            download.isPending && download.variables === option.format;
          return (
            <Card key={option.format} className="flex flex-col p-6 sm:p-7">
              <span
                className={`flex size-12 items-center justify-center rounded-2xl ${option.color}`}
              >
                <Icon className="size-6" />
              </span>
              <h2 className="mt-5 font-serif text-2xl font-bold text-[#21483e]">
                {option.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#687b74]">
                {option.description}
              </p>
              <Button
                className="mt-6 self-start"
                disabled={download.isPending}
                onClick={() => startDownload(option.format)}
              >
                {isCurrent ? "Preparing download…" : option.button}
              </Button>
            </Card>
          );
        })}
      </div>

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
