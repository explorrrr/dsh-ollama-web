import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config, snapshot } from './config.js';
import { OllamaSearchProvider } from './provider.js';
import { detectPackageInstall, profileFromBaseUrl, readPackageVersion } from './update/install.js';
import { createUpdateDispatch, registerFetchRoutes, registerRpcChannel } from './update/rpc.js';
import { UpdateService } from './update/service.js';
import { LEGACY_CLIENT_PACKAGE } from './update/types.js';
import type { ConfigRefs, InjectScope, PluginContext } from './types.js';

export const name = 'ollama-web';
export const inject = ['web'];

export { Config };
export { OLLAMA_PROVIDER_ID } from './provider.js';
export type { ConfigRefs, PluginContext } from './types.js';

/** Register the Ollama Cloud search provider on the DSH web seam. */
export function apply(ctx: PluginContext, config: ConfigRefs): void {
  ctx.web.registerSearchProvider(new OllamaSearchProvider(() => snapshot(ctx, config)));
  try {
    startUpdateService(ctx);
  } catch (error) {
    ctx.logger?.warn?.('ollama-web: could not start the update service', error);
  }
}

/**
 * Cordis traces services through a provider shadow. Rebind the Connection
 * service to the caller scope that actually injected webServer.
 */
function rpcFrom(scope: InjectScope): unknown {
  const traced = scope.connection as Record<PropertyKey, unknown> | undefined;
  if (traced === undefined || traced === null) return undefined;
  const original = traced[Symbol.for('cordis.original')];
  if (original !== undefined && original !== traced) {
    const bound = Object.create(original as object) as Record<PropertyKey, unknown> & { ctx?: unknown };
    bound.ctx = scope;
    return bound.rpc;
  }
  return traced.rpc;
}

function startUpdateService(ctx: PluginContext): void {
  const profile = profileFromBaseUrl(ctx.baseUrl);
  if (profile === undefined) return;
  const packageDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
  const runningVersion = readPackageVersion(packageDir);
  if (runningVersion === null) return;
  const legacy = detectPackageInstall(profile, LEGACY_CLIENT_PACKAGE);
  if (legacy.linked || legacy.dirs.length > 0) {
    ctx.logger?.warn?.(
      'ollama-web: dsh-ollama-web-client is no longer used; remove it and reinstall dsh-ollama-web',
    );
  }
  const service = new UpdateService({
    profile,
    packageName: 'dsh-ollama-web',
    packageDir,
    runningVersion,
    dataDir: join(profile.dir, 'data', 'dsh-ollama-web'),
    ...(ctx.logger === undefined
      ? {}
      : { logger: (message: string, error?: unknown) => ctx.logger?.warn?.(message, error) }),
  });
  const dispatch = createUpdateDispatch(service);
  ctx.effect?.(() => () => service.dispose(), 'ollama-web: update service');
  ctx.inject?.(['connection'], (scope) => {
    registerFetchRoutes(scope.connection, dispatch, (message, error) => {
      ctx.logger?.warn?.(message, error);
    });
  });
  ctx.inject?.(['connection', 'webServer'], (scope) => {
    registerRpcChannel(rpcFrom(scope), dispatch, (message, error) => {
      ctx.logger?.warn?.(message, error);
    });
  });
}

export default { name, inject, Config, apply };
