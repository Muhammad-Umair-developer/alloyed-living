// Tracks whether the user actively signed in during THIS page load.
//
// This is a module-level flag living in the browser bundle: it survives
// client-side navigation (the module instance persists) but is reset to `false`
// on every full page reload (a reload creates a fresh JS runtime). The dashboard
// uses it to force a fresh sign-in after every reload — a restored session is
// only honoured if the user actually authenticated in the current load.
let authedThisLoad = false

export function markAuthedThisLoad(): void {
  authedThisLoad = true
}

export function wasAuthedThisLoad(): boolean {
  return authedThisLoad
}
