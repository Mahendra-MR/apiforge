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

export function environmentsQueryKey() {
  return ["environments"] as const;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function useEnvironmentsList() {
  return useQuery({ queryKey: environmentsQueryKey(), queryFn: fetchEnvironments });
}

/** The active environment's variables as a flat key→value map, ready for `resolveVariables`/`buildExecutePayload`. Empty when no environment is active (or none exist yet). */
export function useActiveEnvironmentVariables(): Record<string, string> {
  const { data: environments } = useEnvironmentsList();
  const active = environments?.find((environment) => environment.isActive);
  if (!active) return {};
  return Object.fromEntries(active.variables.map((variable) => [variable.key, variable.value]));
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
  return useEnvironmentsMutation((name: string) => createEnvironment(name), "Failed to create environment");
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
