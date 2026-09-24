import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { openSearchPanel, search } from "@codemirror/search";
import CodeMirror, { EditorView, type Extension } from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import { Search } from "lucide-react";
import type { ResponseFormat } from "../../lib/responseFormat";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "../common/Button";

interface ResponseCodeViewProps {
  value: string;
  format?: ResponseFormat;
}

function languageFor(format: ResponseFormat): Extension[] {
  switch (format) {
    case "json":
      return [json()];
    case "xml":
      return [xml()];
    case "html":
      return [html()];
    case "yaml":
      return [yaml()];
    case "javascript":
      return [javascript()];
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

/**
 * Read-only code view for response bodies: syntax highlighting for the
 * chosen format, fold gutters (JSON expand/collapse), and CodeMirror's own
 * in-editor search. Encodings (Hex/Base64) wrap so long lines stay readable.
 */
export function ResponseCodeView({ value, format = "json" }: ResponseCodeViewProps) {
  const theme = useThemeStore((s) => s.theme);
  const viewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(
    () => [...languageFor(format), search(), ...(format === "base64" ? [EditorView.lineWrapping] : [])],
    [format],
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute right-3 top-2 z-10 rounded-md bg-white/90 shadow-subtle backdrop-blur dark:bg-surface-dark/90">
        <Button variant="ghost" size="sm" onClick={() => viewRef.current && openSearchPanel(viewRef.current)}>
          <Search size={13} />
          Search
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <CodeMirror
          value={value}
          height="100%"
          theme={theme}
          editable={false}
          extensions={extensions}
          basicSetup={{ foldGutter: true, lineNumbers: true, highlightActiveLine: false }}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
        />
      </div>
    </div>
  );
}
