import { registerImportHandlers } from "./import";
import { registerLinkHandlers } from "./links";
import { registerNoteHandlers } from "./notes";
import { registerProjectHandlers } from "./projects";
import { registerWorkspaceHandlers } from "./workspace";

export function registerHandlers() {
  registerWorkspaceHandlers();
  registerProjectHandlers();
  registerNoteHandlers();
  registerImportHandlers();
  registerLinkHandlers();
}
