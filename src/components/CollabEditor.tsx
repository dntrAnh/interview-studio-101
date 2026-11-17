import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import tsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import Editor, { loader } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};
loader.config({ monaco });

export default function CollabEditor({
  ytext, awareness, language, dark, readOnly = false,
}: { ytext: Y.Text; awareness: Awareness; language: string; dark: boolean; readOnly?: boolean }) {
  const bindingRef = useRef<MonacoBinding | null>(null);
  useEffect(() => () => bindingRef.current?.destroy(), []);
  return (
    <Editor
      height="100%"
      language={language}
      theme={dark ? "vs-dark" : "vs"}
      options={{
        readOnly,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12 },
      }}
      onMount={(editor) => {
        const model = editor.getModel();
        if (!model) return;
        bindingRef.current = new MonacoBinding(ytext, model, new Set([editor]), awareness);
      }}
    />
  );
}
