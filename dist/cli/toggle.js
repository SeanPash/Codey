import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
export function withStatusLine(s, command) {
    return { ...s, statusLine: { type: "command", command } };
}
export function withoutStatusLine(s) {
    const next = { ...s };
    delete next.statusLine;
    return next;
}
function settingsPath() {
    return join(homedir(), ".claude", "settings.json");
}
function readSettings() {
    const p = settingsPath();
    if (!existsSync(p))
        return {};
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    }
    catch {
        return {};
    }
}
function writeSettings(s) {
    const p = settingsPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(s, null, 2));
}
// The plugin runs from dist/, so the status-line command points at the built CLI.
function statusLineCommand() {
    const cliRoot = process.env.CLAUDE_PLUGIN_ROOT ?? join(homedir(), ".codey");
    return `node "${join(cliRoot, "dist", "cli", "index.js")}" statusline`;
}
export function turnOn(mode, session) {
    writeSettings(withStatusLine(readSettings(), statusLineCommand()));
    const self = process.argv[1];
    const child = spawn(process.execPath, [self, "narrate", "--mode", mode, "--session", session], { detached: true, stdio: "ignore" });
    child.unref();
}
export function turnOff() {
    writeSettings(withoutStatusLine(readSettings()));
    // The narrator is detached; it exits on its own when the session ends. A pidfile-based
    // stop can be added if lingering processes turn out to be a problem.
}
