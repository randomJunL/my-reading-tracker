import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";
import type { components } from "@/api/schema";

export type Book = components["schemas"]["BookResponse"];
export type BookCreate = components["schemas"]["BookCreate"];
export type BookSearchResult = components["schemas"]["BookSearchResult"];
export type ReadingStatus = components["schemas"]["ReadingStatus"];

export function searchBooks(query: string) {
  return apiFetch<BookSearchResult[]>(
    `/book-search?q=${encodeURIComponent(query)}`,
  );
}

export function listBooks(readerId: string, status?: ReadingStatus | "all") {
  const params = new URLSearchParams({ reader_id: readerId });
  if (status && status !== "all") params.set("status", status);
  return apiFetch<Book[]>(`/books?${params}`);
}

export function getBook(bookId: string) {
  return apiFetch<Book>(`/books/${bookId}`);
}

export async function createAndAssignBook(
  readerId: string,
  data: BookCreate,
  status: ReadingStatus,
) {
  const book = await apiFetch<Book>("/books", {
    method: "POST",
    body: JSON.stringify(data),
  });
  try {
    await apiFetch(`/readers/${readerId}/books`, {
      method: "POST",
      body: JSON.stringify({ book_id: book.id, status }),
    });
  } catch (error) {
    await apiFetch(`/books/${book.id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    throw error;
  }
  return book;
}

export function useBooks(
  readerId: string | null,
  status: ReadingStatus | "all",
) {
  return useQuery({
    queryKey: ["books", readerId, status],
    queryFn: () => listBooks(readerId!, status),
    enabled: Boolean(readerId),
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId!),
    enabled: Boolean(bookId),
  });
}

export function useSearchBooks() {
  return useMutation({ mutationFn: searchBooks });
}

export function useCreateAndAssignBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      readerId,
      data,
      status,
    }: {
      readerId: string;
      data: BookCreate;
      status: ReadingStatus;
    }) => createAndAssignBook(readerId, data, status),
    onSuccess: () => client.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBookStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      readerId,
      bookId,
      status,
    }: {
      readerId: string;
      bookId: string;
      status: ReadingStatus;
    }) =>
      apiFetch(`/readers/${readerId}/books/${bookId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useRemoveFromLibrary() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ readerId, bookId }: { readerId: string; bookId: string }) =>
      apiFetch<void>(`/readers/${readerId}/books/${bookId}`, {
        method: "DELETE",
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookId,
      confirmHistory,
    }: {
      bookId: string;
      confirmHistory?: boolean;
    }) =>
      apiFetch<void>(
        `/books/${bookId}${confirmHistory ? "?confirm_history=true" : ""}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["books"] });
      void client.invalidateQueries({ queryKey: ["book"] });
    },
  });
}
