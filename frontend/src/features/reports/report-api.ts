import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";
import type { components } from "@/api/schema";

export type ReportSummary = components["schemas"]["ReportSummaryResponse"];
export type CalendarReport = components["schemas"]["CalendarReportResponse"];

export type ReportRange = {
  dateFrom: string;
  dateTo: string;
};

export function getReportSummary(readerId: string, range: ReportRange) {
  const params = new URLSearchParams({
    reader_id: readerId,
    date_from: range.dateFrom,
    date_to: range.dateTo,
  });
  return apiFetch<ReportSummary>(`/reports/summary?${params}`);
}

export function useReportSummary(readerId: string | null, range: ReportRange) {
  return useQuery({
    queryKey: ["reports", "summary", readerId, range.dateFrom, range.dateTo],
    queryFn: () => getReportSummary(readerId!, range),
    enabled: Boolean(readerId),
  });
}

export function getCalendarReport(readerId: string, range: ReportRange) {
  const params = new URLSearchParams({
    reader_id: readerId,
    date_from: range.dateFrom,
    date_to: range.dateTo,
  });
  return apiFetch<CalendarReport>(`/reports/calendar?${params}`);
}

export function useCalendarReport(readerId: string | null, range: ReportRange) {
  return useQuery({
    queryKey: ["reports", "calendar", readerId, range.dateFrom, range.dateTo],
    queryFn: () => getCalendarReport(readerId!, range),
    enabled: Boolean(readerId),
  });
}

export function currentWeekRange(now = new Date()): ReportRange {
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return { dateFrom: toLocalDate(start), dateTo: toLocalDate(now) };
}

export function currentMonthRange(now = new Date()): ReportRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toLocalDate(start), dateTo: toLocalDate(now) };
}

export function currentCalendarMonthRange(now = new Date()): ReportRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateFrom: toLocalDate(start), dateTo: toLocalDate(end) };
}

function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
