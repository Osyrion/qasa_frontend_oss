/** Full-page navigation (drops all in-memory state). Indirection keeps it mockable in tests. */
export function hardRedirect(path: string): void {
  window.location.assign(path)
}
