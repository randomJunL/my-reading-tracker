import { UserRound } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useCurrentUser } from "@/features/auth/current-user";
import { useReaders } from "@/features/readers/reader-api";
import { useReaderSelection } from "@/features/readers/use-reader-selection";

export function ReaderSelector() {
  const { data: currentUser } = useCurrentUser();
  const { data: readers = [], isLoading } = useReaders();
  const { selectedReaderId, setSelectedReaderId } = useReaderSelection();

  useEffect(() => {
    if (isLoading) return;
    const selectionIsValid = readers.some(
      (reader) => reader.id === selectedReaderId,
    );
    if (!selectionIsValid) {
      setSelectedReaderId(readers[0]?.id ?? null);
    }
  }, [isLoading, readers, selectedReaderId, setSelectedReaderId]);

  if (currentUser && !currentUser.is_admin) {
    const reader = readers.find((item) => item.id === currentUser.reader_id);
    return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-[#d7d5c9] bg-white px-3 text-sm font-semibold text-[#264940]">
        <UserRound className="size-4 text-[#667b74]" />
        {reader?.name ?? "My profile"}
      </div>
    );
  }

  if (!isLoading && readers.length === 0) {
    return (
      <Link
        to="/readers"
        className="flex h-11 items-center gap-2 rounded-xl border border-[#d7d5c9] bg-white px-3 text-sm font-semibold text-[#31564c] hover:bg-[#f9f7f1]"
      >
        <UserRound className="size-4" />
        <span className="hidden md:inline">Add a reader</span>
      </Link>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Selected reader</span>
      <UserRound className="size-4 text-[#667b74]" />
      <select
        aria-label="Selected reader"
        value={selectedReaderId ?? ""}
        disabled={isLoading}
        onChange={(event) => setSelectedReaderId(event.target.value || null)}
        className="h-11 w-[108px] rounded-xl border border-[#d7d5c9] bg-white px-2.5 text-sm font-semibold text-[#264940] outline-none focus:border-[#df6549] focus:ring-3 focus:ring-[#f4bd62]/30 disabled:opacity-60 sm:w-36 sm:px-3"
      >
        {isLoading ? <option value="">Loading readers…</option> : null}
        {readers.map((reader) => (
          <option key={reader.id} value={reader.id}>
            {reader.name}
          </option>
        ))}
      </select>
    </label>
  );
}
