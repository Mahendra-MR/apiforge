import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "./Button";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : label}
    </Button>
  );
}
