import { create } from "zustand";

type UiState = {
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  showArchived: false,
  setShowArchived: (show) => set({ showArchived: show }),
}));
