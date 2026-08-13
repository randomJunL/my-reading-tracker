import { useMutation } from "@tanstack/react-query";

import { apiDownload } from "@/api/client";

export type ExportFormat = "json" | "csv" | "finished-books-csv";

export async function downloadReadingData(format: ExportFormat) {
  const { blob, filename } = await apiDownload(
    `/exports/reading-data?format=${format}`,
  );
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

export function useReadingDataExport() {
  return useMutation({ mutationFn: downloadReadingData });
}
