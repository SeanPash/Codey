# Codey

**Watch Claude Code work, in plain English, as it happens.**

When Claude Code goes off and works on its own, you usually get silence and a wall of tool calls. Codey turns that into a running commentary you can actually read. A calm line at the bottom of your terminal tells you what Claude is doing and why, and a browser timeline lays out the whole session step by step so you can see exactly where the time and tokens went. When Claude gets stuck, Codey tells you, and lets you step in.

It runs on the Claude Code you already have. No API keys, no extra services, nothing about your work ever leaves your machine.

<!-- SCREENSHOT NEEDED: hero shot of the browser timeline showing the live now-strip at the top, the per-task storyboard down the page, and the token-breakdown chart -->
![Codey timeline](assets/timeline.png)

## Why Codey

A single request can fan out into dozens of tool calls, and from the outside they all look the same. Is it making progress, retrying the same dead end, or quietly burning tokens on the wrong thing? Without a window into the run, you either hover and read raw logs or walk away and hope.

Codey gives you that window. It reads the tool-call stream Claude Code already produces and turns it into something a person can follow at a glance, live, while keeping the cost close to zero until you ask for more.

## The status line

While Codey is on, the bottom of your terminal becomes a two-line readout: the current step on top, the plain-English reason for it underneath. It updates as Claude works, so a quick glance tells you whether things are on track. When a turn finishes, the line settles into a short recap and points you at the full timeline.

You pick how much it says with a depth mode (see [The modes](#the-modes)). At the lightest setting it costs almost nothing.

<!-- SCREENSHOT NEEDED: the terminal status line while Codey is on, showing the current action on the top line and the reason on the second line -->
![Codey status line](assets/status-line.png)

## The timeline

`/codey:timeline` opens a local browser page that turns the whole session into a visual storyboard. This is where Codey really shines.

- **A live now-strip** at the top shows what Claude is doing this very moment, and follows along as the session moves.
- **A per-task storyboard** lays out the run as a sequence of readable steps, grouped by the prompt that started them, with failed steps and warnings called out right where they happened.
- **Session stats** give you the shape of the run at a glance: how long it has taken, how many tasks, and the totals.
- **A token-breakdown chart** shows where your tokens actually went, split across reading files, writing files, searching, running commands, and thinking, with the priciest task called out.
- **A sessions sidebar** lets you flip between every recent session and replay any of them, not just the one running now.

### Understand any step, only when you want to

The timeline is readable for free. When a particular step makes you curious, click it for a deeper, on-demand explanation of what happened and why. You spend a few tokens only on the steps you choose, so you can stay cheap by default and dig in exactly where it matters. The same works for a whole prompt: ask for a recap of everything Claude got done in that turn.

<!-- SCREENSHOT NEEDED: the token-breakdown chart from the timeline, showing tokens split across reading, writing, searching, commands, and thinking with a label next to each color -->
![Token breakdown chart](assets/token-breakdown.png)

## When Claude gets stuck

Some of the most useful work Codey does costs nothing at all. Pure, AI-free detectors watch the live session for trouble and flag it the moment it appears:

- **Looping**, when the same tool runs with the same input over and over.
- **Repeating errors**, when the same tool keeps failing the same way.
- **Hanging**, when a single action runs far past a reasonable time.

When something fires, the stuck task gets an amber bar on the timeline with three choices: **nudge it to move on**, **push it toward a different approach**, or **stop and hand control back to you**. One click blocks Claude's next matching tool call and feeds it a short, plain reason it reads and acts on.

It is a strong nudge, not a guaranteed halt, so each option also shows you the guaranteed manual path: press Esc to interrupt, then paste the one-line instruction Codey gives you. No tokens are spent on any of this, and Codey only ever observes and suggests. It never acts on your behalf without a click.

<!-- SCREENSHOT NEEDED: the timeline intervention bar on a stuck task, amber, with the three buttons (nudge / try a different approach / stop and ask me) -->
![Stuck-task intervention](assets/intervention.png)

## The five commands

Codey is driven by five slash commands. Type `/codey` in Claude Code and the picker lists them.

| Command | What it does |
| --- | --- |
| `/codey:simple` | Narration on, one calm line, near-zero tokens. |
| `/codey:deep` | Narration on, and it explains the why behind each step. |
| `/codey:teach` | Narration on, and it explains and teaches the concepts as Claude works. |
| `/codey:timeline` | Opens the browser storyboard for the session. |
| `/codey:off` | Stops narrating and restores your plain status line. |

## The modes

The three narration modes are really one knob: how many tokens you spend to understand more.

- **simple** is a single short line, occasionally. It tells you what is happening for almost nothing.
- **deep** speaks up more often and explains why a step matters. It costs a bit more.
- **teach** explains the work and teaches the ideas behind it, for when you want to learn as you watch. It is the richest mode and uses the most.

Narration draws on the same Claude plan as your normal work, so the deeper modes cost more of your quota. You decide the trade: brief and nearly free, or rich and more expensive. Either way, the timeline stays cheap by default and only spends when you click for a step explanation.

## Private by design

Codey needs no API keys and no external services. The only brain it uses is your own Claude Code, run headless on the login you already have. Everything flows one direction through local files on your machine. Your code, your prompts, and your project never leave it.

## Install

Codey is a Claude Code plugin. From any Claude Code session, add the marketplace and install it:

```
/plugin marketplace add SeanPash/Codey
/plugin install codey@codey
```

Then restart your session so the hooks load. Codey ships prebuilt, so there is no build step for this path.

### Local development

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
