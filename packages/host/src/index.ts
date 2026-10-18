import { Config, snapshot } from './config.js';
import { OllamaSearchProvider } from './provider.js';
import type { ConfigRefs, PluginContext } from './types.js';

export const name = 'ollama-web';
export const inject = ['web'];

export { Config };
export { OLLAMA_PROVIDER_ID } from './provider.js';
export type { ConfigRefs, PluginContext } from './types.js';

/** Register the Ollama Cloud search provider on the DSH web seam. */
export function apply(ctx: PluginContext, config: ConfigRefs): void {
  ctx.web.registerSearchProvider(new OllamaSearchProvider(() => snapshot(ctx, config)));
}

export default { name, inject, Config, apply };
