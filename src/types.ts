import type { ProjectRecord } from "../electron/types";

export type View = "all" | "dates" | "types" | "trash";
export type SidebarSection = "dates" | "types";
export type ProjectDialogState = {
  mode: "create" | "rename" | "delete";
  project: ProjectRecord | null;
  value: string;
};
