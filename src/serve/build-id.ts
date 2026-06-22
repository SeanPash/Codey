// Identity of a build: the install directory that holds the running code. Two different
// plugin installs (for example before and after an update) live under different paths, so the
// launcher can tell a stale server apart from the current one and replace it instead of
// silently reconnecting to the old page.
//
// Given an entry path like ".../codey/<hash>/dist/cli/serve.js" this returns ".../<hash>",
// the install root. Works for a dev run from "src/" too. Falls back to the path itself.
export function buildIdFrom(entryPath: string): string {
  const norm = entryPath.replace(/\\/g, "/");
  for (const marker of ["/dist/", "/src/"]) {
    const i = norm.lastIndexOf(marker);
    if (i >= 0) return norm.slice(0, i);
  }
  return norm;
}
