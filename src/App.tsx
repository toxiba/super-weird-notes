import type { editor as MonacoEditorApi, IDisposable } from "monaco-editor";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ImportItem, NoteRecord, ProjectRecord } from "../electron/types";
import { EditorPanel } from "./components/editor/EditorPanel";
import { EditorOptionsDialog } from "./components/dialogs/EditorOptionsDialog";
import { ImportDialog } from "./components/dialogs/ImportDialog";
import { ProjectDialog } from "./components/dialogs/ProjectDialog";
import { NoteList } from "./components/notes/NoteList";
import { Sidebar } from "./components/sidebar/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useEditorOptions } from "./hooks/useEditorOptions";
import { useNoteStore } from "./hooks/useNoteStore";
import { useSavedLayout } from "./hooks/useSavedLayout";
import { openEditorFind } from "./lib/monaco";
import { filterNotes } from "./lib/notes";
import { normalizeProjectName, validateProjectName } from "./lib/projectNames";
import type { ProjectDialogState, SidebarSection, View } from "./types";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function App() {
  const [message, setMessage] = useState("");
  const store = useNoteStore(setMessage);
  const { snapshot, drafts, dirty, conflicts, missingNotes, refresh, saveNote } = store;
  const editorOptions = useEditorOptions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [view, setView] = useState<View>("all");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState | null>(null);
  const [projectDialogError, setProjectDialogError] = useState("");
  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);
  const [activeBrowseSection, setActiveBrowseSection] = useState<SidebarSection | null>(null);
  const [expandedSidebarSection, setExpandedSidebarSection] = useState<SidebarSection | null>(null);
  const [resultsVisible, setResultsVisible] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [noteDetailsCollapsed, setNoteDetailsCollapsed] = useState(false);
  const [importPaths, setImportPaths] = useState<string[]>([]);
  const [importProjects, setImportProjects] = useState<Record<string, string>>({});
  const [editorBodyHeight, setEditorBodyHeight] = useState(180);
  const noteEditorRef = useRef<MonacoEditorApi.IStandaloneCodeEditor | null>(null);
  const editorContentSizeListener = useRef<IDisposable | null>(null);
  const autosaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    void window.workspace.getRoot().then(async (root) => {
      if (root) await refresh();
      else store.setLoading(false);
    });
  }, [refresh]);

  useEffect(() => window.workspace.onChanged(() => void refresh()), [refresh]);

  useEffect(() => {
    if (!openProjectMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".menu-row")) {
        setOpenProjectMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openProjectMenu]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!editorOptions.dialogOpen && (event.metaKey || event.ctrlKey) && activeNote && !activeNote.deleted && ["f", "h"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
        openEditorFind(noteEditorRef.current, event.key.toLowerCase() === "h");
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".global-search input")?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createNote();
      }
      if (event.key === "Escape") {
        setOpenProjectMenu(null);
      }
      if (event.key === "Escape" && document.activeElement?.classList.contains("global-search")) {
        setSearch("");
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  });

  useSavedLayout({ tabs, selectedId, projectFilter, view }, (saved) => {
    if (saved.tabs) setTabs(saved.tabs);
    if (saved.selectedId) setSelectedId(saved.selectedId);
    if (saved.projectFilter) setProjectFilter(saved.projectFilter);
    if (saved.view) {
      setView(saved.view);
      if (saved.view === "dates" || saved.view === "types") {
        setActiveBrowseSection(saved.view);
        setExpandedSidebarSection(saved.view);
      }
    }
  });

  const activeNote = selectedId ? drafts[selectedId] : undefined;
  useEffect(() => {
    noteEditorRef.current?.layout();
  }, [selectedId]);

  useLayoutEffect(() => {
    noteEditorRef.current?.layout();
  }, [selectedId]);

  useEffect(() => () => editorContentSizeListener.current?.dispose(), []);

  const onEditorMount = useCallback((editor: MonacoEditorApi.IStandaloneCodeEditor) => {
    noteEditorRef.current = editor;
    setEditorBodyHeight(Math.ceil(editor.getContentHeight()));
    editorContentSizeListener.current?.dispose();
    editorContentSizeListener.current = editor.onDidContentSizeChange(({ contentHeight }) => {
      setEditorBodyHeight(Math.ceil(contentHeight));
    });
  }, []);

  const openNote = (id: string) => {
    setSelectedId(id);
    setTabs((current) => current.includes(id) ? current : [...current, id]);
    setView("all");
    setMessage("");
  };

  const closeTab = (id: string) => {
    const remaining = tabs.filter((tab) => tab !== id);
    setTabs(remaining);
    if (selectedId === id) setSelectedId(remaining.at(-1) || null);
  };

  const updateNote = (patch: Partial<NoteRecord>) => {
    if (!activeNote || activeNote.deleted) return;
    store.editDraft(activeNote, patch);
  };

  useEffect(() => {
    if (!activeNote || !dirty.has(activeNote.id) || activeNote.deleted || conflicts.has(activeNote.id)) return;
    window.clearTimeout(autosaveTimer.current);
    const noteCopy = activeNote;
    autosaveTimer.current = window.setTimeout(() => void saveNote(noteCopy), 700);
    return () => window.clearTimeout(autosaveTimer.current);
  }, [activeNote, dirty, conflicts, saveNote]);

  const filteredNotes = useMemo(
    () => filterNotes(snapshot.notes, { view, projectFilter, typeFilter, statusFilter, dateFilter, search }),
    [snapshot.notes, view, projectFilter, typeFilter, statusFilter, dateFilter, search],
  );

  const doChooseRoot = async () => {
    try {
      const root = await window.workspace.chooseRoot();
      if (root) await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const openCreateProject = () => {
    setProjectDialogError("");
    setProjectDialog({ mode: "create", project: null, value: "" });
  };

  const openRenameProject = (project: ProjectRecord) => {
    setOpenProjectMenu(null);
    setProjectDialogError("");
    setProjectDialog({ mode: "rename", project, value: project.name });
  };

  const openDeleteProject = (project: ProjectRecord) => {
    setOpenProjectMenu(null);
    setProjectDialogError("");
    setProjectDialog({ mode: "delete", project, value: "" });
  };

  const submitProjectDialog = async () => {
    if (!projectDialog) return;
    if (projectDialog.mode === "delete") {
      const project = projectDialog.project;
      if (!project) return;
      try {
        await window.workspace.deleteProject(project.name);
        store.moveProjectNotes(project.name, "Unassigned");
        if (projectFilter === project.name) setProjectFilter(null);
        setProjectDialog(null);
        await refresh();
      } catch (error) {
        setProjectDialogError(errorText(error));
      }
      return;
    }

    const currentName = projectDialog.project?.name || null;
    const normalized = normalizeProjectName(projectDialog.value);
    const validationError = validateProjectName(projectDialog.value, currentName, snapshot.projects);
    if (validationError) {
      setProjectDialogError(validationError);
      return;
    }
    try {
      if (projectDialog.mode === "create") {
        await window.workspace.createProject(normalized);
      } else if (projectDialog.project) {
        await window.workspace.renameProject(projectDialog.project.name, normalized);
        store.moveProjectNotes(projectDialog.project.name, normalized);
      }
      await refresh();
      setProjectFilter(normalized);
      setTypeFilter(null);
      setStatusFilter(null);
      setDateFilter(null);
      setView("all");
      setProjectDialog(null);
    } catch (error) {
      setProjectDialogError(errorText(error));
    }
  };

  const createNote = async (projectOverride?: string) => {
    const project = projectOverride || projectFilter || "Unassigned";
    try {
      const note = await window.workspace.createNote(project);
      store.addSavedNote(note);
      setTabs((current) => [...current, note.id]);
      setSelectedId(note.id);
      setProjectFilter(project);
      setTypeFilter(null);
      setStatusFilter(null);
      setDateFilter(null);
      setView("all");
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const toggleBrowseSection = (section: SidebarSection) => {
    setResultsVisible(true);
    if (expandedSidebarSection === section) {
      setExpandedSidebarSection(null);
      return;
    }
    setExpandedSidebarSection(section);
    if (activeBrowseSection === section) return;
    setActiveBrowseSection(section);
    setProjectFilter(null);
    setTypeFilter(null);
    setDateFilter(null);
    setView(section);
  };

  const startImport = async () => {
    try {
      const paths = await window.workspace.chooseImportFiles();
      if (!paths.length) return;
      setImportPaths(paths);
      setImportProjects(Object.fromEntries(paths.map((file) => [file, ""])));
      setView("all");
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const finishImport = async () => {
    const items: ImportItem[] = importPaths.map((file) => ({ path: file, project: importProjects[file] }));
    try {
      const count = await window.workspace.importNotes(items);
      setImportPaths([]);
      setMessage(`Imported ${count} note${count === 1 ? "" : "s"}.`);
      await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const emptyTrash = async () => {
    setOpenProjectMenu(null);
    if (!window.confirm("Permanently delete everything in Trash? This cannot be undone.")) return;
    try {
      await window.workspace.emptyTrash();
      await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const deleteSelected = async () => {
    if (!activeNote || !window.confirm(`Move "${activeNote.title}" to Trash?`)) return;
    try {
      await window.workspace.deleteNote(activeNote.id);
      closeTab(activeNote.id);
      setSelectedId(null);
      await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const restoreSelected = async () => {
    if (!activeNote?.deleted) return;
    try {
      await window.workspace.restoreNote(activeNote.id);
      setView("all");
      await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const recoverMissingNote = async () => {
    if (!activeNote || !missingNotes.has(activeNote.id)) return;
    try {
      const recovered = await window.workspace.recoverNote(activeNote);
      store.replaceMissingNote(activeNote.id, recovered);
      setTabs((current) => [...current.filter((id) => id !== activeNote.id), recovered.id]);
      setSelectedId(recovered.id);
      setView("all");
      setMessage("Saved a recovered copy of the missing note.");
      await refresh();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const selectProject = (name: string | null) => {
    setOpenProjectMenu(null);
    setActiveBrowseSection(null);
    setExpandedSidebarSection(null);
    setResultsVisible(true);
    setProjectFilter(name);
    setTypeFilter(null);
    setStatusFilter(null);
    setDateFilter(null);
    setView("all");
  };

  const openLibraryPath = async (path: string) => {
    try {
      await window.workspace.openPath(path);
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const openWebLink = async (url: string) => {
    try {
      await window.workspace.openExternal(url);
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  if (store.loading) return <div className="loading-screen">Opening your workspace…</div>;
  if (!store.rootSelected) return <WelcomeScreen message={message} onChooseRoot={() => void doChooseRoot()} />;

  return (
    <div className="app-shell">
      <TopBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          if (value.trim()) setResultsVisible(true);
        }}
        onHome={() => selectProject(null)}
        onNewNote={() => void createNote()}
        onChangeLibrary={() => void doChooseRoot()}
      />

      <Sidebar
        snapshot={snapshot}
        view={view}
        projectFilter={projectFilter}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        dateFilter={dateFilter}
        activeBrowseSection={activeBrowseSection}
        expandedSidebarSection={expandedSidebarSection}
        openMenu={openProjectMenu}
        onToggleMenu={(name) => setOpenProjectMenu(openProjectMenu === name ? null : name)}
        onSelectAll={() => { selectProject(null); setView("all"); }}
        onToggleBrowseSection={toggleBrowseSection}
        onSelectDate={(value) => { setDateFilter(value); setResultsVisible(true); }}
        onSelectType={(value) => { setTypeFilter(value); setView("all"); setResultsVisible(true); }}
        onShowTrash={() => { setActiveBrowseSection(null); setExpandedSidebarSection(null); setView("trash"); setProjectFilter(null); setResultsVisible(true); }}
        onEmptyTrash={() => void emptyTrash()}
        onSelectProject={selectProject}
        onCreateProject={openCreateProject}
        onRenameProject={openRenameProject}
        onCreateNote={(name) => { setOpenProjectMenu(null); void createNote(name); }}
        onDeleteProject={openDeleteProject}
        onOpenLibrary={() => void openLibraryPath(snapshot.root)}
        onImport={() => void startImport()}
      />

      <main className="main-area">
        {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
        <div className={`workspace-grid ${activeNote ? "with-editor" : ""} ${activeNote && !resultsVisible ? "results-hidden" : ""}`}>
          {(!activeNote || resultsVisible) && <NoteList
            snapshot={snapshot}
            notes={filteredNotes}
            view={view}
            projectFilter={projectFilter}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            selectedId={selectedId}
            showHideButton={!!activeNote}
            onHide={() => setResultsVisible(false)}
            onTypeFilter={setTypeFilter}
            onStatusFilter={setStatusFilter}
            onClearProject={() => selectProject(null)}
            onClearDate={() => setDateFilter(null)}
            onOpenNote={openNote}
            onCreateNote={() => void createNote()}
          />}

          {activeNote && <EditorPanel
            note={activeNote}
            snapshot={snapshot}
            tabs={tabs}
            drafts={drafts}
            selectedId={selectedId}
            dirty={dirty.has(activeNote.id)}
            conflict={conflicts.has(activeNote.id)}
            missing={missingNotes.has(activeNote.id)}
            detailsCollapsed={noteDetailsCollapsed}
            editorOptions={editorOptions.editorOptions}
            editorBodyHeight={editorBodyHeight}
            onSelectTab={setSelectedId}
            onHideResults={() => setResultsVisible(false)}
            onCloseTab={closeTab}
            onEditOptions={editorOptions.openDialog}
            onToggleDetails={() => setNoteDetailsCollapsed(!noteDetailsCollapsed)}
            onRestore={() => void restoreSelected()}
            onDelete={() => void deleteSelected()}
            onRecover={() => void recoverMissingNote()}
            onLoadExternal={() => store.loadExternalVersion(activeNote.id)}
            onOverwrite={() => void saveNote(activeNote, true)}
            onChange={updateNote}
            onOpenExternal={(url) => void openWebLink(url)}
            onEditorMount={onEditorMount}
          />}
        </div>

        <StatusBar snapshot={snapshot} onOpenLibrary={() => void openLibraryPath(snapshot.root)} />
      </main>

      {importPaths.length > 0 && <ImportDialog
        paths={importPaths}
        projects={snapshot.projects}
        choices={importProjects}
        onChoose={(file, project) => setImportProjects((current) => ({ ...current, [file]: project }))}
        onCancel={() => setImportPaths([])}
        onImport={() => void finishImport()}
      />}

      {projectDialog && <ProjectDialog
        dialog={projectDialog}
        projects={snapshot.projects}
        error={projectDialogError}
        onChange={(value) => { setProjectDialogError(""); setProjectDialog({ ...projectDialog, value }); }}
        onClose={() => setProjectDialog(null)}
        onSubmit={() => void submitProjectDialog()}
      />}

      {editorOptions.dialogOpen && <EditorOptionsDialog
        draft={editorOptions.draft}
        error={editorOptions.error}
        onDraftChange={editorOptions.setDraft}
        onClose={editorOptions.closeDialog}
        onApply={editorOptions.apply}
      />}
    </div>
  );
}

export default App;
