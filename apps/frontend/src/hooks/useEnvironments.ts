import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  activateEnvironment,
  createEnvironment,
  createVariable,
  deleteEnvironment,
  deleteVariable,
  fetchEnvironments,
  renameEnvironment,
  updateVariable,
  type UpsertVariableInput,
} from "../api/environments";
import { ApiClientError } from "../api/client";
import { findTopLevelAncestorId } from "../lib/collectionsTree";
import { useCollectionsTree } from "./useCollections";

export function environmentsQueryKey() {
  return ["environments"] as const;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function useEnvironmentsList() {
  return useQuery({ queryKey: environmentsQueryKey(), queryFn: fetchEnvironments });
}

function variablesAsMap(variables: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(variables.map((variable) => [variable.key, variable.value]));
}

/** The active *global* environment's variables — i.e. ignoring any folder-scoped environment. Used where there's no request/folder context to scope by (e.g. the top bar's own environment switcher). Empty when no global environment is active. */
export function useActiveEnvironmentVariables(): Record<string, string> {
  const { data: environments } = useEnvironmentsList();
  const active = environments?.find((environment) => environment.isActive && environment.collectionId === null);
  return active ? variablesAsMap(active.variables) : {};
}

/**
 * The variables that actually apply to a request saved in `collectionId`:
 * that folder's own top-level environment when one is active, otherwise the
 * app-wide global active environment. Pass `null` for a request that isn't
 * saved into a folder yet, which always resolves to the global environment.
 */
export function useEffectiveEnvironmentVariables(collectionId: string | null): Record<string, string> {
  const { data: environments } = useEnvironmentsList();
  const { data: collectionsData } = useCollectionsTree();
  const topLevelId = findTopLevelAncestorId(collectionsData?.collections ?? [], collectionId);

  const scoped = topLevelId ? environments?.find((e) => e.collectionId === topLevelId && e.isActive) : undefined;
  const active = scoped ?? environments?.find((e) => e.collectionId === null && e.isActive);

  return active ? variablesAsMap(active.variables) : {};
}

/** Wraps a mutation that only needs to invalidate the environments list on success and toast on failure — every mutation below follows this same shape. */
function useEnvironmentsMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  errorFallback: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: environmentsQueryKey() }),
    onError: (error) => toast.error(errorMessage(error, errorFallback)),
  });
}

export function useCreateEnvironment() {
  return useEnvironmentsMutation(
    ({ name, collectionId }: { name: string; collectionId?: string | null }) =>
      // Only pass collectionId through when it's actually set — createEnvironment(name)
      // with a single argument is what makes a global environment, same as before
      // per-folder environments existed.
      collectionId ? createEnvironment(name, collectionId) : createEnvironment(name),
    "Failed to create environment",
  );
}

export function useRenameEnvironment() {
  return useEnvironmentsMutation(
    ({ id, name }: { id: string; name: string }) => renameEnvironment(id, name),
    "Failed to rename environment",
  );
}

export function useActivateEnvironment() {
  return useEnvironmentsMutation((id: string) => activateEnvironment(id), "Failed to switch environment");
}

export function useDeleteEnvironment() {
  return useEnvironmentsMutation((id: string) => deleteEnvironment(id), "Failed to delete environment");
}

export function useCreateVariable() {
  return useEnvironmentsMutation(
    ({ environmentId, input }: { environmentId: string; input: UpsertVariableInput }) =>
      createVariable(environmentId, input),
    "Failed to add variable",
  );
}

export function useUpdateVariable() {
  return useEnvironmentsMutation(
    ({
      environmentId,
      variableId,
      input,
    }: {
      environmentId: string;
      variableId: string;
      input: Partial<UpsertVariableInput>;
    }) => updateVariable(environmentId, variableId, input),
    "Failed to update variable",
  );
}

export function useDeleteVariable() {
  return useEnvironmentsMutation(
    ({ environmentId, variableId }: { environmentId: string; variableId: string }) =>
      deleteVariable(environmentId, variableId),
    "Failed to delete variable",
  );
}
