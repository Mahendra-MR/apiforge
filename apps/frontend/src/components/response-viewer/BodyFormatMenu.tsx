import type { ReactNode } from "react";
import { Binary, Braces, Check, ChevronDown, CodeXml, FileCode2, FileText, Hash, Heading, Type } from "lucide-react";
import { ENCODING_FORMATS, FORMAT_LABEL, LANGUAGE_FORMATS, type ResponseFormat } from "../../lib/responseFormat";
import { MenuDivider, MenuItem, Popover } from "../common/Popover";

const FORMAT_ICON: Record<ResponseFormat, ReactNode> = {
  json: <Braces size={14} />,
  xml: <CodeXml size={14} />,
  html: <FileCode2 size={14} />,
  yaml: <FileText size={14} />,
  javascript: <Type size={14} />,
  markdown: <Heading size={14} />,
  raw: <FileText size={14} />,
  hex: <Hash size={14} />,
  base64: <Binary size={14} />,
};

interface BodyFormatMenuProps {
  value: ResponseFormat;
  onChange: (format: ResponseFormat) => void;
  /** Rendered as unselected while Preview/Visualize is showing instead of the code view. */
  active: boolean;
}

/** Postman-style "{ } JSON ▾" picker: languages first, then Raw/Hex/Base64 encodings. */
export function BodyFormatMenu({ value, onChange, active }: BodyFormatMenuProps) {
  function renderGroup(formats: ResponseFormat[], close: () => void) {
    return formats.map((format) => (
      <MenuItem
        key={format}
        icon={FORMAT_ICON[format]}
        onClick={() => { onChange(format); close(); }}
      >
        <span className="flex items-center justify-between gap-6">
          {FORMAT_LABEL[format]}
          {format === value && <Check size={13} className="text-brand-600 dark:text-brand-400" />}
        </span>
      </MenuItem>
    ));
  }

  return (
    <Popover
      align="left"
      width="min-w-[190px]"
      trigger={(toggle, isOpen) => (
        <button
          onClick={toggle}
          aria-label={`Body format: ${FORMAT_LABEL[value]}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
            active || isOpen
              ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
          }`}
        >
          {FORMAT_ICON[value]}
          {FORMAT_LABEL[value]}
          <ChevronDown size={12} className="text-slate-400" />
        </button>
      )}
    >
      {(close) => (
        <>
          {renderGroup(LANGUAGE_FORMATS, close)}
          <MenuDivider />
          {renderGroup(ENCODING_FORMATS, close)}
        </>
      )}
    </Popover>
  );
}
