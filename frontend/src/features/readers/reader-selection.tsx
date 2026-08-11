import { type ReactNode, useEffect, useMemo, useState } from "react";

import { ReaderSelectionContext } from "@/features/readers/reader-selection-context";

const STORAGE_KEY = "my-reading-tracker:selected-reader";

export function ReaderSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(() =>
    window.localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    if (selectedReaderId) {
      window.localStorage.setItem(STORAGE_KEY, selectedReaderId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedReaderId]);

  const value = useMemo(
    () => ({ selectedReaderId, setSelectedReaderId }),
    [selectedReaderId],
  );

  return (
    <ReaderSelectionContext.Provider value={value}>
      {children}
    </ReaderSelectionContext.Provider>
  );
}
