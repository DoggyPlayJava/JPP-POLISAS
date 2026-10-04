/**
 * Global event bus trigger for Command Palette
 */
export function triggerCommandPalette(open: boolean = true) {
  window.dispatchEvent(new CustomEvent('jpp:open-command-palette', { detail: { open } }));
}
