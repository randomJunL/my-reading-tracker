import { createContext } from "react";

export type ReaderSelectionValue = {
  selectedReaderId: string | null;
  setSelectedReaderId: (readerId: string | null) => void;
};

export const ReaderSelectionContext =
  createContext<ReaderSelectionValue | null>(null);
