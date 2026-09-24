import { isHtmlContentType, isImageContentType } from "../../lib/responseContentType";
import { EmptyState } from "../common/EmptyState";

interface PreviewPaneProps {
  body: string;
  contentType: string;
}

/**
 * Renders an HTML response the way a browser would. The iframe is fully
 * sandboxed (`sandbox=""` — no scripts, no same-origin, no forms) since this
 * is arbitrary content from whatever API the user just called, not
 * something the app should ever let execute with any privileges.
 */
export function PreviewPane({ body, contentType }: PreviewPaneProps) {
  if (isHtmlContentType(contentType)) {
    return <iframe title="Response preview" srcDoc={body} sandbox="" className="h-full w-full border-0 bg-white" />;
  }

  if (isImageContentType(contentType)) {
    return (
      <EmptyState
        title="Image preview isn't available yet"
        description="The backend currently reads every response as text, which corrupts binary bodies like images before they get here."
      />
    );
  }

  return (
    <EmptyState
      title="No preview for this response"
      description="Preview renders HTML responses. This response's Content-Type doesn't look like HTML."
    />
  );
}
