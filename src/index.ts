import {TreeInputPlugin} from './plugin.js'

// The identifier of the plugin bundle.
export const id = 'tree'

// This plugin template injects a compiled CSS by the bundler replace step.
// The build replaces the bare `__css__` token with a string literal.
// See `vite.config.ts` for details
export const css = __css__

// Export your plugin(s) as a constant `plugins`
export const plugins = [TreeInputPlugin]
