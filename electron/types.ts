// Types shared by the Electron side and the React UI.

export interface LinkRecord {
  label: string;
  url: string;
}

export interface BranchRecord {
  name: string;
  from: string;
  repo: string;
}

export interface NoteRecord {
  id: string;
  title: string;
  project: string;
  type: string;
  tags: string[];
  status: "Active" | "Completed" | "Archived";
  workItemId: string;
  branches: BranchRecord[];
  prs: LinkRecord[];
  docs: LinkRecord[];
  createdAt: string;
  updatedAt: string;
  body: string;
  path: string;
  deleted: boolean;
  originalProject?: string;
  fileNameMismatch?: boolean;
}

export interface ImportItem {
  path: string;
  project: string;
}

export interface ProjectRecord {
  name: string;
  notes: number;
}

export interface Snapshot {
  root: string;
  projects: ProjectRecord[];
  notes: NoteRecord[];
  noteTypes: string[];
}

declare global {
  interface Window {
    workspace: {
      getRoot(): Promise<string | null>;
      chooseRoot(): Promise<string | null>;
      getSnapshot(): Promise<Snapshot>;
      createProject(name: string): Promise<void>;
      renameProject(name: string, nextName: string): Promise<void>;
      deleteProject(name: string): Promise<void>;
      createNote(project: string): Promise<NoteRecord>;
      recoverNote(note: NoteRecord): Promise<NoteRecord>;
      saveNote(note: NoteRecord): Promise<NoteRecord>;
      deleteNote(id: string): Promise<void>;
      restoreNote(id: string): Promise<void>;
      emptyTrash(): Promise<void>;
      importNotes(items: ImportItem[]): Promise<number>;
      chooseImportFiles(): Promise<string[]>;
      openPath(path: string): Promise<void>;
      openExternal(url: string): Promise<void>;
      onChanged(callback: () => void): () => void;
    };
  }
}
