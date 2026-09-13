import "server-only";

import type {
  GoogleIntegrationContext,
  GoogleIntegrationId,
  GoogleOperationResult,
  GooglePlatformState,
  GoogleValidationResult,
} from "./types";
import { googleIntegrationRegistry } from "./registry";
import { emitEvent } from "./events";
import { executeLiveGoogleOperation } from "./live-operations";

export async function executeGoogleOperation(
  state: GooglePlatformState,
  ctx: GoogleIntegrationContext,
  integrationId: GoogleIntegrationId,
  operationId: string,
  params: Record<string, unknown> = {},
  options?: { dryRun?: boolean },
): Promise<{ result: GoogleOperationResult; state: GooglePlatformState }> {
  const def = googleIntegrationRegistry.require(integrationId);
  const operation = def.operations.find((op) => op.id === operationId);
  if (!operation) {
    return {
      result: { ok: false, message: `Unknown operation: ${operationId}` },
      state,
    };
  }

  const deps = googleIntegrationRegistry.checkDependencies(integrationId, ctx);
  if (!deps.ok) {
    return {
      result: { ok: false, message: deps.message },
      state: emitEvent(state, "SyncFailed", integrationId, deps.message, { operationId }),
    };
  }

  const dryRun = options?.dryRun ?? (operation.supportsDryRun && def.capabilities.supportsDryRun
    ? googleIntegrationRegistry.resolvePolicy(integrationId, ctx).dryRunDefault
    : false);

  let next = emitEvent(state, "SyncStarted", integrationId, `Started ${operation.title}`, {
    operationId,
    dryRun,
  });

  try {
    const liveResult = await executeLiveGoogleOperation(integrationId, operationId, params, {
      dryRun,
    });
    const handler = def.operationHandlers[operationId];
    const result =
      liveResult ??
      (handler
        ? await handler({ ...ctx, platform: next }, params, { dryRun })
        : { ok: false, message: `No handler for ${operationId}` });

    if (!liveResult && !handler) {
      next = emitEvent(next, "SyncFailed", integrationId, `No handler for ${operationId}`);
      return { result, state: next };
    }

    next = emitEvent(
      next,
      result.ok ? "SyncCompleted" : "SyncFailed",
      integrationId,
      result.message,
      { operationId, dryRun },
    );
    next = emitEvent(next, "OperationExecuted", integrationId, `${operation.title}: ${result.message}`, {
      operationId,
      ok: result.ok,
    });
    return { result, state: next };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    next = emitEvent(next, "SyncFailed", integrationId, message, { operationId });
    return { result: { ok: false, message }, state: next };
  }
}

export async function validateGoogleIntegration(
  state: GooglePlatformState,
  ctx: GoogleIntegrationContext,
  integrationId: GoogleIntegrationId,
  options?: { dryRun?: boolean },
): Promise<{ result: GoogleValidationResult; state: GooglePlatformState }> {
  const def = googleIntegrationRegistry.require(integrationId);
  try {
    const result = await def.validationHandler.validate({ ...ctx, platform: state }, options);
    const next = emitEvent(
      state,
      result.ok ? "ValidationPassed" : "ValidationFailed",
      integrationId,
      result.message,
    );
    return { result, state: next };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      result: { ok: false, message },
      state: emitEvent(state, "ValidationFailed", integrationId, message),
    };
  }
}

export function listOperations(integrationId: GoogleIntegrationId) {
  return googleIntegrationRegistry.require(integrationId).operations;
}
