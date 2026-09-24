import { useState } from "react";
import { X } from "lucide-react";
import type { Environment, EnvironmentVariable } from "../../types";
import {
  useActivateEnvironment,
  useCreateEnvironment,
  useCreateVariable,
  useDeleteEnvironment,
  useDeleteVariable,
  useEnvironmentsList,
  useRenameEnvironment,
  useUpdateVariable,
} from "../../hooks/useEnvironments";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { Modal } from "../common/Modal";

interface EnvironmentManagerProps {
  open: boolean;
  onClose: () => void;
  /** When set, scopes this manager to one top-level folder's own environments instead of the app-wide global list, and binds anything created here to that folder. */
  scope?: { collectionId: string; collectionName: string };
}

interface VariableRowProps {
  environmentId: string;
  variable: EnvironmentVariable;
}

/** One editable variable row. Keeps its own draft of key/value so typing doesn't fire a request per keystroke — changes commit on blur. Secret values are masked until the eye toggle reveals them. */
function VariableRow({ environmentId, variable }: VariableRowProps) {
  const [key, setKey] = useState(variable.key);
  const [value, setValue] = useState(variable.value);
  const [revealed, setRevealed] = useState(false);
  const updateVariable = useUpdateVariable();
  const deleteVariable = useDeleteVariable();

  function commitKey() {
    if (key.trim() !== "" && key !== variable.key) {
      updateVariable.mutate({ environmentId, variableId: variable.id, input: { key: key.trim() } });
    }
  }

  function commitValue() {
    if (value !== variable.value) {
      updateVariable.mutate({ environmentId, variableId: variable.id, input: { value } });
    }
  }

  function toggleSecret() {
    updateVariable.mutate({ environmentId, variableId: variable.id, input: { isSecret: !variable.isSecret } });
  }

  const showMasked = variable.isSecret && !revealed;

  return (
    <div className="flex items-center gap-2">
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onBlur={commitKey}
        placeholder="Key"
        className="w-1/3 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
      />
      <input
        type={showMasked ? "password" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commitValue}
        placeholder="Value"
        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-mono focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
      />
      {variable.isSecret && (
        <button
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? "Hide value" : "Reveal value"}
          title={revealed ? "Hide value" : "Reveal value"}
          className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          {revealed ? "🙈" : "👁"}
        </button>
      )}
      <button
        onClick={toggleSecret}
        aria-label={variable.isSecret ? "Mark as not secret" : "Mark as secret"}
        title={variable.isSecret ? "Marked as secret" : "Mark as secret"}
        className={`shrink-0 rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${
          variable.isSecret ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
        }`}
      >
        🔒
      </button>
      <button
        onClick={() => deleteVariable.mutate({ environmentId, variableId: variable.id })}
        aria-label="Delete variable"
        className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface NewVariableRowProps {
  environmentId: string;
}

/** The always-present blank row at the bottom of a variable list, used to add a new variable. */
function NewVariableRow({ environmentId }: NewVariableRowProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const createVariable = useCreateVariable();

  function handleAdd() {
    if (key.trim() === "") return;
    createVariable.mutate(
      { environmentId, input: { key: key.trim(), value } },
      { onSuccess: () => { setKey(""); setValue(""); } },
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="New variable key"
        className="w-1/3 rounded border border-dashed border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Value"
        className="flex-1 rounded border border-dashed border-slate-300 bg-white px-2 py-1.5 text-sm font-mono focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
      />
      <Button size="sm" onClick={handleAdd} disabled={key.trim() === "" || createVariable.isPending}>
        Add
      </Button>
    </div>
  );
}

interface EnvironmentSectionProps {
  environment: Environment;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function EnvironmentSection({ environment, expanded, onToggleExpanded }: EnvironmentSectionProps) {
  const [name, setName] = useState(environment.name);
  const renameEnvironment = useRenameEnvironment();
  const activateEnvironment = useActivateEnvironment();
  const deleteEnvironment = useDeleteEnvironment();

  function commitRename() {
    if (name.trim() !== "" && name !== environment.name) {
      renameEnvironment.mutate({ id: environment.id, name: name.trim() });
    }
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onToggleExpanded}
          aria-label={expanded ? "Collapse environment" : "Expand environment"}
          className="text-slate-400"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium focus:border-brand-500 focus:bg-white focus:outline-none dark:focus:bg-slate-900"
        />
        {environment.isActive ? (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Active
          </span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => activateEnvironment.mutate(environment.id)}
            disabled={activateEnvironment.isPending}
          >
            Activate
          </Button>
        )}
        <button
          onClick={() => deleteEnvironment.mutate(environment.id)}
          aria-label={`Delete environment ${environment.name}`}
          className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 border-t border-slate-100 p-3 dark:border-slate-800">
          {environment.variables.map((variable) => (
            <VariableRow key={variable.id} environmentId={environment.id} variable={variable} />
          ))}
          <NewVariableRow environmentId={environment.id} />
        </div>
      )}
    </div>
  );
}

/** Modal for managing environments and their variables: create/rename/delete environments, switch which is active, and add/edit/delete variables with secret masking. */
export function EnvironmentManager({ open, onClose, scope }: EnvironmentManagerProps) {
  const { data: allEnvironments, isLoading } = useEnvironmentsList();
  const environments = allEnvironments?.filter((environment) =>
    scope ? environment.collectionId === scope.collectionId : environment.collectionId === null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const createEnvironment = useCreateEnvironment();

  function handleCreate() {
    if (newEnvironmentName.trim() === "") return;
    createEnvironment.mutate(
      { name: newEnvironmentName.trim(), collectionId: scope?.collectionId ?? null },
      {
        onSuccess: (created) => {
          setNewEnvironmentName("");
          setExpandedId(created.id);
        },
      },
    );
  }

  return (
    <Modal open={open} title={scope ? `Environment — ${scope.collectionName}` : "Manage Environments"} onClose={onClose} size="lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={newEnvironmentName}
            onChange={(e) => setNewEnvironmentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New environment name"
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={newEnvironmentName.trim() === "" || createEnvironment.isPending}
          >
            Create
          </Button>
        </div>

        {isLoading && <p className="py-4 text-sm text-slate-400">Loading environments…</p>}

        {!isLoading && environments && environments.length === 0 && (
          <EmptyState
            title="No environments yet"
            description={
              scope
                ? `Create one above to store variables like {{baseUrl}} just for requests saved in "${scope.collectionName}".`
                : "Create one above to store variables like {{baseUrl}} that your requests can reference."
            }
          />
        )}

        <div className="flex flex-col gap-2">
          {environments?.map((environment) => (
            <EnvironmentSection
              key={environment.id}
              environment={environment}
              expanded={expandedId === environment.id}
              onToggleExpanded={() => setExpandedId((id) => (id === environment.id ? null : environment.id))}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
