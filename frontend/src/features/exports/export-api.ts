import { useMutation } from "@tanstack/react-query";

import { apiDownload } from "@/api/client";

export type ExportFormat = "json" | "csv" | "finished-books-csv";

export async function downloadReadingData(format: ExportFormat) {
  const { blob, filename } = await apiDownload(
    `/exports/reading-data?format=${format}`,
  );
  downloadBlob(blob, filename);
}

export function useReadingDataExport() {
  return useMutation({ mutationFn: downloadReadingData });
}

export type SchoolReportRequest = {
  readerId: string;
  dateFrom: string;
  dateTo: string;
};

export async function downloadSchoolReport({
  readerId,
  dateFrom,
  dateTo,
}: SchoolReportRequest) {
  const params = new URLSearchParams({
    reader_id: readerId,
    date_from: dateFrom,
    date_to: dateTo,
  });
  const { blob, filename } = await apiDownload(
    `/exports/school-reading-report?${params}`,
  );
  downloadBlob(blob, filename);
}

export function useSchoolReportExport() {
  return useMutation({ mutationFn: downloadSchoolReport });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
