import { useState } from "react";
import toast from "react-hot-toast";
import { parseCurlCommand } from "../../lib/parseCurl";
import { useRequestStore } from "../../store/useRequestStore";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface ImportCurlModalProps {
  onClose: () => void;
}

const PLACEHOLDER = `curl --location --request POST 'https://api.example.com/users' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer {{token}}' \\
--data '{"name": "John"}'`;

/** Lets the user paste a curl command (e.g. copied from a browser's dev tools or a terminal) and loads it straight into the request builder, matching Postman's "Import > Raw text" flow. */
export function ImportCurlModal({ onClose }: ImportCurlModalProps) {
  const [text, setText] = useState("");
  const loadFromCurl = useRequestStore((s) => s.loadFromCurl);

  function handleImport() {
    const result = parseCurlCommand(text);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    loadFromCurl(result.result);
    toast.success("Imported from cURL");
    onClose();
  }

  return (
    <Modal
      open
      title="Import cURL"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleImport} disabled={text.trim() === ""}>
            Import
          </Button>
        </div>
      }
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">Paste a curl command</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          autoFocus
          spellCheck={false}
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <p className="mt-2 text-xs text-slate-400">
        Method, URL, query params, headers, body, and Basic/Bearer auth are all filled in for you. This replaces the
        current request draft.
      </p>
    </Modal>
  );
}
