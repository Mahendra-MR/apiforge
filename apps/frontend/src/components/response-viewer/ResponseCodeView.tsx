import { json } from "@codemirror/lang-json";
import { openSearchPanel, search } from "@codemirror/search";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { Search } from "lucide-react";
import { Button } from "../common/Button";

interface ResponseCodeViewProps {
  value: string;
  language?: "json" | "text";
}

/**
 * Read-only code view for response bodies. Reuses CodeMirror (already a
 * dependency for the request body editor) so we get syntax highlighting and
 * fold gutters (= JSON expand/collapse) for free, plus a real "search within
 * response" via CodeMirror's search extension instead of a hand-rolled one.
 */
export function ResponseCodeView({ value, language = "json" }: ResponseCodeViewProps) {
  const theme = useThemeStore((s) => s.theme);
  const viewRef = useRef<EditorView | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end border-b border-slate-100 px-2 py-1 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => viewRef.current && openSearchPanel(viewRef.current)}
        >
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
          extensions={[...(language === "json" ? [json()] : []), search()]}
          basicSetup={{ foldGutter: true, lineNumbers: true, highlightActiveLine: false }}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
        />
      </div>
    </div>
  );
}
