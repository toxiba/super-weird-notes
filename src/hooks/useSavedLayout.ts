import { useEffect, useState } from "react";
import type { View } from "../types";

export type SavedLayout = {
  tabs: string[];
  selectedId: string | null;
  projectFilter: string | null;
  view: View;
};

/**
 * Restores open tabs, the selected note, project filter and view from the last
 * session once on start-up, then saves them whenever they change.
 */
export function useSavedLayout(layout: SavedLayout, restore: (saved: Partial<SavedLayout>) => void) {
  const [restored, setRestored] = useState(false);
  const { tabs, selectedId, projectFilter, view } = layout;

  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("ferretations.")) localStorage.removeItem(key);
    }
    const saved: Partial<SavedLayout> = {};
    const savedTabs = localStorage.getItem("superWeirdNotes.tabs");
    const savedSelection = localStorage.getItem("superWeirdNotes.selected");
    const savedProject = localStorage.getItem("superWeirdNotes.project");
    const savedView = localStorage.getItem("superWeirdNotes.view") as View | null;
    if (savedTabs) saved.tabs = JSON.parse(savedTabs) as string[];
    if (savedSelection) saved.selectedId = savedSelection;
    if (savedProject) saved.projectFilter = savedProject;
    if (savedView && ["all", "dates", "types", "trash"].includes(savedView)) saved.view = savedView;
    restore(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem("superWeirdNotes.tabs", JSON.stringify(tabs));
    if (selectedId) localStorage.setItem("superWeirdNotes.selected", selectedId);
    else localStorage.removeItem("superWeirdNotes.selected");
    if (projectFilter) localStorage.setItem("superWeirdNotes.project", projectFilter);
    else localStorage.removeItem("superWeirdNotes.project");
    localStorage.setItem("superWeirdNotes.view", view);
  }, [tabs, selectedId, projectFilter, view, restored]);
}
