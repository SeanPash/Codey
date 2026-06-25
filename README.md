<div align="center">

# Codey

### See what Claude Code is actually doing.

Codey is a plugin for Claude Code that narrates every move it makes, live, in plain English. No more staring at silent tool calls wondering if it's working or stuck.

**Live narration** · **Interactive timeline** · **Session replay** · **Stuck detection** · **Private by default**

</div>

<!-- SCREENSHOT NEEDED: hero shot of the browser timeline showing the live now-strip at the top, the per-task storyboard down the page, and the token-breakdown chart -->
![Codey timeline](assets/timeline.png)

## Install

Codey is a Claude Code plugin. From any Claude Code session:

```
/plugin marketplace add SeanPash/Codey
/plugin install codey@codey
```

Restart your session so the hooks load, then run `/codey:simple` to turn narration on. Codey ships prebuilt, so there is no build step.

That's it. It uses the Claude Code login you already have. No API keys. No accounts. No setup.

## Why Codey?

You send Claude Code off on a task and the terminal goes quiet. Behind that silence it might fire thirty tool calls, and every one of them looks the same from the outside.

Is it making progress? Retrying the same dead end? Quietly burning tokens on the wrong file? You can't tell. So you either babysit a stream of raw logs you have to decode, or you walk away and hope it figured things out.

Codey closes that gap. It reads the tool-call stream Claude Code already produces and turns it into something you can follow at a glance, while you work, for almost nothing until you ask for more. You stop guessing and start watching.

## Features

### A timeline that tells the story

`/codey:timeline` opens a local browser page that lays out the whole session as a visual storyboard. A live strip at the top shows what Claude is doing this very moment and follows along as it moves. Below it, the run unfolds as a sequence of readable steps grouped by the prompt that started them, with failures and warnings flagged right where they happened.

Session stats give you the shape of the run at a glance, and a token-breakdown chart shows exactly where your tokens went, split across reading, writing, searching, running commands, and thinking, with the priciest task called out.

<!-- SCREENSHOT NEEDED: the browser timeline with the live now-strip, per-task storyboard, and stats -->
![Codey timeline](assets/timeline.png)

### Narration right in your terminal

While Codey is on, the bottom of your terminal becomes a two-line readout: the current step on top, the plain-English reason for it underneath. It updates as Claude works, so a glance tells you whether things are on track. When a turn ends, it settles into a short recap and points you at the full timeline.

At the lightest setting it costs almost nothing. You choose how much it says.

<!-- SCREENSHOT NEEDED: the terminal status line, action on top, reason underneath -->
![Codey status line](assets/status-line.png)

### Knows when Claude is stuck

Some of the most useful work Codey does is free. Pure, AI-free detectors watch the live run and flag trouble the moment it shows up: **looping** on the same input, **repeating** the same error, or **hanging** far past a reasonable time.

When something fires, the stuck task gets an amber bar with three choices: nudge it to move on, push it toward a different approach, or stop and hand control back to you. One click feeds Claude a short, plain reason it reads and acts on. Codey only ever observes and suggests. It never acts without your click.

<!-- SCREENSHOT NEEDED: the amber intervention bar on a stuck task with the three buttons -->
![Stuck-task intervention](assets/intervention.png)

### Explain any step, only when you want

The timeline is readable for free. When a step makes you curious, click it for a deeper, on-demand explanation of what happened and why. You spend a few tokens only on the steps you choose, so you stay cheap by default and dig in exactly where it matters. The same works for a whole prompt: ask for a recap of everything Claude got done that turn.

<!-- SCREENSHOT NEEDED: the token-breakdown chart with a label next to each color -->
![Token breakdown chart](assets/token-breakdown.png)

### Replay any session

The timeline isn't just for the run happening right now. A sessions sidebar lets you flip between every recent session and replay any of them step by step, so you can go back and understand a run after it finished.

<!-- SCREENSHOT NEEDED: the sessions sidebar with multiple recent sessions, one selected for replay -->

## Without Codey vs with Codey

| Without Codey | With Codey |
| --- | --- |
| Silent tool calls | Live narration |
| Raw logs | Visual timeline |
| Guess what Claude is doing | Read a story |
| Wonder if it's stuck | Automatic stuck detection |
| Dig through transcripts | Click any step for details |

## Perfect for

- Long Claude Code sessions
- Multi-agent workflows
- Learning how Claude solves problems
- Debugging agent behavior
- Understanding token usage
- Following autonomous coding sessions

## Private by default

Codey needs no API keys and no external services. The only brain it uses is your own Claude Code, run headless on the login you already have. Everything flows one direction through local files on your machine.

Your code, your prompts, and your project never leave it.

## Commands

Type `/codey` in Claude Code and the picker lists everything.

| Command | What it does |
| --- | --- |
| `/codey:simple` | Narration on, one calm line, near-zero tokens. |
| `/codey:deep` | Narration on, plus the why behind each step. |
| `/codey:teach` | Narration on, plus it teaches the concepts as Claude works. |
| `/codey:timeline` | Opens the browser storyboard for the session. |
| `/codey:off` | Stops narrating and restores your plain status line. |

The three narration modes are really one knob: how many tokens you spend to understand more. `simple` is brief and nearly free, `deep` explains why each step matters, and `teach` explains the work and the ideas behind it. Narration draws on the same Claude plan as your normal work, so the deeper modes cost more of your quota. The timeline stays cheap either way and only spends when you click for an explanation.

## Local development

To hack on Codey, clone and build it yourself, then add the folder as a local plugin:

```bash
git clone https://github.com/SeanPash/Codey.git
cd Codey
npm install
npm run build
```

The hooks run the compiled output in `dist/`, so the build needs to succeed before your first session.

## Requirements

- Node.js 20 or newer.
- An active Claude Code install and login.

## License

MIT.
