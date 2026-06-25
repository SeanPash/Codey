# Codey

**See what Claude Code is actually doing, live, in plain English, for almost no tokens.**

Codey is a Claude Code plugin that makes a running session legible. While Claude works, Codey narrates each step in plain English and tells you why, warns you when Claude looks stuck, and gives you a visual browser timeline of the whole run with a per-task token breakdown. It runs entirely on your own Claude Code login. No external API keys, no extra services, nothing leaves your machine.

<!-- SCREENSHOT NEEDED: hero shot of the browser timeline showing the live now-strip at the top, the per-task storyboard down the page, and the token-breakdown chart -->
![Codey timeline](assets/timeline.png)

## Why Codey

Long autonomous agent runs are opaque. A single request can fan out into dozens of tool calls, and from the outside they all look the same. You are left guessing: is it making progress, is it stuck in a loop, is it quietly burning tokens on the wrong thing?

Codey closes that gap. It sits next to your session like a commentator, reads the same tool-call stream Claude Code already emits, and turns it into something a human can follow at a glance. You always know what is happening, why, and what it cost.

## How it works

Codey is built on a simple, one-direction data flow through local files. Nothing talks to the outside world.

- Claude Code fires `PreToolUse` and `PostToolUse` hooks on every tool call. A tiny hook script normalizes each event and appends it as one line to a per-session log at `~/.codey/sessions/<id>/events.jsonl`.
- A background watcher tails that log. Cheap, AI-free detectors flag loops, repeated errors, and hangs. A throttled narration engine turns recent events into a plain-English line by shelling out to your own Claude Code in headless mode (`claude -p --model haiku`).
- The status line at the bottom of your terminal shows the current step and the reason. The browser timeline reads the same local log and renders the full storyboard.

The narration runs through the Claude Code you already have, reusing your existing login and plan. That is the whole point of the design: no separate API key to manage, no service to trust, and your code, prompts, and project never leave your machine. The only data path is local files.

## Installation

Codey is a Claude Code plugin. The repo lives at [github.com/SeanPash/Codey](https://github.com/SeanPash/Codey).

Clone and build it locally, then point Claude Code's plugin config at the folder:

```bash
git clone https://github.com/SeanPash/Codey.git
cd Codey
npm install
npm run build
```

Then add the cloned folder as a local plugin in Claude Code and restart your session so the hooks load. The hooks invoke the compiled output in `dist/`, so `npm run build` must succeed before your first session.

## The commands

Codey is controlled by five slash commands inside Claude Code. The surface is kept deliberately small.

| Command | What it does | When to use it |
| --- | --- | --- |
| `/codey:simple` | Narration on, simple mode. One short line, near-zero tokens. | You want a light, always-on sense of what Claude is doing. |
| `/codey:deep` | Narration on, deep mode. Explains the *why* behind each step. | You want the reasoning, and you are fine spending a few more tokens. |
| `/codey:teach` | Narration on, teach mode. Explains and teaches the underlying concepts as Claude works. | You are learning and want the richest explanation. |
| `/codey:timeline` | Opens the visual storyboard of the session in your browser. | You want the full picture: per-task timeline, live strip, stats, and where your tokens went. |
| `/codey:off` | Narration off, plain status line restored. | You are done and want your terminal quiet again. |

Claude Code namespaces plugin commands as `plugin:command`, so the `codey:` prefix is the plugin name. Type `/codey` to see the picker.

## The modes

The three narration modes are one knob: how many tokens you spend to understand more.

- **simple** is one short sentence, occasionally. Near-zero tokens. It tells you *what* is happening.
- **deep** runs more often and explains *why* it matters. It costs more of your plan.
- **teach** explains the work and teaches the concepts behind it, for someone who wants to learn as they watch. It is the richest mode and uses the most tokens.

Narration draws on the same Claude plan as your normal Claude Code work, so deeper modes cost more of your quota. You decide the trade: nearly free and brief, or richer and more expensive.

## The timeline

`/codey:timeline` opens a localhost page that lays the whole session out visually:

- A live **now-strip** at the top showing what Claude is doing this very moment.
- A per-task **storyboard**, each step recapped in plain English, with failed steps and warnings shown inline where they happened.
- **Session stats** for the run at a glance.
- A **token-breakdown chart** showing where your tokens actually went: reading files, writing files, searching, running commands, and thinking.

You can click any step to pull an on-demand explanation, so you only spend tokens explaining the parts you care about. The page works live as Claude runs and as a replay of any past session under `~/.codey/sessions/`.

<!-- SCREENSHOT NEEDED: the token-breakdown chart from the timeline, showing tokens split across reading, writing, searching, commands, and thinking with a label next to each color -->
![Token breakdown chart](assets/token-breakdown.png)

## The status line

While Codey is on, the bottom of your terminal becomes a two-line readout: the current action on top, the plain-English reason (or a warning) underneath. It updates as Claude works and is the one surface a background process can refresh live, which is why narration lives there. Turn it off with `/codey:off` and your plain status line comes back.

<!-- SCREENSHOT NEEDED: the terminal status line while Codey is on, showing the current action on the top line and the reason on the second line -->
![Codey status line](assets/status-line.png)

## Stuck detection

Codey watches for trouble without spending a single token. The detectors are pure code, no AI involved, so they are effectively free and always on:

- **Looping** when the same tool runs with the same input over and over.
- **Repeating errors** when the same tool keeps failing with the same error.
- **Hanging** when a single action runs far past a reasonable time threshold.

When one fires, you see it in the status line and on the timeline, called out on the exact step where it happened.

## Privacy

Codey requires no external API keys and no external services. The only brain it uses is your own Claude Code, running headless on the login you already have. Data flows one direction through local files on your machine. Your code, your prompts, and your project never leave it.

## Requirements

- Node.js 20 or newer.
- An active Claude Code install and login.

## License

MIT.
