// Shell intent: turn a raw command into a human purpose, not a tool category. Codey should
// say what Claude is trying to accomplish ("checking the installed plugin config"), never
// what program it happened to invoke ("running a few shell commands"). This stays strictly
// deterministic and grounded: it reads the command's program, obvious arguments, and Claude's
// own one-line description. It never inspects file contents or guesses at risky specifics.

export interface ShellIntent {
  subject: string;   // a plain noun phrase: "the installed plugin config", "the project tests"
  title: string;     // a short purpose headline: "Checking installed plugin config"
  sentence: string;  // one sentence, always starting "Claude is ...": what Claude is doing
}

function intent(subject: string, title: string, sentence: string): ShellIntent {
  return { subject, title, sentence };
}

function firstWord(cmd: string): string {
  return (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
}

// Everything after the program name, for matching subcommands and arguments.
function rest(cmd: string): string {
  return cmd.replace(/^\s*\S+\s*/, "");
}

// Paths that read as throwaway scratch work, so we can say "temporary files" / "demo files".
const TEMP_HINT = /\b(tmp|temp|scratch|demo|sample|example|fixture)s?\b/i;

// A git subcommand that only reports, versus one that changes the repo.
const GIT_READ = new Set(["status", "diff", "log", "show", "branch", "remote", "describe", "rev-parse"]);

// Match the common command shapes to a real purpose. Returns null when nothing is recognisable,
// so the caller can fall back to a description or, only then, a plain phrase.
function commandIntent(cmd: string): ShellIntent | null {
  const word = firstWord(cmd);
  const tail = rest(cmd);

  // Test runners, builds, and checks, however they are invoked.
  if (/\b(vitest|jest|mocha|pytest|phpunit)\b/.test(cmd)) {
    return intent("the tests", "Running the tests", "Claude is running the tests to check the work.");
  }
  if (word === "npm" || word === "pnpm" || word === "yarn" || word === "npx") {
    if (/\btest\b/.test(tail)) {
      return intent("the tests", "Running the tests", "Claude is running the tests to check the work.");
    }
    if (/\bbuild\b/.test(tail)) {
      return intent("the build", "Rebuilding the project", "Claude is rebuilding the project so the latest code takes effect.");
    }
    if (/\b(install|ci)\b|^\s*i\b/.test(tail)) {
      return intent("the dependencies", "Installing dependencies", "Claude is installing the project's dependencies.");
    }
    if (/\b(typecheck|tsc|lint|eslint)\b/.test(tail)) {
      return intent("the code", "Checking the code", "Claude is checking the code for type and lint problems.");
    }
    const run = tail.match(/run\s+(\S+)/);
    if (run) return intent(`the ${run[1]} script`, `Running the ${run[1]} script`, `Claude is running the ${run[1]} script.`);
    return intent("the project tasks", "Running a project task", "Claude is running a project task.");
  }
  if (word === "tsc" || word === "eslint" || word === "prettier") {
    return intent("the code", "Checking the code", "Claude is checking the code for problems.");
  }

  // Git: reporting versus changing the repo.
  if (word === "git") {
    const sub = (tail.trim().split(/\s+/)[0] || "").toLowerCase();
    if (GIT_READ.has(sub)) {
      return intent("the local changes", "Checking local changes", "Claude is checking the local changes in the repository.");
    }
    if (sub === "commit") return intent("the changes", "Committing the changes", "Claude is committing the changes.");
    if (sub === "push") return intent("the changes", "Pushing the changes", "Claude is pushing the changes to the remote.");
    if (sub === "add") return intent("the changes", "Staging the changes", "Claude is staging the changes for a commit.");
    if (sub === "checkout" || sub === "switch") return intent("a branch", "Switching branches", "Claude is switching to another branch.");
    if (sub) return intent(`the ${sub} step`, `Running git ${sub}`, `Claude is running git ${sub}.`);
  }

  // Searching the project. A search for a plugin/config target reads as exactly that.
  if (word === "grep" || word === "rg" || word === "ag" || word === "ack" || word === "find") {
    if (/installed_plugins|plugins[\\/]?config|config\.json|settings\.json/i.test(cmd)) {
      return intent("the installed plugin config", "Checking installed plugin config",
        "Claude is checking the installed plugin config.");
    }
    return intent("the project", "Searching the project", "Claude is searching the project for something.");
  }

  // Moving around the tree. The Claude plugin cache is a known, nameable place.
  if (word === "cd") {
    if (/\.claude[\\/]+plugins/i.test(cmd)) {
      return intent("the Claude plugin cache", "Inspecting plugin cache",
        "Claude is looking inside the Claude plugin cache.");
    }
    return intent("another folder", "Switching folders", "Claude is moving to another folder.");
  }

  // Listing files. Several source folders at once reads as a survey of the source areas.
  if (word === "ls" || word === "dir") {
    const srcDirs = (tail.match(/(?:^|\s)src[\\/]\S+/g) || []).length;
    if (srcDirs >= 2 || /\b(caption|serve|narration|capture|warnings)\b/.test(tail)) {
      return intent("the source folders", "Checking the source areas",
        "Claude is checking the project's source folders to confirm the layout.");
    }
    return intent("the files here", "Listing the files", "Claude is listing the files in this folder.");
  }

  // Cleaning up versus removing real files.
  if (word === "rm" || word === "del" || word === "unlink" || word === "rmdir") {
    if (TEMP_HINT.test(cmd)) {
      return intent("the temporary files", "Cleaning up temporary files", "Claude is cleaning up temporary files.");
    }
    return intent("some files", "Removing files", "Claude is removing files that are no longer needed.");
  }

  // Creating scratch files versus a real folder.
  if (word === "mkdir" || word === "touch") {
    if (TEMP_HINT.test(cmd)) {
      return intent("the demo files", "Creating demo files", "Claude is creating demo files to work with.");
    }
    if (word === "mkdir") return intent("a folder", "Creating a folder", "Claude is creating a folder.");
    return intent("a file", "Creating a file", "Claude is creating a file.");
  }

  // Reading a file through the shell.
  if (word === "cat" || word === "less" || word === "more" || word === "head" || word === "tail") {
    return intent("a file", "Reading a file", "Claude is reading a file's contents.");
  }

  // Running a script directly. A test file is still about checking the work.
  if (["node", "python", "python3", "tsx", "ts-node", "deno", "bun"].includes(word)) {
    if (/\btest\b/.test(tail)) {
      return intent("the tests", "Running the tests", "Claude is running the tests to check the work.");
    }
    const file = (tail.trim().split(/\s+/).find((t) => !t.startsWith("-")) || "").split(/[\\/]/).pop();
    if (file) return intent(`the ${file} script`, `Running ${file}`, `Claude is running ${file}.`);
    return intent("a script", "Running a script", "Claude is running a script.");
  }

  if (word === "curl" || word === "wget") {
    return intent("something from the web", "Fetching from the web", "Claude is fetching something from the web.");
  }

  return null;
}

// Words at the start of Claude's description that read better as a gerund in our sentence.
const GERUND: Record<string, string> = {
  show: "checking", display: "checking", find: "checking", check: "checking", verify: "verifying",
  list: "listing", run: "running", build: "building", rebuild: "rebuilding", create: "creating",
  add: "adding", remove: "removing", delete: "removing", update: "updating", read: "reading",
  search: "searching", install: "installing", compare: "comparing", inspect: "inspecting",
  start: "starting", stop: "stopping", open: "opening", count: "counting", print: "printing",
};

// A description Claude rarely means literally; too vague to prefer over the command itself.
function descriptionIsVague(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  return d.length < 6 || /^(run|running)\s+(a\s+)?(command|script)\b/.test(d) || d === "command";
}

// Build an intent from Claude's own one-line description, which is already plain active voice.
function descriptionIntent(desc: string): ShellIntent {
  const clean = desc.trim().replace(/[.]+$/, "");
  const title = clean.charAt(0).toUpperCase() + clean.slice(1);
  const m = /^([A-Za-z]+)\b\s*(.*)$/.exec(clean);
  if (m && GERUND[m[1].toLowerCase()]) {
    const verb = GERUND[m[1].toLowerCase()];
    const tail = m[2].trim();
    const sentence = tail ? `Claude is ${verb} ${tail}.` : `Claude is ${verb} something.`;
    return intent(tail || clean, title, sentence);
  }
  // Unknown leading verb: keep the description as a faithful sentence rather than guessing.
  return intent(clean, title, `Claude is working on this: ${clean.charAt(0).toLowerCase() + clean.slice(1)}.`);
}

// The one entry point. Description first (it is Claude's own intent), then the command's obvious
// shape, then a plain honest fallback as a last resort.
export function describeShellIntent(command: string, description?: string | null): ShellIntent {
  const cmd = (command ?? "").trim();
  const desc = (description ?? "").trim();

  if (desc && !descriptionIsVague(desc)) return descriptionIntent(desc);

  const matched = commandIntent(cmd);
  if (matched) return matched;

  if (desc) return descriptionIntent(desc);

  // Nothing to go on: name the program plainly without echoing its arguments.
  const word = firstWord(cmd);
  if (word) return intent(`the ${word} step`, `Running ${word}`, `Claude is running ${word}.`);
  return intent("a shell command", "Running a command", "Claude is running a shell command.");
}
