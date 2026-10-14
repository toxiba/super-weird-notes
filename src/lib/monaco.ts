import type { editor as MonacoEditorApi } from "monaco-editor";

type MonacoFindController = {
  start(options: {
    forceRevealReplace: boolean;
    seedSearchStringFromSelection: "single" | "none";
    seedSearchStringFromNonEmptySelection: boolean;
    seedSearchStringFromGlobalClipboard: boolean;
    shouldFocus: 1;
    shouldAnimate: boolean;
    updateSearchScope: boolean;
    loop: boolean;
  }): Promise<void>;
};

export const defaultEditorOptions = {
  automaticLayout: true,
  minimap: { 
    enabled: false
  },
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  fontSize: 13,
  wordWrap: "off",
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off",
  parameterHints: { 
    enabled: false
  },
  hover: { 
    enabled: "off" 
  },
  padding: { 
    top: 12, bottom: 12 
  },
  fixedOverflowWidgets: true,
  scrollbar: { 
    vertical: "hidden",
    horizontal: "hidden", 
    handleMouseWheel: true
  }
} as MonacoEditorApi.IEditorOptions;

export function openEditorFind(editor: MonacoEditorApi.IStandaloneCodeEditor | null, replace = false) {
  editor?.focus();
  const findController = editor?.getContribution("editor.contrib.findController") as MonacoFindController | null | undefined;
  void findController?.start({
    forceRevealReplace: replace,
    seedSearchStringFromSelection: "single",
    seedSearchStringFromNonEmptySelection: false,
    seedSearchStringFromGlobalClipboard: false,
    shouldFocus: 1,
    shouldAnimate: true,
    updateSearchScope: false,
    loop: true,
  });
}
