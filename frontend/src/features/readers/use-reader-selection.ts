import { useContext } from "react";

import { ReaderSelectionContext } from "@/features/readers/reader-selection-context";

export function useReaderSelection() {
  const value = useContext(ReaderSelectionContext);
  if (!value) {
    throw new Error(
      "useReaderSelection must be used within ReaderSelectionProvider",
    );
  }
  return value;
}
