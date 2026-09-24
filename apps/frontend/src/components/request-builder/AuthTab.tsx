import clsx from "clsx";
import { useOAuth2Token } from "../../hooks/useOAuth2Token";
import { useRequestStore } from "../../store/useRequestStore";
import type { AuthType } from "../../types";
import { Button } from "../common/Button";

const AUTH_TYPES: { id: AuthType; label: string }[] = [
  { id: "none", label: "No Auth" },
  { id: "bearer", label: "Bearer Token" },
  { id: "basic", label: "Basic Auth" },
  { id: "apiKey", label: "API Key" },
  { id: "oauth2", label: "OAuth 2.0" },
];

const FIELD_CLASS =
  "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900";
const LABEL_CLASS = "flex flex-col gap-1 text-sm";
const LABEL_TEXT_CLASS = "font-medium text-slate-600 dark:text-slate-300";

/** Auth tab for the request builder: No Auth / Bearer / Basic / API Key / OAuth 2.0 (client-credentials grant only). */
export function AuthTab() {
  const draft = useRequestStore((s) => s.draft);
  const setAuthType = useRequestStore((s) => s.setAuthType);
  const updateAuthConfig = useRequestStore((s) => s.updateAuthConfig);
  const setOAuth2Token = useRequestStore((s) => s.setOAuth2Token);
  const oauth2Token = useOAuth2Token();

  function handleFetchToken() {
    const { tokenUrl, clientId, clientSecret, scope } = draft.auth.oauth2;
    oauth2Token.mutate(
      { tokenUrl, clientId, clientSecret, scope: scope.trim() === "" ? undefined : scope },
      { onSuccess: setOAuth2Token },
    );
  }

  const oauth2 = draft.auth.oauth2;
  const canFetchToken = oauth2.tokenUrl.trim() !== "" && oauth2.clientId.trim() !== "" && oauth2.clientSecret.trim() !== "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        {AUTH_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setAuthType(type.id)}
            className={clsx(
              "rounded px-2.5 py-1 text-xs font-medium",
              draft.authType === type.id
                ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
        {draft.authType === "none" && <p className="text-sm text-slate-400">This request does not use authorization.</p>}

        {draft.authType === "bearer" && (
          <label className={LABEL_CLASS}>
            <span className={LABEL_TEXT_CLASS}>Token</span>
            <input
              value={draft.auth.bearer.token}
              onChange={(e) => updateAuthConfig("bearer", { token: e.target.value })}
              placeholder="{{accessToken}}"
              className={clsx(FIELD_CLASS, "font-mono")}
            />
          </label>
        )}

        {draft.authType === "basic" && (
          <div className="flex flex-col gap-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Username</span>
              <input
                value={draft.auth.basic.username}
                onChange={(e) => updateAuthConfig("basic", { username: e.target.value })}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Password</span>
              <input
                type="password"
                value={draft.auth.basic.password}
                onChange={(e) => updateAuthConfig("basic", { password: e.target.value })}
                className={FIELD_CLASS}
              />
            </label>
          </div>
        )}

        {draft.authType === "apiKey" && (
          <div className="flex flex-col gap-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Key</span>
              <input
                value={draft.auth.apiKey.key}
                onChange={(e) => updateAuthConfig("apiKey", { key: e.target.value })}
                placeholder="X-API-Key"
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Value</span>
              <input
                value={draft.auth.apiKey.value}
                onChange={(e) => updateAuthConfig("apiKey", { value: e.target.value })}
                className={clsx(FIELD_CLASS, "font-mono")}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Add to</span>
              <select
                value={draft.auth.apiKey.location}
                onChange={(e) => updateAuthConfig("apiKey", { location: e.target.value as "header" | "query" })}
                className={FIELD_CLASS}
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </label>
          </div>
        )}

        {draft.authType === "oauth2" && (
          <div className="flex flex-col gap-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Access Token URL</span>
              <input
                value={oauth2.tokenUrl}
                onChange={(e) => updateAuthConfig("oauth2", { tokenUrl: e.target.value })}
                placeholder="https://auth.example.com/oauth/token"
                className={clsx(FIELD_CLASS, "font-mono")}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Client ID</span>
              <input
                value={oauth2.clientId}
                onChange={(e) => updateAuthConfig("oauth2", { clientId: e.target.value })}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Client Secret</span>
              <input
                type="password"
                value={oauth2.clientSecret}
                onChange={(e) => updateAuthConfig("oauth2", { clientSecret: e.target.value })}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>Scope (optional)</span>
              <input
                value={oauth2.scope}
                onChange={(e) => updateAuthConfig("oauth2", { scope: e.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleFetchToken} disabled={oauth2Token.isPending || !canFetchToken}>
                {oauth2Token.isPending ? "Fetching…" : "Get New Access Token"}
              </Button>
              {oauth2.accessToken && oauth2.obtainedAt && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  Token acquired {new Date(oauth2.obtainedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {oauth2.accessToken && (
              <div className="rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                {oauth2.tokenType} {oauth2.accessToken.slice(0, 24)}…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
