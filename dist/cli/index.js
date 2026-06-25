#!/usr/bin/env node
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command2) => {
          return Math.max(max, helper.subcommandTerm(command2).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str2, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str2.match(manualIndent)) return str2;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str2;
        const leadingStr = str2.slice(0, indent);
        const columnText = str2.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key2) => {
          if (this.positiveOptions.has(key2)) {
            this.dualOptions.add(key2);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str2) {
      return str2.split("-").reduce((str3, word) => {
        return str3 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str2) => process2.stdout.write(str2),
          writeErr: (str2) => process2.stderr.write(str2),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str2, write2) => write2(str2)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command2 = this; command2; command2 = command2.parent) {
          result.push(command2);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command2) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command2).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command2).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command2);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key2) {
        if (this._storeOptionsAsProperties) {
          return this[key2];
        }
        return this._optionValues[key2];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key2, value) {
        return this.setOptionValueWithSource(key2, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key2, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key2] = value;
        } else {
          this._optionValues[key2] = value;
        }
        this._optionValueSources[key2] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key2) {
        return this._optionValueSources[key2];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key2) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key2) !== void 0) {
            source = cmd.getOptionValueSource(key2);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName2) {
          const localBin = path.resolve(baseDir, baseName2);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName2))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key2 = this.options[i].attributeName();
            result[key2] = key2 === this._versionOptionName ? this._version : this[key2];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command2 = this;
          do {
            const moreFlags = command2.createHelp().visibleOptions(command2).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command2 = command2.parent;
          } while (command2 && !command2._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command2) => {
            candidateNames.push(command2.name());
            if (command2.alias()) candidateNames.push(command2.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str2, flags, description) {
        if (str2 === void 0) return this._version;
        this._version = str2;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str2}
`);
          this._exit(0, "commander.version", str2);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str2, argsDescription) {
        if (str2 === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str2;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str2) {
        if (str2 === void 0) return this._summary;
        this._summary = str2;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command2 = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command2 = this.commands[this.commands.length - 1];
        }
        if (alias === command2._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command2._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str2) {
        if (str2 === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str2;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str2) {
        if (str2 === void 0) return this._name;
        this._name = str2;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write2;
        if (context.error) {
          write2 = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write2 = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write2;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command2) => command2.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command2) => command2.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/cli/watch.ts
import { existsSync as existsSync4, readFileSync as readFileSync4, watchFile } from "node:fs";

// src/store/session-store.ts
import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
function defaultRoot() {
  return join(homedir(), ".codey", "sessions");
}
var SessionStore = class {
  file;
  constructor(sessionId, root = defaultRoot()) {
    const dir = join(root, sessionId);
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "events.jsonl");
  }
  append(event) {
    appendFileSync(this.file, JSON.stringify(event) + "\n");
  }
  readAll() {
    if (!existsSync(this.file)) return [];
    const out = [];
    for (const line of readFileSync(this.file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
      }
    }
    return out;
  }
  get path() {
    return this.file;
  }
  get dir() {
    return dirname(this.file);
  }
};

// src/store/session-meta.ts
import { writeFileSync, readFileSync as readFileSync2, mkdirSync as mkdirSync2, existsSync as existsSync2 } from "node:fs";
import { join as join2 } from "node:path";
function metaPath(sessionId, root) {
  return join2(root, sessionId, "meta.json");
}
function readMeta(sessionId, root = defaultRoot()) {
  const file6 = metaPath(sessionId, root);
  if (!existsSync2(file6)) return null;
  try {
    return JSON.parse(readFileSync2(file6, "utf8"));
  } catch {
    return null;
  }
}

// src/timeline/transcript.ts
import { readFileSync as readFileSync3, existsSync as existsSync3 } from "node:fs";
function resultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const t = content.find((b) => b && typeof b === "object" && b.type === "text");
    return t ? String(t.text ?? "") : null;
  }
  return null;
}
function firstAssistantText(blocks) {
  const tb = blocks.find((b) => b?.type === "text");
  if (tb && typeof tb.text === "string" && tb.text.trim()) {
    const one = tb.text.replace(/\s+/g, " ").trim();
    return one.length > 200 ? one.slice(0, 200) : one;
  }
  const th = blocks.find((b) => b?.type === "thinking");
  if (th && typeof th.thinking === "string" && th.thinking.trim()) {
    const one = th.thinking.replace(/\s+/g, " ").trim();
    return one.length > 120 ? one.slice(0, 120) : one;
  }
  return null;
}
function parseTranscript(text) {
  const recs = text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter((r) => r !== null);
  const results = /* @__PURE__ */ new Map();
  for (const r of recs) {
    const content = r.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (b?.type === "tool_result" && typeof b.tool_use_id === "string") {
        results.set(b.tool_use_id, { isError: b.is_error === true, text: resultText(b.content) });
      }
    }
  }
  const turns = [];
  for (const r of recs) {
    if (r.type !== "assistant") continue;
    const msg = r.message ?? {};
    const usage = msg.usage ?? {};
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    const toolUse = blocks.find((b) => b?.type === "tool_use");
    const hasThinking = blocks.some((b) => b?.type === "thinking");
    const res = toolUse ? results.get(toolUse.id) : void 0;
    turns.push({
      ts: Date.parse(r.timestamp ?? "") || 0,
      outputTokens: usage.output_tokens ?? 0,
      inputTokens: usage.input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      tool: toolUse?.name ?? (hasThinking ? "thinking" : null),
      input: toolUse?.input ?? null,
      isError: res?.isError ?? false,
      errorText: res?.isError ? res.text : null,
      toolUseId: toolUse?.id ?? null,
      assistantText: firstAssistantText(blocks)
    });
  }
  return turns;
}
function cleanPromptText(s) {
  const cmd = /<command-name>([^<]+)<\/command-name>/.exec(s);
  if (cmd) return "/" + cmd[1].trim().replace(/^\//, "");
  const head = s.trim();
  if (/^<(command-message|command-args|local-command-stdout|local-command-caveat|bash-input|bash-stdout)/.test(head)) return "";
  if (/^<system-reminder>/.test(head) || head.startsWith("Caveat:")) return "";
  if (/^\[request interrupted by user/i.test(head)) return "";
  if (head.startsWith("Base directory for this skill:")) return "";
  const t = s.replace(/\[Image #\d+\]/g, " ").replace(/\[Image:[^\]]*\]/g, " ").replace(/^\s*[❯>]\s+/, "").replace(/\s+/g, " ").trim();
  return t;
}
function userPrompts(text) {
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r.type !== "user") continue;
    if (r.isMeta === true) continue;
    const c = r.message?.content;
    let t = null;
    if (typeof c === "string" && c.trim()) {
      t = c.trim();
    } else if (Array.isArray(c)) {
      const hasToolResult = c.some((b) => b && typeof b === "object" && b.type === "tool_result");
      const tb = c.find((b) => b && typeof b === "object" && b.type === "text");
      if (!hasToolResult && tb && typeof tb.text === "string" && tb.text.trim()) t = tb.text.trim();
    }
    if (!t) continue;
    const clean = cleanPromptText(t);
    if (clean) out.push({ ts: Date.parse(r.timestamp ?? "") || 0, text: clean });
  }
  return out;
}
function readUserPrompts(path) {
  if (!path) return [];
  try {
    if (!existsSync3(path)) return [];
    return userPrompts(readFileSync3(path, "utf8"));
  } catch {
    return [];
  }
}
function lastInterruptTs(text) {
  let last = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r.type !== "user") continue;
    const c = r.message?.content;
    let t = null;
    if (typeof c === "string") t = c;
    else if (Array.isArray(c)) {
      const tb = c.find((b) => b && typeof b === "object" && b.type === "text");
      if (tb && typeof tb.text === "string") t = tb.text;
    }
    if (t && /^\[request interrupted by user/i.test(t.trim())) {
      const ts = Date.parse(r.timestamp ?? "") || 0;
      if (ts > last) last = ts;
    }
  }
  return last;
}
function readLastInterrupt(path) {
  if (!path) return 0;
  try {
    if (!existsSync3(path)) return 0;
    return lastInterruptTs(readFileSync3(path, "utf8"));
  } catch {
    return 0;
  }
}
var CONTROL_COMMANDS = /* @__PURE__ */ new Set(["/clear", "/compact"]);
function readFirstPrompt(path) {
  if (!path) return null;
  try {
    if (!existsSync3(path)) return null;
    const ps = userPrompts(readFileSync3(path, "utf8"));
    const named = ps.find((p) => !CONTROL_COMMANDS.has(p.text)) ?? ps[0];
    return named?.text ?? null;
  } catch {
    return null;
  }
}
function readTranscriptTurns(path) {
  if (!path) return [];
  try {
    if (!existsSync3(path)) return [];
    return parseTranscript(readFileSync3(path, "utf8"));
  } catch {
    return [];
  }
}

// src/warnings/open-calls.ts
function computeOpenCalls(events) {
  const openByTool = /* @__PURE__ */ new Map();
  for (const e of events) {
    const queue = openByTool.get(e.tool) ?? [];
    if (e.phase === "pre") {
      queue.push(e);
    } else if (queue.length > 0) {
      queue.shift();
    }
    openByTool.set(e.tool, queue);
  }
  return [...openByTool.values()].flat().sort((a, b) => a.timestamp - b.timestamp);
}

// src/warnings/detectors.ts
function detectLoop(events, threshold) {
  const pres = events.filter((e) => e.phase === "pre");
  if (pres.length === 0) return null;
  const last = pres[pres.length - 1];
  const key2 = last.tool + "|" + last.inputHash;
  let count = 0;
  for (let i = pres.length - 1; i >= 0; i--) {
    if (pres[i].tool + "|" + pres[i].inputHash === key2) count++;
    else break;
  }
  if (count < threshold) return null;
  return {
    kind: "loop",
    tool: last.tool,
    count,
    message: `Claude has tried this same step ${count} times - it might be stuck.`,
    timestamp: last.timestamp
  };
}
function detectRepeatError(events, threshold) {
  const errs = events.filter((e) => e.phase === "post" && e.isError);
  if (errs.length === 0) return null;
  const last = errs[errs.length - 1];
  const key2 = last.tool + "|" + (last.errorText ?? "");
  let count = 0;
  for (let i = errs.length - 1; i >= 0; i--) {
    if (errs[i].tool + "|" + (errs[i].errorText ?? "") === key2) count++;
    else break;
  }
  if (count < threshold) return null;
  return {
    kind: "repeat_error",
    tool: last.tool,
    count,
    message: `${last.tool} keeps failing with the same error.`,
    timestamp: last.timestamp
  };
}
function detectHang(openCalls, now, thresholdFor, lastActivityTs) {
  if (openCalls.length === 0) return null;
  const since = lastActivityTs ?? Math.max(...openCalls.map((c) => c.timestamp));
  const idle = now - since;
  for (const call of openCalls) {
    if (idle >= thresholdFor(call.tool)) {
      return {
        kind: "hang",
        tool: call.tool,
        count: Math.floor((now - call.timestamp) / 1e3),
        message: `This step (${call.tool}) is taking unusually long.`,
        timestamp: call.timestamp
      };
    }
  }
  return null;
}

// src/warnings/hang-config.ts
var DEFAULT_MS = 9e4;
var BY_TOOL = {
  // Subagents do their own multi-step work and routinely run for minutes.
  Task: 3e5,
  Agent: 3e5,
  // Shells run builds, installs, and test suites.
  Bash: 18e4,
  PowerShell: 18e4,
  // Fast tools: a stall here is worth surfacing quickly.
  Read: 45e3,
  Edit: 45e3,
  MultiEdit: 45e3,
  Write: 45e3,
  Grep: 45e3,
  Glob: 45e3
};
function hangThreshold(tool) {
  return BY_TOOL[tool] ?? DEFAULT_MS;
}

// src/warnings/reconcile.ts
import { randomUUID } from "node:crypto";
function reconcileErrors(events, turns) {
  const closed = /* @__PURE__ */ new Set();
  const preById = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (!e.toolUseId) continue;
    if (e.phase === "post") closed.add(e.toolUseId);
    else preById.set(e.toolUseId, e);
  }
  const synthetic = [];
  for (const turn of turns) {
    if (!turn.isError || !turn.toolUseId) continue;
    if (closed.has(turn.toolUseId)) continue;
    const pre = preById.get(turn.toolUseId);
    if (!pre) continue;
    synthetic.push({
      id: randomUUID(),
      phase: "post",
      tool: pre.tool,
      server: pre.server,
      input: pre.input,
      inputHash: pre.inputHash,
      isError: true,
      errorText: turn.errorText,
      timestamp: pre.timestamp,
      sessionId: pre.sessionId,
      toolUseId: pre.toolUseId
    });
  }
  if (synthetic.length === 0) return events;
  const rank = (e) => e.phase === "post" ? 1 : 0;
  return [...events, ...synthetic].sort((a, b) => a.timestamp - b.timestamp || rank(a) - rank(b));
}

// src/warnings/format.ts
function formatWarning(w) {
  return `\u26A0\uFE0F  ${w.message}`;
}

// src/narration/prompt.ts
function summarizeEvent(e) {
  const inputStr = JSON.stringify(e.input ?? null).slice(0, 200);
  const status = e.phase === "post" ? e.isError ? " [ERROR]" : " [done]" : "";
  return `- ${e.tool}${status} ${inputStr}`;
}
function buildNarrationPrompt(events, mode) {
  const lines = events.map(summarizeEvent).join("\n");
  const instruction2 = mode === "teach" ? "In two or three plain-English sentences for someone learning to code, first say what Claude is doing and the specific thing it is trying to verify, change, or protect, then teach the key concept behind this step and define any technical term you use. The concept sentence must add an idea, not just restate the what." : mode === "deep" ? "In one or two compact but rich plain-English sentences for a non-technical person, say what Claude is doing and, specifically, the purpose or relationship it is verifying, changing, or protecting, and how that connects to the request it is working on. Go beyond a bare description of the action: a reader should learn why this step matters here, not just that it happened." : "Write one sentence for a non-technical person saying what Claude is currently doing and, briefly, why. Keep it to a single concrete sentence.";
  return `These are the most recent actions an AI coding agent took:
${lines}

${instruction2}
Do not list the tools; describe the goal. Be specific and concrete: name the actual files, search terms, or commands involved so the reader knows exactly what is happening. Avoid vague filler like "several files", "the code", "running shell commands", "checking the code", or "thinking it through" when the actions name a real file, term, or purpose. Write plain English. Never use em dashes or hyphens to join clauses; use a period or a comma instead. Reply with only the explanation, no preamble.`;
}

// src/narration/throttle.ts
var PACING = {
  simple: { everyN: 1, minMs: 7e3 },
  deep: { everyN: 2, minMs: 5e3 },
  teach: { everyN: 3, minMs: 5e3 }
};
function shouldNarrate(mode, state) {
  const p = PACING[mode];
  return state.newEvents >= p.everyN && state.msSinceLast >= p.minMs;
}

// src/util/text.ts
function stripDashes(s) {
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/ - /g, ", ").replace(/ ,/g, ",").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
}

// src/narration/engine.ts
var WINDOW = 12;
var NarrationEngine = class {
  constructor(mode, narrate) {
    this.mode = mode;
    this.narrate = narrate;
  }
  lastCount = 0;
  lastAtMs = 0;
  // Called with the full event list so far. Returns narration text or null.
  async onEvents(events, nowMs) {
    const newEvents = events.length - this.lastCount;
    const msSinceLast = this.lastAtMs === 0 ? Infinity : nowMs - this.lastAtMs;
    if (!shouldNarrate(this.mode, { newEvents, msSinceLast })) return null;
    const window = events.slice(-WINDOW);
    const prompt = buildNarrationPrompt(window, this.mode);
    const text = await this.narrate(prompt);
    this.lastCount = events.length;
    this.lastAtMs = nowMs;
    return text ? stripDashes(text) : text;
  }
};

// src/narration/claude-headless.ts
import { execFile } from "node:child_process";

// src/narration/claude-spawn.ts
function headlessEnv(base = process.env) {
  return { ...base, CODEY_HEADLESS: "1" };
}

// src/narration/claude-headless.ts
function buildClaudeArgs(prompt) {
  return ["-p", prompt, "--model", "haiku"];
}
function runClaude(prompt, timeoutMs = 15e3) {
  return new Promise((resolve) => {
    const env = headlessEnv();
    execFile("claude", buildClaudeArgs(prompt), { timeout: timeoutMs, shell: false, windowsHide: true, env }, (err, stdout) => {
      if (err) return resolve(null);
      const out = stdout.trim();
      resolve(out.length > 0 ? out : null);
    });
  });
}
function runSegmentation(prompt) {
  return runClaude(prompt, 3e4);
}

// src/terminal/render.ts
function renderNarration(text) {
  return `  why: ${text}`;
}
function renderHeader(mode) {
  return `Codey (mode: ${mode}) - watching what Claude is doing`;
}
function renderCaption(caption) {
  return `\u25B8 ${caption.title}
    ${caption.simple}`;
}

// src/caption/subject.ts
function joinNames(names, max = 4) {
  const seen = /* @__PURE__ */ new Set();
  const list = names.filter((n) => n && !seen.has(n) && (seen.add(n), true));
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length <= max) return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  const shown = list.slice(0, max - 1);
  return `${shown.join(", ")}, and ${list.length - shown.length} more`;
}
function humanFile(name) {
  if (!name) return name;
  if (name.includes(" ")) return name;
  const test = /^(.+)\.(test|spec)\.[jt]sx?$/.exec(name);
  if (test) return `${test[1]} tests`;
  if (/^readme(\.|$)/i.test(name)) return "the README";
  return name;
}
function patternTokens(pattern) {
  return pattern.replace(/\\[a-z]/gi, " ").split(/[^A-Za-z0-9_]+/).filter((t) => t.length >= 2);
}
var EXT_NOISE = /* @__PURE__ */ new Set(["js", "ts", "jsx", "tsx", "mjs", "cjs", "json", "md", "css", "html"]);
function phrasePattern(pattern) {
  const raw = (pattern ?? "").trim();
  if (!raw) return "the code";
  if (/[\\()\[\]+?^$]/.test(raw)) return "the code";
  const tokens = patternTokens(raw).filter((t) => !EXT_NOISE.has(t.toLowerCase()));
  if (tokens.length === 0 || tokens.length > 4) return "the code";
  return joinNames(tokens);
}
function phraseSearch(literal) {
  const raw = (literal ?? "").trim();
  if (!raw) return null;
  if (/[\\()[\]{}+?^$.*|]/.test(raw)) return null;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return null;
  if (words.length === 1) {
    const w = words[0];
    return /[a-z]/.test(w) ? w : w.toLowerCase();
  }
  return words.join(" ").toLowerCase();
}
function purposeTitle(tool, stage, subject, count) {
  const many = count > 1;
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? `Adding ${subject} and more` : `Updating ${subject} and more`;
      return adds ? `Adding ${subject}` : `Updating ${subject}`;
    }
    case "inspecting": {
      if (subject === "the code") {
        return tool === "Grep" || tool === "Glob" ? "Searching the project" : "Checking the project";
      }
      if (many) return `Checking ${subject} and more`;
      return `Checking ${subject}`;
    }
    case "testing":
      return `Verifying ${subject}`;
    case "debugging":
      return "Working through an error";
    case "planning":
      return "Planning the next step";
    case "summarizing":
      return "Wrapping up";
    case "waiting":
    default:
      return "Getting started";
  }
}
function purposeSentence(tool, stage, subject, count, area) {
  const many = count > 1;
  const place = area ? `the ${area} code` : "it";
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? `Adding new files, starting with ${subject}.` : `Updating ${subject} and the files alongside it.`;
      if (adds) return `Creating ${subject}.`;
      return area ? `Editing ${subject} to change how ${place} behaves.` : `Editing ${subject} to change what it does.`;
    }
    case "inspecting":
      if (many) return `Reading ${subject} and the files alongside it to see how they work together.`;
      if (tool === "Grep" || tool === "Glob") {
        return subject === "the code" ? "Searching the project for the relevant code." : `Searching the project for ${subject}.`;
      }
      return area ? `Reading ${subject} to see what ${place} does.` : `Reading ${subject} to see what it does.`;
    case "testing":
      return `Running ${subject} to check it passes.`;
    case "debugging":
      return "Reading the error and trying a different approach.";
    case "planning":
      return "Working out the next step.";
    case "summarizing":
      return "Pulling the work together into a clear recap.";
    case "waiting":
    default:
      return "Getting started on the request.";
  }
}

// src/statusline/labels.ts
function basename(p) {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function str(input, key2) {
  if (input && typeof input === "object") {
    const v = input[key2];
    if (typeof v === "string") return v;
  }
  return null;
}
function shorten(s, n = 32) {
  const line = s.trim().split("\n")[0];
  return line.length > n ? line.slice(0, n - 1) + "\u2026" : line;
}
function pathArg(cmd) {
  const quoted = cmd.match(/["']([^"']+)["']/);
  if (quoted) return basename(quoted[1]);
  const tokens = cmd.trim().split(/\s+/).slice(1).filter((t) => !t.startsWith("-"));
  const last = tokens[tokens.length - 1];
  return last ? basename(last) : null;
}
function isCompound(cmd) {
  return /[;|\n]|&&|\|\||\$\(|`/.test(cmd) || /^\s*(for|while|until|if|case)\b/.test(cmd);
}
function describeBash(cmd) {
  if (isCompound(cmd)) {
    if (/^\s*(for|while|until)\b/.test(cmd)) return { tag: "running", target: "a shell loop" };
    return { tag: "running", target: "a few shell commands" };
  }
  const word = (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
  const name = pathArg(cmd);
  const file6 = (verb, fallback) => ({ tag: verb, target: name ? `the file ${name}` : fallback });
  const folder = (verb, fallback) => ({ tag: verb, target: name ? `the folder ${name}` : fallback });
  switch (word) {
    case "rm":
    case "del":
    case "unlink":
      return file6("removing", "a file");
    case "rmdir":
      return folder("removing", "a folder");
    case "mkdir":
      return folder("creating", "a folder");
    case "touch":
      return file6("creating", "a file");
    case "cp":
      return file6("copying", "a file");
    case "mv":
      return file6("moving", "a file");
    case "cat":
    case "less":
    case "more":
    case "head":
    case "tail":
      return file6("reading", "a file");
    case "cd":
      return folder("switching to", "a folder");
    case "ls":
    case "dir":
      return { tag: "listing", target: "the files here" };
    case "git": {
      const sub = cmd.trim().split(/\s+/)[1] || "";
      return { tag: "running", target: sub ? `git ${sub}` : "a git command" };
    }
    case "npm":
    case "pnpm":
    case "yarn":
    case "npx": {
      const rest2 = cmd.replace(/^\s*\S+\s*/, "");
      if (/\b(test|vitest|jest)\b/.test(rest2)) return { tag: "running", target: "the tests" };
      if (/\b(install|ci)\b|^\s*i\b/.test(rest2)) return { tag: "installing", target: "dependencies" };
      if (/\bbuild\b/.test(rest2)) return { tag: "running", target: "the build" };
      const run = rest2.match(/run\s+(\S+)/);
      if (run) return { tag: "running", target: `the ${run[1]} script` };
      return { tag: "running", target: `the command ${shorten(cmd)}` };
    }
    case "node":
    case "python":
    case "python3":
    case "tsx":
    case "ts-node":
    case "deno":
    case "bun":
      return { tag: "running", target: name ?? "a script" };
    case "curl":
    case "wget":
      return { tag: "fetching", target: "something from the web" };
    case "grep":
    case "rg":
    case "find":
      return { tag: "searching", target: "through the files" };
    case "echo":
      return { tag: "printing", target: "to the terminal" };
  }
  return word ? { tag: "running", target: `the ${word} command` } : { tag: "running", target: "a shell command" };
}
function rawTarget(tool, input) {
  const file6 = str(input, "file_path") ?? str(input, "path");
  switch (tool) {
    case "Read":
    case "Edit":
    case "MultiEdit":
    case "Write":
      return file6;
    case "Bash":
      return str(input, "command");
    case "Grep":
    case "Glob":
      return str(input, "pattern");
  }
  return null;
}
function actionLabel(tool, input) {
  const file6 = str(input, "file_path") ?? str(input, "path");
  const named = (verb) => ({ tag: verb, target: file6 ? `the file ${basename(file6)}` : "a file" });
  switch (tool) {
    case "Read":
      return named("reading");
    case "Edit":
    case "MultiEdit":
      return named("editing");
    case "Write":
      return named("writing");
    case "Bash": {
      const c = str(input, "command");
      return c ? describeBash(c) : { tag: "running", target: "a command" };
    }
    case "Grep":
    case "Glob": {
      const p = str(input, "pattern");
      const phrased = phrasePattern(p ?? "");
      if (phrased !== "the code") return { tag: "searching for", target: phrased };
      return tool === "Glob" ? { tag: "looking for", target: "files" } : { tag: "searching", target: "the code" };
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return { tag: "using", target: `${m[2].replace(/_/g, " ")} (${m[1]})` };
  return { tag: "using", target: tool };
}
var PAST = {
  reading: "read",
  writing: "wrote",
  editing: "edited",
  removing: "removed",
  creating: "created",
  copying: "copied",
  moving: "moved",
  listing: "listed",
  running: "ran",
  installing: "installed",
  fetching: "fetched",
  printing: "printed",
  searching: "searched",
  "searching for": "searched for",
  "looking for": "looked for",
  "switching to": "switched to",
  using: "used",
  asking: "asked"
};
function pastTense(tag) {
  return PAST[tag] ?? tag;
}
function shortTarget(target) {
  return target.replace(/^the (file|folder) /, "");
}

// src/caption/stage.ts
var READ_CMDS = /* @__PURE__ */ new Set([
  "ls",
  "dir",
  "cat",
  "less",
  "more",
  "head",
  "tail",
  "grep",
  "rg",
  "find",
  "pwd",
  "cd",
  "echo",
  "which",
  "type",
  "stat",
  "wc",
  "tree",
  "env"
]);
var WRITE_CMDS = /* @__PURE__ */ new Set([
  "rm",
  "del",
  "unlink",
  "rmdir",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "chmod",
  "chown",
  "ln"
]);
var GIT_WRITE = /* @__PURE__ */ new Set(["commit", "add", "push", "pull", "merge", "rebase", "reset", "checkout", "stash", "tag"]);
function firstWord(cmd) {
  return (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
}
function stageForBash(cmd) {
  const word = firstWord(cmd);
  const rest2 = cmd.replace(/^\s*\S+\s*/, "");
  if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) return "testing";
  if (word === "npm" || word === "pnpm" || word === "yarn" || word === "npx") {
    if (/\b(build|typecheck|tsc|lint|eslint)\b/.test(rest2)) return "testing";
    if (/\b(install|ci)\b|^\s*i\b/.test(rest2)) return "editing";
    return "inspecting";
  }
  if (word === "tsc" || word === "eslint" || word === "prettier") return "testing";
  if (word === "git") {
    const sub = (rest2.trim().split(/\s+/)[0] || "").toLowerCase();
    return GIT_WRITE.has(sub) ? "editing" : "inspecting";
  }
  if (WRITE_CMDS.has(word)) return "editing";
  if (READ_CMDS.has(word)) return "inspecting";
  return "inspecting";
}
function classifyStage(tool, input, isError = false) {
  if (isError) return "debugging";
  if (tool === "thinking") return "planning";
  if (tool === "Task" || tool === "Agent") return "planning";
  switch (tool) {
    case "Read":
    case "NotebookRead":
    case "Grep":
    case "Glob":
      return "inspecting";
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return "editing";
    case "Bash": {
      const cmd = input && typeof input === "object" ? input.command : null;
      return typeof cmd === "string" ? stageForBash(cmd) : "inspecting";
    }
  }
  return "inspecting";
}

// src/caption/shell.ts
function stem(sentence) {
  return sentence.replace(/\.\s*$/, "");
}
function defaultDeep(sentence, subject) {
  return `${stem(sentence)} to confirm ${subject} is in the state the next step needs.`;
}
var DEFAULT_CONCEPT = "A shell command runs a program in the project, so Claude can inspect or change things the editor itself cannot.";
function intent(subject, title, sentence, deep, teach) {
  const d = deep ?? defaultDeep(sentence, subject);
  const t = teach ?? `${d} ${DEFAULT_CONCEPT}`;
  return { subject, title, sentence, deep: d, teach: t };
}
function firstWord2(cmd) {
  return (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
}
function rest(cmd) {
  return cmd.replace(/^\s*\S+\s*/, "");
}
var TEMP_HINT = /\b(tmp|temp|scratch|demo|sample|example|fixture)s?\b/i;
var GIT_READ = /* @__PURE__ */ new Set(["status", "diff", "log", "show", "branch", "remote", "describe", "rev-parse"]);
function commandIntent(cmd) {
  const word = firstWord2(cmd);
  const tail = rest(cmd);
  const TEST = intent(
    "the tests",
    "Running the tests",
    "Claude is running the tests to check the work.",
    "Claude is running the tests to confirm the latest changes pass and nothing else broke.",
    "Claude is running the tests to confirm the latest changes pass and nothing else broke. A test is a small program that exercises the real code, so a regression shows up immediately instead of in front of a user."
  );
  if (/\b(vitest|jest|mocha|pytest|phpunit)\b/.test(cmd)) return TEST;
  if (word === "npm" || word === "pnpm" || word === "yarn" || word === "npx") {
    if (/\btest\b/.test(tail)) return TEST;
    if (/\bbuild\b/.test(tail)) {
      return intent(
        "the build",
        "Rebuilding the project",
        "Claude is rebuilding the project so the latest code takes effect.",
        "Claude is rebuilding the project so the source changes are compiled into the files that actually run.",
        "Claude is rebuilding the project so the source changes are compiled into the files that actually run. The code Claude edits is not what runs until a build turns it into the shipped output."
      );
    }
    if (/\b(install|ci)\b|^\s*i\b/.test(tail)) {
      return intent(
        "the dependencies",
        "Installing dependencies",
        "Claude is installing the project's dependencies.",
        "Claude is installing the project's dependencies so the libraries the code imports are present before it runs.",
        "Claude is installing the project's dependencies so the libraries the code imports are present before it runs. Dependencies are third-party packages the project relies on; without them the code cannot start."
      );
    }
    if (/\b(typecheck|tsc|lint|eslint)\b/.test(tail)) {
      return intent(
        "the types",
        "Type-checking the project",
        "Claude is type-checking the project for type and lint problems.",
        "Claude is type-checking the project to catch mismatched values and broken calls before they reach runtime.",
        "Claude is type-checking the project to catch mismatched values and broken calls before they reach runtime. A type check reads the source without running it and flags places where the data would not fit, which stops a whole class of bugs early."
      );
    }
    const run = tail.match(/run\s+(\S+)/);
    if (run) return intent(`the ${run[1]} script`, `Running the ${run[1]} script`, `Claude is running the ${run[1]} script.`);
    return intent("the project tasks", "Running a project task", "Claude is running a project task.");
  }
  if (word === "tsc" || word === "eslint" || word === "prettier") {
    return intent(
      "the types and style",
      "Checking types and style",
      "Claude is checking the project for type and style problems.",
      "Claude is checking the project for type and style problems before relying on it.",
      "Claude is checking the project for type and style problems before relying on it. These checks read the source without running it, so mistakes surface early rather than at runtime."
    );
  }
  if (word === "git") {
    const sub = (tail.trim().split(/\s+/)[0] || "").toLowerCase();
    if (GIT_READ.has(sub)) {
      return intent(
        "the local changes",
        "Checking local changes",
        "Claude is checking the local changes in the repository.",
        "Claude is checking the repository's local changes to see exactly what is modified, staged, or still uncommitted before the next step.",
        "Claude is checking the repository's local changes to see exactly what is modified, staged, or still uncommitted before the next step. Git tracks the working tree against the last commit, so a status or diff shows precisely what a commit would include."
      );
    }
    if (sub === "commit") return intent(
      "the changes",
      "Committing the changes",
      "Claude is committing the changes.",
      "Claude is committing the changes to record this work as a saved point in the project's history.",
      "Claude is committing the changes to record this work as a saved point in the project's history. A commit is a labelled snapshot you can return to, which is what makes the change reviewable and reversible."
    );
    if (sub === "push") return intent(
      "the changes",
      "Pushing the changes",
      "Claude is pushing the changes to the remote.",
      "Claude is pushing the local commits to the remote so the saved work is shared and backed up off this machine.",
      "Claude is pushing the local commits to the remote so the saved work is shared and backed up off this machine. A push uploads commits that so far exist only locally to the shared repository."
    );
    if (sub === "add") return intent("the changes", "Staging the changes", "Claude is staging the changes for a commit.");
    if (sub === "checkout" || sub === "switch") return intent("a branch", "Switching branches", "Claude is switching to another branch.");
    if (sub) return intent(`the ${sub} step`, `Running git ${sub}`, `Claude is running git ${sub}.`);
  }
  if (word === "grep" || word === "rg" || word === "ag" || word === "ack" || word === "find") {
    if (/installed_plugins|plugins[\\/]?config|config\.json|settings\.json/i.test(cmd)) {
      return intent(
        "the installed plugin config",
        "Checking installed plugin config",
        "Claude is checking the installed plugin config."
      );
    }
    return intent("the project", "Searching the project", "Claude is searching the project for something.");
  }
  if (word === "cd") {
    if (/\.claude[\\/]+plugins/i.test(cmd)) {
      return intent(
        "the Claude plugin cache",
        "Inspecting plugin cache",
        "Claude is looking inside the Claude plugin cache."
      );
    }
    return intent("another folder", "Switching folders", "Claude is moving to another folder.");
  }
  if (word === "ls" || word === "dir") {
    const srcDirs = (tail.match(/(?:^|\s)src[\\/]\S+/g) || []).length;
    if (srcDirs >= 2 || /\b(caption|serve|narration|capture|warnings)\b/.test(tail)) {
      return intent(
        "the source folders",
        "Checking the source areas",
        "Claude is checking the project's source folders to confirm the layout."
      );
    }
    return intent("the files here", "Listing the files", "Claude is listing the files in this folder.");
  }
  if (word === "rm" || word === "del" || word === "unlink" || word === "rmdir") {
    if (TEMP_HINT.test(cmd)) {
      return intent("the temporary files", "Cleaning up temporary files", "Claude is cleaning up temporary files.");
    }
    return intent("some files", "Removing files", "Claude is removing files that are no longer needed.");
  }
  if (word === "mkdir" || word === "touch") {
    if (TEMP_HINT.test(cmd)) {
      return intent("the demo files", "Creating demo files", "Claude is creating demo files to work with.");
    }
    if (word === "mkdir") return intent("a folder", "Creating a folder", "Claude is creating a folder.");
    return intent("a file", "Creating a file", "Claude is creating a file.");
  }
  if (word === "cat" || word === "less" || word === "more" || word === "head" || word === "tail") {
    return intent("a file", "Reading a file", "Claude is reading a file's contents.");
  }
  if (["node", "python", "python3", "tsx", "ts-node", "deno", "bun"].includes(word)) {
    if (/\btest\b/.test(tail)) {
      return intent("the tests", "Running the tests", "Claude is running the tests to check the work.");
    }
    const file6 = (tail.trim().split(/\s+/).find((t) => !t.startsWith("-")) || "").split(/[\\/]/).pop();
    if (file6) return intent(`the ${file6} script`, `Running ${file6}`, `Claude is running ${file6}.`);
    return intent("a script", "Running a script", "Claude is running a script.");
  }
  if (word === "curl" || word === "wget") {
    return intent("something from the web", "Fetching from the web", "Claude is fetching something from the web.");
  }
  return null;
}
var GERUND = {
  show: "checking",
  display: "checking",
  find: "checking",
  check: "checking",
  verify: "verifying",
  list: "listing",
  run: "running",
  build: "building",
  rebuild: "rebuilding",
  create: "creating",
  add: "adding",
  remove: "removing",
  delete: "removing",
  update: "updating",
  read: "reading",
  search: "searching",
  install: "installing",
  compare: "comparing",
  inspect: "inspecting",
  start: "starting",
  stop: "stopping",
  open: "opening",
  count: "counting",
  print: "printing"
};
function descriptionIsVague(desc) {
  const d = desc.trim().toLowerCase();
  return d.length < 6 || /^(run|running)\s+(a\s+)?(command|script)\b/.test(d) || d === "command";
}
function descriptionIntent(desc) {
  const clean = desc.trim().replace(/[.]+$/, "");
  const title = clean.charAt(0).toUpperCase() + clean.slice(1);
  const m = /^([A-Za-z]+)\b\s*(.*)$/.exec(clean);
  if (m && GERUND[m[1].toLowerCase()]) {
    const verb = GERUND[m[1].toLowerCase()];
    const tail = m[2].trim();
    const sentence = tail ? `Claude is ${verb} ${tail}.` : `Claude is ${verb} something.`;
    const deep = `${stem(sentence)} to confirm the result before moving on.`;
    return intent(tail || clean, title, sentence, deep, `${deep} ${DEFAULT_CONCEPT}`);
  }
  const fallback = `Claude is working on this: ${clean.charAt(0).toLowerCase() + clean.slice(1)}.`;
  return intent(clean, title, fallback);
}
function describeShellIntent(command2, description) {
  const cmd = (command2 ?? "").trim();
  const desc = (description ?? "").trim();
  if (desc && !descriptionIsVague(desc)) return descriptionIntent(desc);
  const matched = commandIntent(cmd);
  if (matched) return matched;
  if (desc) return descriptionIntent(desc);
  const word = firstWord2(cmd);
  if (word) return intent(`the ${word} step`, `Running ${word}`, `Claude is running ${word}.`);
  return intent("a shell command", "Running a command", "Claude is running a shell command.");
}

// src/caption/evidence.ts
var NOISE = /* @__PURE__ */ new Set([
  "console",
  "assert",
  "log",
  "error",
  "warn",
  "info",
  "debug",
  "expect",
  "require",
  "import",
  "export",
  "return",
  "throw",
  "await",
  "async",
  "if",
  "for",
  "while",
  "switch",
  "case",
  "catch",
  "try",
  "else",
  "do",
  "function",
  "const",
  "let",
  "var",
  "class",
  "new",
  "typeof",
  "instanceof",
  "this",
  "super",
  "void",
  "delete",
  "yield",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "JSON",
  "Math",
  "Map",
  "Set",
  "Promise",
  "Date",
  "RegExp",
  "Symbol",
  "parseInt",
  "parseFloat",
  "it",
  "test",
  "describe",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll"
]);
function addedText(tool, input) {
  const o = input && typeof input === "object" ? input : {};
  if (tool === "Write" && typeof o.content === "string") return o.content;
  if (tool === "Edit" && typeof o.new_string === "string") return o.new_string;
  if (tool === "NotebookEdit" && typeof o.new_source === "string") return o.new_source;
  if (tool === "MultiEdit" && Array.isArray(o.edits)) {
    return o.edits.map((e) => e && typeof e === "object" ? e.new_string : null).filter((s) => typeof s === "string").join("\n");
  }
  return "";
}
function push(list, name) {
  const n = (name ?? "").trim();
  if (n.length >= 2 && !NOISE.has(n) && !list.includes(n)) list.push(n);
}
function extractSymbols(tool, input, max = 3) {
  const text = addedText(tool, input);
  if (!text) return [];
  const out = [];
  for (const m of text.matchAll(/\b(?:it|test|describe)\s*\(\s*["'`]([^"'`]+)["'`]/g)) {
    push(out, m[1]);
  }
  for (const m of text.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) push(out, m[1]);
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) push(out, m[1]);
  for (const m of text.matchAll(/\bdef\s+([A-Za-z_$][\w$]*)/g)) push(out, m[1]);
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) push(out, m[1]);
  return out.slice(0, max);
}

// src/caption/chunks.ts
var IDLE_SPLIT_MS = 9e4;
function outcomes(events) {
  const byId = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.phase === "post" && e.toolUseId) byId.set(e.toolUseId, e.isError);
  }
  const postsByTool = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.phase === "post" && !e.toolUseId) {
      const list = postsByTool.get(e.tool) ?? [];
      list.push(e.isError);
      postsByTool.set(e.tool, list);
    }
  }
  const out = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.phase !== "pre") continue;
    if (e.toolUseId && byId.has(e.toolUseId)) {
      out.set(e, byId.get(e.toolUseId));
      continue;
    }
    const list = postsByTool.get(e.tool);
    if (list && list.length) out.set(e, list.shift());
  }
  return out;
}
function shellFields(input) {
  const o = input && typeof input === "object" ? input : {};
  const command2 = typeof o.command === "string" ? o.command : null;
  const description = typeof o.description === "string" ? o.description : null;
  return { command: command2, description };
}
function shortName(tool, input) {
  if (tool === "Bash" || tool === "PowerShell") {
    const { command: command2, description } = shellFields(input);
    if (command2) return describeShellIntent(command2, description).subject;
  }
  return shortTarget(actionLabel(tool, input).target);
}
function chunkEvents(events) {
  const failedBy = outcomes(events);
  const built = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.phase !== "pre") continue;
    const failed = failedBy.get(e) ?? false;
    const stage = classifyStage(e.tool, e.input, failed);
    const isSearch = e.tool === "Grep" || e.tool === "Glob";
    const searchLiteral = isSearch ? rawTarget(e.tool, e.input) : null;
    const name = shortName(e.tool, e.input);
    const symbols = extractSymbols(e.tool, e.input);
    const last = built[built.length - 1];
    const stageMatches = last && (last.stage === stage || mutating(last.stage) && mutating(stage));
    const close = last && e.timestamp - last.endTs <= IDLE_SPLIT_MS;
    if (last && stageMatches && close) {
      last.count++;
      if (searchLiteral) {
        if (!last.searches.includes(searchLiteral) && last.searches.length < 6) last.searches.push(searchLiteral);
      } else if (last.targets.length < 6) {
        last.targets.push(name);
      }
      for (const s of symbols) {
        if (!last.symbols.includes(s) && last.symbols.length < 4) last.symbols.push(s);
      }
      last.endTs = e.timestamp;
      last.tools.push(e.tool);
      if (stage === "debugging") last.stage = "debugging";
      if (failed) {
        last.failed = true;
        last.failedTools.push(e.tool);
      } else if (last.failedTools.includes(e.tool)) {
        last.resolved = true;
      }
    } else {
      built.push({
        stage,
        index: built.length + 1,
        startIndex: i,
        count: 1,
        tool: e.tool,
        targets: searchLiteral ? [] : [name],
        searches: searchLiteral ? [searchLiteral] : [],
        symbols,
        raw: rawTarget(e.tool, e.input),
        startTs: e.timestamp,
        endTs: e.timestamp,
        failed,
        resolved: false,
        tools: [e.tool],
        failedTools: failed ? [e.tool] : []
      });
    }
  }
  return built.map(({ tools, failedTools, ...chunk }) => chunk);
}
function mutating(stage) {
  return stage === "editing" || stage === "debugging";
}

// src/caption/caption.ts
function subjectOf(chunk) {
  if (chunk.tool === "Grep" || chunk.tool === "Glob") return phrasePattern(chunk.raw ?? "");
  return humanFile(chunk.targets[0] ?? "") || "the code";
}
function namedTargets(chunk) {
  return joinNames(chunk.targets.map(humanFile)) || "the code";
}
function namedSearches(chunk) {
  const phrases = chunk.searches.map(phraseSearch).filter((p) => !!p);
  return joinNames(phrases);
}
function namedSymbols(chunk, max = 2) {
  return joinNames(chunk.symbols ?? [], max);
}
function testModule(chunk) {
  const m = /^(.+)\.(test|spec)\.[jt]sx?$/.exec(chunk.targets[0] ?? "");
  return m ? m[1] : null;
}
function describe(chunk) {
  if ((chunk.tool === "Bash" || chunk.tool === "PowerShell") && chunk.count === 1 && chunk.raw) {
    const intent2 = describeShellIntent(chunk.raw);
    return { title: intent2.title, simple: intent2.sentence, deep: intent2.deep, teach: intent2.teach };
  }
  const subject = subjectOf(chunk);
  const names = namedTargets(chunk);
  const single = chunk.targets.length <= 1 && chunk.count <= 1;
  const groupSubject = chunk.targets.length ? joinNames(chunk.targets.map(humanFile), 2) : subject;
  const title = single ? purposeTitle(chunk.tool, chunk.stage, subject, chunk.count) : purposeTitle(chunk.tool, chunk.stage, groupSubject, 1);
  switch (chunk.stage) {
    case "inspecting": {
      const searches = namedSearches(chunk);
      if (searches) {
        const where = chunk.targets.length ? namedTargets(chunk) : "the project";
        return {
          title: chunk.targets.length ? `Searching ${humanFile(chunk.targets[0])}` : "Searching the project",
          simple: `Claude is searching ${where} for ${searches}.`,
          deep: `Claude is searching ${where} for ${searches} to land on the right section before editing it.`,
          teach: `Claude is searching ${where} for ${searches} to land on the right section before editing it. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`
        };
      }
      if (chunk.tool === "Grep" || chunk.tool === "Glob") {
        return {
          title,
          simple: `Claude is searching ${subject === "the code" ? "the project" : `the project for ${subject}`}.`,
          deep: `Claude is searching the project to find where ${subject === "the code" ? "the relevant code" : subject} is used.`,
          teach: `Claude is searching the project to find where ${subject === "the code" ? "the relevant code" : subject} is used. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`
        };
      }
      if (single) {
        return {
          title,
          simple: `Claude is reading ${names}.`,
          deep: `Claude is reading ${names} to see what it does before changing it.`,
          teach: `Claude is reading ${names} to see what it does before changing it. Reading the existing code first is how you avoid breaking something you did not know was there.`
        };
      }
      return {
        title,
        simple: `Claude is reading ${names}.`,
        deep: `Claude is reading ${names} to trace how they work together before editing them.`,
        teach: `Claude is reading ${names} to trace how they work together before editing them. Reading the existing code first is how you avoid breaking something you did not know was there.`
      };
    }
    case "editing": {
      const adds = chunk.tool === "Write" || chunk.tool === "NotebookEdit";
      const sym = (chunk.symbols ?? [])[0] ?? null;
      const syms = namedSymbols(chunk);
      const mod = testModule(chunk);
      if (single) {
        if (adds) {
          if (sym) {
            return {
              title,
              simple: `Claude is creating ${names}, starting with ${sym}.`,
              deep: `Claude is creating ${names} and writing ${sym} into it.`,
              teach: `Claude is creating ${names} and writing ${sym} into it. A new file does nothing until something imports or runs it.`
            };
          }
          return {
            title,
            simple: `Claude is creating ${names}.`,
            deep: `Claude is creating ${names} and writing its initial contents.`,
            teach: `Claude is creating ${names} and writing its initial contents. A new file does nothing until something imports or runs it.`
          };
        }
        if (sym && mod) {
          return {
            title,
            simple: `Claude is adding a ${sym} test to the ${mod} tests.`,
            deep: `Claude is adding a ${sym} test so the ${mod} module verifies ${sym}.`,
            teach: `Claude is adding a ${sym} test so the ${mod} module verifies ${sym}. A test is a small program that checks the real code, so a problem with ${sym} shows up right away.`
          };
        }
        if (sym) {
          return {
            title,
            simple: `Claude is updating ${sym} in ${names}.`,
            deep: `Claude is updating ${sym} in ${names} to change how it behaves.`,
            teach: `Claude is updating ${sym} in ${names} to change how it behaves. An edit only takes effect once the code runs or is rebuilt.`
          };
        }
        return {
          title,
          simple: `Claude is updating ${names}.`,
          deep: `Claude is updating ${names} to change how it behaves.`,
          teach: `Claude is updating ${names} to change how it behaves. An edit only takes effect once the code runs or is rebuilt.`
        };
      }
      if (adds) {
        return {
          title,
          simple: `Claude is creating ${names}.`,
          deep: `Claude is creating ${names} as a set of new files for one piece of work.`,
          teach: `Claude is creating ${names} as a set of new files for one piece of work. A new file does nothing until something imports or runs it.`
        };
      }
      if (syms) {
        return {
          title,
          simple: `Claude is updating ${names} around ${syms}.`,
          deep: `Claude is updating ${names} together so ${syms} stay consistent.`,
          teach: `Claude is updating ${names} together so ${syms} stay consistent. Keeping related files aligned is what stops a change in one place from breaking another.`
        };
      }
      return {
        title,
        simple: `Claude is updating ${names}.`,
        deep: `Claude is updating ${names} together so they stay consistent.`,
        teach: `Claude is updating ${names} together so they stay consistent. Keeping related files aligned is what stops a change in one place from breaking another.`
      };
    }
    case "testing":
      return {
        title,
        simple: `Claude is running ${subject} to check its work.`,
        deep: `Claude is running ${subject} to confirm the changes work and nothing else broke.`,
        teach: `Claude is running ${subject} to confirm the changes work and nothing else broke. Tests are small programs that check the real code behaves as expected, so a problem shows up right away.`
      };
    case "debugging":
      return {
        title,
        simple: "Claude hit an error and is working out what went wrong.",
        deep: "Claude is debugging, reading the error from a failed action and trying a different approach.",
        teach: "Claude is debugging, reading the error from a failed action and trying a different approach. Debugging is the loop of reading an error, guessing the cause, and testing a fix until it holds."
      };
    case "planning":
      return {
        title,
        simple: "Claude is thinking through what to do next.",
        deep: "Claude is planning its next step before changing any files.",
        teach: "Claude is planning its next step before changing any files. Thinking the work through first keeps the changes deliberate instead of guesswork."
      };
    case "summarizing":
      return {
        title,
        simple: "Claude is wrapping up and pulling together what it did.",
        deep: "Claude is summarizing the work so the result is easy to follow.",
        teach: "Claude is summarizing the work so the result is easy to follow. A clear recap is what turns a pile of edits into something a person can review."
      };
    case "waiting":
    default:
      return {
        title,
        simple: "Claude is getting started.",
        deep: "Claude is getting started on your request.",
        teach: "Claude is getting started on your request."
      };
  }
}
function outcomeText(chunk) {
  if (chunk.failed && chunk.resolved) return "Claude hit an error and then recovered.";
  if (chunk.failed) return "The latest attempt errored.";
  return void 0;
}
function buildCaption(chunk, mode, why) {
  const d = describe(chunk);
  const clean = why ? stripDashes(why) : null;
  const outcome = outcomeText(chunk);
  const evidence = chunk.count === 1 && chunk.raw ? chunk.raw : void 0;
  const caption = { stage: chunk.stage, title: d.title, simple: d.simple, outcome, evidence };
  if (mode === "simple") {
    if (clean) caption.simple = clean;
    return caption;
  }
  if (mode === "deep") {
    caption.deep = clean ?? d.deep;
    return caption;
  }
  caption.deep = d.deep;
  caption.teach = clean ?? d.teach;
  return caption;
}

// src/cli/watch.ts
var LOOP_THRESHOLD = 5;
var REPEAT_ERROR_THRESHOLD = 3;
function createWatchState(mode, narrate) {
  return { engine: new NarrationEngine(mode, narrate), mode, lastWarningKey: null, lastActionKey: null };
}
function activeWarning(events, now) {
  const lastActivityTs = events.reduce((m, e) => Math.max(m, e.timestamp), 0) || void 0;
  return detectLoop(events, LOOP_THRESHOLD) ?? detectRepeatError(events, REPEAT_ERROR_THRESHOLD) ?? detectHang(computeOpenCalls(events), now, hangThreshold, lastActivityTs);
}
function warningKey(w) {
  return `${w.kind}|${w.tool}|${w.count}`;
}
async function processTick(events, state, now) {
  const lines = [];
  const chunks = chunkEvents(events);
  const current = chunks[chunks.length - 1];
  if (current) {
    const caption = buildCaption(current, state.mode, null);
    const key2 = `${caption.stage}|${caption.title}`;
    if (key2 !== state.lastActionKey) {
      lines.push(renderCaption(caption));
      state.lastActionKey = key2;
    }
  }
  const w = activeWarning(events, now);
  if (w) {
    const key2 = warningKey(w);
    if (key2 !== state.lastWarningKey) {
      lines.push(formatWarning(w));
      state.lastWarningKey = key2;
    }
  }
  const narration = await state.engine.onEvents(events, now);
  if (narration) lines.push(renderNarration(narration));
  return { lines };
}
function runWatch(sessionId, mode) {
  const store = new SessionStore(sessionId);
  const state = createWatchState(mode, (p) => runClaude(p));
  console.log(renderHeader(mode));
  console.log(`(session: ${sessionId})`);
  const tick = async () => {
    if (!existsSync4(store.path)) return;
    const events = [];
    for (const line of readFileSync4(store.path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
      }
    }
    const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
    const result = await processTick(reconcileErrors(events, turns), state, Date.now());
    for (const line of result.lines) console.log(line);
  };
  watchFile(store.path, { interval: 1e3 }, () => {
    void tick();
  });
  void tick();
}

// src/cli/narrate.ts
import { existsSync as existsSync8, readFileSync as readFileSync8, watchFile as watchFile2 } from "node:fs";

// src/statusline/state.ts
import { readFileSync as readFileSync5, writeFileSync as writeFileSync2, existsSync as existsSync5 } from "node:fs";
import { join as join3 } from "node:path";
function file(dir) {
  return join3(dir, "statusline.json");
}
function writeStatus(dir, snap) {
  writeFileSync2(file(dir), JSON.stringify(snap));
}
function patchStatus(dir, patch) {
  const current = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  writeStatus(dir, { ...current, ...patch, updatedAt: Date.now() });
}
function readStatus(dir) {
  const p = file(dir);
  if (!existsSync5(p)) return null;
  try {
    return JSON.parse(readFileSync5(p, "utf8"));
  } catch {
    return null;
  }
}

// src/narration/history.ts
import { appendFileSync as appendFileSync2, readFileSync as readFileSync6, existsSync as existsSync6 } from "node:fs";
import { join as join4 } from "node:path";
function file2(dir) {
  return join4(dir, "narration.jsonl");
}
function appendWhy(dir, entry) {
  appendFileSync2(file2(dir), JSON.stringify(entry) + "\n");
}
function readWhys(dir) {
  const p = file2(dir);
  if (!existsSync6(p)) return [];
  const out = [];
  for (const line of readFileSync6(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
    }
  }
  return out;
}

// src/narration/claude-metered.ts
import { execFile as execFile2 } from "node:child_process";
function buildMeteredArgs(prompt) {
  return ["-p", prompt, "--model", "haiku", "--output-format", "json"];
}
function estimateTokens(s) {
  return Math.ceil(s.length / 4);
}
function parseMetered(stdout, prompt) {
  const out = stdout.trim();
  if (!out) return null;
  try {
    const o = JSON.parse(out);
    const text = typeof o.result === "string" ? o.result.trim() : "";
    if (!text) return null;
    const u = o.usage ?? {};
    const tokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    return { text, tokens: tokens > 0 ? tokens : estimateTokens(prompt + text) };
  } catch {
    return { text: out, tokens: estimateTokens(prompt + out) };
  }
}
function runClaudeMetered(prompt, timeoutMs = 15e3) {
  return new Promise((resolve) => {
    execFile2("claude", buildMeteredArgs(prompt), { timeout: timeoutMs, shell: false, windowsHide: true, env: headlessEnv() }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(parseMetered(stdout, prompt));
    });
  });
}

// src/budget/budget.ts
import { readFileSync as readFileSync7, writeFileSync as writeFileSync3, existsSync as existsSync7, rmSync, mkdirSync as mkdirSync3 } from "node:fs";
import { join as join5 } from "node:path";
function file3(dir) {
  return join5(dir, "budget.json");
}
function readBudget(dir) {
  const p = file3(dir);
  if (!existsSync7(p)) return null;
  try {
    const o = JSON.parse(readFileSync7(p, "utf8"));
    if (typeof o.cap === "number" && typeof o.spent === "number") return { cap: o.cap, spent: o.spent };
    return null;
  } catch {
    return null;
  }
}
function clearBudget(dir) {
  rmSync(file3(dir), { force: true });
}
function addSpend(dir, tokens) {
  const b = readBudget(dir);
  if (!b) return;
  writeFileSync3(file3(dir), JSON.stringify({ cap: b.cap, spent: b.spent + Math.max(0, tokens) }));
}
function budgetAllows(b) {
  return !b || b.spent < b.cap;
}
function formatTokens(n) {
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return String(n);
}
function budgetLeftLabel(b) {
  if (!b) return null;
  const left = Math.max(0, b.cap - b.spent);
  return left > 0 ? `${formatTokens(left)} left` : "budget reached";
}
function budgetPausedMessage(b) {
  if (!b || b.spent < b.cap) return null;
  return `Budget reached (${formatTokens(b.spent)} / ${formatTokens(b.cap)}). Auto-explaining paused.`;
}

// src/cli/narrate.ts
async function narrateTick(dir, events, state, now) {
  const w = activeWarning(events, now);
  patchStatus(dir, { warning: w ? formatWarning(w) : null });
  const why = await state.engine.onEvents(events, now);
  if (why) {
    patchStatus(dir, { why });
    appendWhy(dir, { ts: now, why });
  }
}
function makeBudgetedNarrate(getBudget, metered, meter) {
  return async (prompt) => {
    const b = getBudget();
    if (!budgetAllows(b)) return null;
    const r = await metered(prompt);
    if (!r) return null;
    meter(r.tokens);
    return r.text;
  };
}
function runNarrate(sessionId, mode) {
  const store = new SessionStore(sessionId);
  const narrate = makeBudgetedNarrate(
    () => readBudget(store.dir),
    (p) => runClaudeMetered(p),
    (tokens) => addSpend(store.dir, tokens)
  );
  const state = createWatchState(mode, narrate);
  patchStatus(store.dir, { mode });
  const tick = async () => {
    if (!existsSync8(store.path)) return;
    const events = [];
    for (const line of readFileSync8(store.path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
      }
    }
    const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
    await narrateTick(store.dir, reconcileErrors(events, turns), state, Date.now());
  };
  watchFile2(store.path, { interval: 1e3 }, () => {
    void tick();
  });
  void tick();
}

// src/cli/statusline.ts
import { join as join11 } from "node:path";
import { existsSync as existsSync14, readFileSync as readFileSync13 } from "node:fs";

// src/statusline/read-time.ts
var PER_WORD_MS = 350;
var MIN_MS = 4e3;
var MAX_MS = 12e3;
function readMs(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_MS, Math.max(MIN_MS, words * PER_WORD_MS));
}
function scheduleWhy(whys, now) {
  if (whys.length === 0) return null;
  let shownAt = whys[0].ts;
  let displayed = 0;
  for (let i = 1; i < whys.length; i++) {
    const earliest = Math.max(whys[i].ts, shownAt + readMs(whys[displayed].why));
    if (earliest > now) break;
    shownAt = earliest;
    displayed = i;
  }
  return whys[displayed].why;
}

// src/timeline/duration.ts
function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1e3));
  if (total < 60) return `${total || 1}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${String(rm).padStart(2, "0")}m`;
}

// src/caption/recap.ts
function basename2(p) {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function filePath(input) {
  if (input && typeof input === "object") {
    const o = input;
    const v = o.file_path ?? o.path;
    if (typeof v === "string") return basename2(v);
  }
  return null;
}
function command(input) {
  if (input && typeof input === "object") {
    const c = input.command;
    if (typeof c === "string") return c;
  }
  return null;
}
function verificationOf(cmd) {
  if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) return "the tests";
  if (/\bbuild\b/.test(cmd)) return "the build";
  if (/\b(typecheck|tsc|lint|eslint)\b/.test(cmd)) return "the checks";
  return null;
}
function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}
function buildRecap(events) {
  const created = [];
  const edited = [];
  const verified = [];
  const inspected = [];
  for (const e of events) {
    if (e.phase !== "pre") continue;
    switch (e.tool) {
      case "Write":
      case "NotebookEdit": {
        const f = filePath(e.input);
        if (f) pushUnique(created, f);
        break;
      }
      case "Edit":
      case "MultiEdit": {
        const f = filePath(e.input);
        if (f) pushUnique(edited, f);
        break;
      }
      case "Read":
      case "NotebookRead": {
        const f = filePath(e.input);
        if (f) pushUnique(inspected, f);
        break;
      }
      case "Bash":
      case "PowerShell": {
        const cmd = command(e.input);
        const v = cmd ? verificationOf(cmd) : null;
        if (v) pushUnique(verified, v);
        break;
      }
    }
  }
  const changed = [...edited, ...created];
  const changedNames = joinNames(changed.map(humanFile), 3);
  const verifiedNames = joinNames(verified, 2);
  let sentence;
  if (changed.length) {
    const verb = edited.length === 0 ? "Created" : "Updated";
    sentence = `${verb} ${changedNames}`;
    if (verified.length) sentence += `, verified with ${verifiedNames}`;
    sentence += ".";
  } else if (verified.length) {
    sentence = `Ran ${verifiedNames}.`;
  } else if (inspected.length) {
    sentence = `Inspected ${joinNames(inspected.map(humanFile), 3)}.`;
  } else {
    sentence = "Finished this prompt.";
  }
  return { sentence, changed, verified, inspected };
}

// src/statusline/compose.ts
function pickSentence(caption, mode) {
  if (mode === "deep") return caption.deep ?? caption.simple;
  if (mode === "teach") return caption.teach ?? caption.deep ?? caption.simple;
  return caption.simple;
}
var SENTENCE_BUDGET = {
  simple: { sentences: 1, chars: 120 },
  deep: { sentences: 2, chars: 200 },
  teach: { sentences: 2, chars: 200 }
};
function splitSentences(text) {
  return text.trim().split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}
function fitWithin(text, sentences, chars) {
  const kept = [];
  for (const s of splitSentences(text)) {
    if (kept.length >= sentences) break;
    const joined = [...kept, s].join(" ");
    if (joined.length > chars) break;
    kept.push(s);
  }
  return kept.join(" ");
}
function fitSentence(primary, fallback, mode) {
  const { sentences, chars } = SENTENCE_BUDGET[mode];
  const fit = fitWithin(primary, sentences, chars);
  if (fit) return fit;
  const fb = fitWithin(fallback, sentences, chars);
  return fb || fallback;
}
var DONE_FOOTER = "Run /codey:timeline for the full breakdown.";
function composeView(events, snap, now, whys = [], budget = null) {
  const budgetLeft = budgetLeftLabel(budget);
  const paused = budgetPausedMessage(budget);
  const newestTs = events.reduce((m, e) => Math.max(m, e.timestamp), Number.NEGATIVE_INFINITY);
  const thinking = snap.promptAt != null && snap.promptAt > newestTs;
  const done = !thinking && snap.doneAt != null && snap.doneAt >= newestTs;
  let elapsed = null;
  if (snap.promptAt != null && snap.promptAt > 0) {
    const endTs = done && snap.doneAt != null ? snap.doneAt : now;
    elapsed = formatDuration(Math.max(0, endTs - snap.promptAt));
  }
  const base = { mode: snap.mode, elapsed, budgetLeft };
  if (thinking) {
    return { ...base, state: "thinking", stage: "Thinking", sentence: "Claude is thinking about your request.", warning: null, hint: null };
  }
  if (done) {
    const turnStart2 = snap.promptAt ?? Number.NEGATIVE_INFINITY;
    const recap = buildRecap(events.filter((e) => e.timestamp >= turnStart2));
    return { ...base, state: "done", stage: "Done", sentence: recap.sentence, warning: null, hint: DONE_FOOTER };
  }
  const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
  const chunks = chunkEvents(events.filter((e) => e.timestamp >= turnStart));
  if (chunks.length === 0) {
    return { ...base, state: "idle", stage: "Idle", sentence: "Waiting for Claude.", warning: snap.warning, hint: null };
  }
  const current = chunks[chunks.length - 1];
  const turnWhys = whys.filter((w) => w.ts >= turnStart);
  const ai = paused ? null : scheduleWhy(turnWhys, now) ?? snap.why;
  const caption = buildCaption(current, snap.mode, ai);
  const plain = ai ? buildCaption(current, snap.mode, null) : caption;
  const sentence = fitSentence(pickSentence(caption, snap.mode), pickSentence(plain, snap.mode), snap.mode);
  const hint = paused;
  return {
    ...base,
    // The line-one chip leads with the purpose ("Adding math.js"), not the bare stage, so the
    // HUD says what Claude is working on at a glance.
    state: "live",
    stage: caption.title,
    sentence,
    warning: snap.warning,
    hint
  };
}

// src/statusline/render.ts
var RESET = "\x1B[0m";
var BOLD = "\x1B[1m";
var BRAND = "\x1B[38;5;75m";
var DIM = "\x1B[38;5;244m";
var TEXT = "\x1B[38;5;253m";
var GREEN = "\x1B[38;5;114m";
var RED = "\x1B[38;5;203m";
var MODE_COLOR = {
  simple: "\x1B[38;5;75m",
  deep: "\x1B[38;5;141m",
  teach: "\x1B[38;5;150m"
};
var WRAP = 120;
function stageColor(state, mode) {
  if (state === "done") return GREEN;
  if (state === "idle") return DIM;
  return MODE_COLOR[mode] ?? MODE_COLOR.simple;
}
function modeLabel(mode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}
var STAGE_MAX = 34;
function clipStage(stage) {
  if (stage.length <= STAGE_MAX) return stage;
  const cut = stage.slice(0, STAGE_MAX);
  const sp = cut.lastIndexOf(" ");
  return (sp > STAGE_MAX * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "\u2026";
}
var SEP = `${DIM}\u2502${RESET}`;
function statusBar(view) {
  const accent = stageColor(view.state, view.mode);
  const parts = [`${BOLD}${BRAND}Codey${RESET}`];
  if (view.state !== "done") parts.push(`${MODE_COLOR[view.mode] ?? MODE_COLOR.simple}${modeLabel(view.mode)}${RESET}`);
  parts.push(`${BOLD}${accent}${clipStage(view.stage)}${RESET}`);
  if (view.state === "done") parts.push(`${DIM}Summary${RESET}`);
  if (view.elapsed) parts.push(`${DIM}${view.elapsed}${RESET}`);
  const budget = view.budgetLeft ? ` ${DIM}\xB7 ${view.budgetLeft}${RESET}` : "";
  const hint = view.state !== "done" && view.hint ? ` ${DIM}\xB7 ${view.hint}${RESET}` : "";
  return parts.join(` ${SEP} `) + budget + hint;
}
function renderStatus(view, _width = WRAP) {
  const out = [statusBar(view)];
  if (view.warning) {
    out.push(`${BOLD}${RED}${view.warning}${RESET}`);
    return out.join("\n");
  }
  const body = view.state === "done" ? GREEN : TEXT;
  out.push(`${body}${view.sentence.trim()}${RESET}`);
  if (view.state === "done" && view.hint) out.push(`${DIM}${view.hint}${RESET}`);
  return out.join("\n");
}

// src/cli/sessions.ts
import { readdirSync, statSync, existsSync as existsSync12 } from "node:fs";
import { join as join9 } from "node:path";

// src/timeline/segment-cache.ts
import { writeFileSync as writeFileSync4, readFileSync as readFileSync9, existsSync as existsSync9, mkdirSync as mkdirSync4 } from "node:fs";
import { join as join6 } from "node:path";

// src/timeline/segment.ts
function naiveSegment(events) {
  if (events.length === 0) return [];
  const chunks = chunkEvents(events).map((c) => {
    const caption = buildCaption(c, "deep");
    return { startIndex: c.startIndex, name: caption.title, narration: caption.deep ?? caption.simple };
  });
  if (chunks.length === 0) return [{ startIndex: 0, name: "Getting started", narration: "Claude is getting started." }];
  chunks[0] = { ...chunks[0], startIndex: 0 };
  return chunks;
}
function field(input, key2) {
  if (input && typeof input === "object") {
    const v = input[key2];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
function basename3(p) {
  return p.split(/[\\/]/).pop() || p;
}
function eventSummary(e) {
  if (e.tool === "Bash" || e.tool === "PowerShell") {
    const command2 = field(e.input, "command");
    const desc = field(e.input, "description");
    if (command2) {
      const intent2 = describeShellIntent(command2, desc);
      const note = desc && desc !== intent2.title ? ` (${desc})` : "";
      return `${intent2.title}${note}`;
    }
    return desc ?? "ran a command";
  }
  const file6 = field(e.input, "file_path") ?? field(e.input, "path") ?? field(e.input, "notebook_path");
  if (file6) return `${e.tool} ${basename3(file6)}`;
  const pattern = field(e.input, "pattern");
  if (pattern) return `${e.tool} for ${pattern}`;
  return e.tool;
}
function buildSegmentationPrompt(events) {
  const lines = events.map((e, i) => `${i}: ${e.phase} ${eventSummary(e)}`).join("\n");
  return [
    "You are grouping a coding agent's tool calls into a few named tasks for a non-technical viewer.",
    "Each event below is already summarized by what it was trying to accomplish.",
    "Here are the events, numbered in order:",
    lines,
    "",
    'Return ONLY a JSON array of {"startIndex": <int>, "name": "<3-6 word task name>", "narration": "<one plain sentence>"}.',
    "Name each task by its PURPOSE (what Claude was trying to do), never by the tool or command it used.",
    'Good: "Verifying the install". Bad: "Running shell commands" or "Bash calls".',
    "Ground the names in the real files, commands, and intent shown above. Do not use em dashes.",
    "The first chunk must start at index 0. Chunks must be in ascending startIndex order.",
    "Aim for 2-6 tasks total. No prose outside the JSON."
  ].join("\n");
}
function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
function parseSegmentation(text, eventCount) {
  if (eventCount === 0) return [];
  const json = extractJsonArray(text);
  if (!json) return [];
  let arr;
  try {
    arr = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const chunks = arr.filter((c) => !!c && typeof c === "object" && typeof c.startIndex === "number").map((c) => ({
    startIndex: Math.max(0, Math.min(eventCount - 1, Math.floor(c.startIndex))),
    name: String(c.name ?? "Task").slice(0, 60),
    narration: String(c.narration ?? "")
  })).sort((a, b) => a.startIndex - b.startIndex);
  if (chunks.length === 0) return [];
  chunks[0].startIndex = 0;
  const seen = /* @__PURE__ */ new Set();
  return chunks.filter((c) => seen.has(c.startIndex) ? false : (seen.add(c.startIndex), true));
}

// src/timeline/segment-cache.ts
var STALE_SLACK = 5;
function cachePath(sessionId, root) {
  return join6(root, sessionId, "timeline.json");
}
function readCache(sessionId, root = defaultRoot()) {
  const file6 = cachePath(sessionId, root);
  if (!existsSync9(file6)) return null;
  try {
    return JSON.parse(readFileSync9(file6, "utf8"));
  } catch {
    return null;
  }
}
function writeCache(sessionId, cache, root = defaultRoot()) {
  mkdirSync4(join6(root, sessionId), { recursive: true });
  writeFileSync4(cachePath(sessionId, root), JSON.stringify(cache));
}
function isStale(cache, eventCount) {
  if (!cache) return true;
  return eventCount - cache.eventCount > STALE_SLACK;
}
function segmentPlan(cache, eventCount, live, turnStartIndex) {
  if (eventCount === 0) return { refresh: false, lockBefore: 0 };
  if (!cache) return { refresh: true, lockBefore: 0 };
  const lockBefore = Math.max(0, Math.min(turnStartIndex, eventCount));
  const refresh2 = live && isStale(cache, eventCount) && lockBefore < eventCount;
  return { refresh: refresh2, lockBefore };
}
function mergeSegmentation(prev, tail, lockBefore) {
  const frozen = prev.filter((c) => c.startIndex < lockBefore);
  const shifted = tail.map((c) => ({ ...c, startIndex: c.startIndex + lockBefore }));
  const merged = [...frozen, ...shifted].sort((a, b) => a.startIndex - b.startIndex);
  if (merged.length === 0) return [];
  merged[0] = { ...merged[0], startIndex: 0 };
  const seen = /* @__PURE__ */ new Set();
  return merged.filter((c) => seen.has(c.startIndex) ? false : (seen.add(c.startIndex), true));
}
var refreshing = /* @__PURE__ */ new Set();
function refresh(sessionId, events, lockBefore, prev, root) {
  if (refreshing.has(sessionId)) return;
  refreshing.add(sessionId);
  const slice = events.slice(lockBefore);
  runSegmentation(buildSegmentationPrompt(slice)).then((text) => {
    const tail = text ? parseSegmentation(text, slice.length) : [];
    if (tail.length === 0) return;
    const chunks = mergeSegmentation(prev, tail, lockBefore);
    if (chunks.length > 0) writeCache(sessionId, { eventCount: events.length, chunks }, root);
  }).catch(() => {
  }).finally(() => {
    refreshing.delete(sessionId);
  });
}
function chunksFor(sessionId, events, root = defaultRoot(), opts = { live: true, turnStartIndex: 0 }) {
  const cache = readCache(sessionId, root);
  const plan = segmentPlan(cache, events.length, opts.live, opts.turnStartIndex);
  if (plan.refresh) refresh(sessionId, events, plan.lockBefore, cache?.chunks ?? [], root);
  return cache && cache.chunks.length > 0 ? cache.chunks : naiveSegment(events);
}

// src/capture/prompts.ts
import { appendFileSync as appendFileSync3, readFileSync as readFileSync10, existsSync as existsSync10 } from "node:fs";
import { join as join7 } from "node:path";
function file4(dir) {
  return join7(dir, "prompts.jsonl");
}
function readPrompts(dir) {
  const p = file4(dir);
  if (!existsSync10(p)) return [];
  const out = [];
  for (const line of readFileSync10(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (typeof o.ts === "number") out.push(o.ts);
    } catch {
    }
  }
  return out;
}

// src/timeline/session-name.ts
var PLACEHOLDER = /* @__PURE__ */ new Set(["Working", "Task 2", "Continued working."]);
var MAX_TITLE = 38;
function clamp(s, n) {
  const oneLine = s.split("\n")[0].trim();
  if (oneLine.length <= n) return oneLine;
  const cut = oneLine.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "\u2026";
}
function sessionDisplayName(i) {
  if (i.customName && i.customName.trim()) return clamp(i.customName.trim(), MAX_TITLE);
  const prompt = i.firstPrompt?.trim() ?? "";
  if (prompt.startsWith("/")) return clamp(prompt, MAX_TITLE);
  if (i.firstChunkName && !PLACEHOLDER.has(i.firstChunkName)) return clamp(i.firstChunkName, MAX_TITLE);
  if (i.firstPrompt) return clamp(i.firstPrompt, MAX_TITLE);
  return `Session ${i.sessionId.slice(0, 8)}`;
}
function projectFrom(cwd) {
  if (!cwd) return null;
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}
function sessionColor(sessionId) {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = h * 31 + sessionId.charCodeAt(i) >>> 0;
  return `hsl(${h % 360} 70% 62%)`;
}

// src/store/session-name-store.ts
import { writeFileSync as writeFileSync5, readFileSync as readFileSync11, mkdirSync as mkdirSync5, existsSync as existsSync11, rmSync as rmSync2 } from "node:fs";
import { join as join8 } from "node:path";
var NAME_FILE = "name.json";
function readCustomName(dir) {
  const file6 = join8(dir, NAME_FILE);
  if (!existsSync11(file6)) return null;
  try {
    const parsed = JSON.parse(readFileSync11(file6, "utf8"));
    const trimmed = String(parsed.name ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
function writeCustomName(dir, name) {
  const file6 = join8(dir, NAME_FILE);
  const trimmed = name.trim();
  if (!trimmed) {
    try {
      rmSync2(file6, { force: true });
    } catch {
    }
    return;
  }
  mkdirSync5(dir, { recursive: true });
  writeFileSync5(file6, JSON.stringify({ name: trimmed }, null, 2));
}

// src/cli/sessions.ts
function eventsMtime(sessionDir) {
  const p = join9(sessionDir, "events.jsonl");
  return existsSync12(p) ? statSync(p).mtimeMs : null;
}
function latestSessionId(root = defaultRoot()) {
  if (!existsSync12(root)) return null;
  const names = readdirSync(root);
  if (names.length === 0) return null;
  const active = names.map((name) => ({ name, mtime: eventsMtime(join9(root, name)) })).filter((s) => s.mtime !== null).sort((a, b) => b.mtime - a.mtime);
  if (active.length > 0) return active[0].name;
  return names.map((name) => ({ name, mtime: statSync(join9(root, name)).mtimeMs })).sort((a, b) => b.mtime - a.mtime)[0].name;
}
var RUNNING_WINDOW_MS = 15e3;
var OPEN_WINDOW_MS = 10 * 6e4;
var THINKING_WINDOW_MS = 3 * 6e4;
function dayBucket(mtime, now) {
  const d = new Date(mtime);
  const n = new Date(now);
  const mtimeDay = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const nowDay = `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  if (mtimeDay === nowDay) return "Today";
  const yesterday = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
  const yDay = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (mtimeDay === yDay) return "Yesterday";
  return d.toLocaleDateString();
}
function listSessions(root = defaultRoot(), now = Date.now()) {
  if (!existsSync12(root)) return [];
  return readdirSync(root).filter((name) => statSync(join9(root, name)).isDirectory()).map((id) => {
    const dir = join9(root, id);
    const evMtime = eventsMtime(dir);
    const cache = readCache(id, root);
    const prompts = readPrompts(dir);
    const meta = readMeta(id, root);
    const lastPromptTs = prompts.length ? prompts[prompts.length - 1] : 0;
    const lastActivity = Math.max(evMtime ?? 0, lastPromptTs);
    const mtime = evMtime ?? statSync(dir).mtimeMs;
    const name = sessionDisplayName({
      firstChunkName: cache?.chunks?.[0]?.name ?? null,
      firstPrompt: readFirstPrompt(meta?.transcriptPath ?? null),
      sessionId: id,
      mtimeMs: mtime,
      customName: readCustomName(dir)
    });
    const status = readStatus(dir);
    const thinking = evMtime != null && status?.promptAt != null && status.promptAt > (status.doneAt ?? 0) && now - status.promptAt < THINKING_WINDOW_MS;
    const recentActivity = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
    const closed = status?.closedAt != null && status.closedAt >= lastActivity;
    const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
    const finished = status?.doneAt != null && status.doneAt >= lastSignal;
    const running = evMtime != null && !closed && !finished && (thinking || recentActivity);
    return {
      id,
      mtime,
      name,
      project: projectFrom(meta?.cwd ?? null),
      color: sessionColor(id),
      taskCount: cache?.chunks?.length ?? 0,
      lastPromptTs,
      running,
      open: !closed && lastActivity > 0 && now - lastActivity < OPEN_WINDOW_MS,
      acted: evMtime != null,
      live: running,
      day: dayBucket(mtime, now),
      // carried only for the filter below; not part of the public shape
      _hasEvents: evMtime != null,
      _lastActivity: lastActivity
    };
  }).filter((s) => s._hasEvents || s._lastActivity > 0 && now - s._lastActivity < OPEN_WINDOW_MS).map(({ _hasEvents, _lastActivity, ...s }) => s).sort((a, b) => b.mtime - a.mtime);
}

// src/statusline/active-mode.ts
import { readFileSync as readFileSync12, writeFileSync as writeFileSync6, existsSync as existsSync13, rmSync as rmSync3, mkdirSync as mkdirSync6, readdirSync as readdirSync2 } from "node:fs";
import { join as join10 } from "node:path";
function modeFile(sessionDir) {
  return join10(sessionDir, "mode");
}
function writeSessionMode(mode, sessionDir) {
  mkdirSync6(sessionDir, { recursive: true });
  writeFileSync6(modeFile(sessionDir), mode);
}
function clearSessionMode(sessionDir) {
  rmSync3(modeFile(sessionDir), { force: true });
}
function readSessionMode(sessionDir) {
  const p = modeFile(sessionDir);
  if (!existsSync13(p)) return null;
  const raw = readFileSync12(p, "utf8").trim();
  return raw === "simple" || raw === "deep" || raw === "teach" ? raw : null;
}
function anyActiveSession(root) {
  if (!existsSync13(root)) return false;
  for (const name of readdirSync2(root)) {
    if (existsSync13(modeFile(join10(root, name)))) return true;
  }
  return false;
}

// src/cli/statusline.ts
function readEvents(dir) {
  const p = join11(dir, "events.jsonl");
  if (!existsSync14(p)) return [];
  const out = [];
  for (const line of readFileSync13(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
    }
  }
  return out;
}
function statusLineFor(dir, now = Date.now(), mode) {
  if (!existsSync14(dir)) return "";
  const snap = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  return renderStatus(composeView(readEvents(dir), { ...snap, mode: mode ?? snap.mode }, now, readWhys(dir), readBudget(dir)));
}
function sessionFromPayload(payload) {
  try {
    const o = JSON.parse(payload);
    return typeof o.session_id === "string" && o.session_id ? o.session_id : null;
  } catch {
    return null;
  }
}
var RESET2 = "\x1B[0m";
var BOLD2 = "\x1B[1m";
var BRAND2 = "\x1B[38;5;75m";
var DIM2 = "\x1B[38;5;244m";
function offHint() {
  return `${BOLD2}${BRAND2}Codey${RESET2} ${DIM2}off \xB7 run ${RESET2}${BRAND2}/codey:simple${RESET2}${DIM2} or ${RESET2}${BRAND2}/codey:deep${RESET2}${DIM2} to narrate this session${RESET2}`;
}
function lineForSession(session, root, now) {
  if (!session) return "";
  const dir = join11(root, session);
  const mode = readSessionMode(dir);
  if (!mode) return offHint();
  return statusLineFor(dir, now, mode);
}
function runStatusLine() {
  if (process.stdin.isTTY) {
    process.stdout.write(lineForSession(latestSessionId(), defaultRoot(), Date.now()));
    return;
  }
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => raw += c);
  process.stdin.on("end", () => {
    const session = sessionFromPayload(raw);
    process.stdout.write(lineForSession(session, defaultRoot(), Date.now()));
  });
}

// src/cli/serve.ts
import { fileURLToPath } from "node:url";
import { dirname as dirname2, join as join18 } from "node:path";
import { rmSync as rmSync6 } from "node:fs";

// src/serve/server.ts
import { createServer as createHttpServer } from "node:http";
import { readFileSync as readFileSync14 } from "node:fs";
import { join as join12 } from "node:path";
function resolveRoute(method, url) {
  if (!url) return { type: "notfound" };
  const path = url.split("?")[0];
  if (method === "GET") {
    if (path === "/" || path === "/index.html") return { type: "page" };
    if (path === "/health") return { type: "health" };
    if (path === "/api/sessions") return { type: "sessions" };
    if (path === "/api/live") return { type: "live" };
    const fm = /^\/fonts\/([A-Za-z0-9_-]+\.woff2?)$/.exec(path);
    if (fm && !fm[1].includes("..")) return { type: "font", file: fm[1] };
    const mnow = /^\/api\/session\/([^/]+)\/now$/.exec(path);
    if (mnow) return { type: "now", id: decodeURIComponent(mnow[1]) };
    const m = /^\/api\/session\/([^/]+)$/.exec(path);
    if (m) return { type: "session", id: decodeURIComponent(m[1]) };
  }
  if (method === "POST") {
    const mi = /^\/api\/session\/([^/]+)\/intervene$/.exec(path);
    if (mi) return { type: "intervene", id: decodeURIComponent(mi[1]) };
    const mn = /^\/api\/session\/([^/]+)\/name$/.exec(path);
    if (mn) return { type: "rename", id: decodeURIComponent(mn[1]) };
    const me = /^\/api\/session\/([^/]+)\/explain$/.exec(path);
    if (me) return { type: "explain", id: decodeURIComponent(me[1]) };
    const md = /^\/api\/session\/([^/]+)\/dismiss$/.exec(path);
    if (md) return { type: "dismiss", id: decodeURIComponent(md[1]) };
    const mr = /^\/api\/session\/([^/]+)\/restore$/.exec(path);
    if (mr) return { type: "restore", id: decodeURIComponent(mr[1]) };
  }
  if (method === "DELETE") {
    const m = /^\/api\/session\/([^/]+)$/.exec(path);
    if (m) return { type: "delete", id: decodeURIComponent(m[1]) };
  }
  return { type: "notfound" };
}
function sendJson(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => data += c);
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
function createServer(deps) {
  return createHttpServer((req, res) => {
    const route = resolveRoute(req.method, req.url);
    try {
      if (route.type === "page") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(readFileSync14(deps.pagePath, "utf8"));
      } else if (route.type === "health") {
        sendJson(res, 200, { build: deps.buildId });
      } else if (route.type === "sessions") {
        sendJson(res, 200, deps.listSessions());
      } else if (route.type === "session") {
        sendJson(res, 200, deps.getSnapshot(route.id));
      } else if (route.type === "now") {
        sendJson(res, 200, deps.getNow(route.id));
      } else if (route.type === "live") {
        sendJson(res, 200, deps.getLive());
      } else if (route.type === "font") {
        const ct = route.file.endsWith(".woff2") ? "font/woff2" : "font/woff";
        res.writeHead(200, { "content-type": ct, "cache-control": "max-age=86400" });
        res.end(readFileSync14(join12(deps.fontsDir, route.file)));
      } else if (route.type === "intervene") {
        void readBody(req).then((body) => {
          let action = "";
          try {
            action = String(JSON.parse(body || "{}").action ?? "");
          } catch {
            action = "";
          }
          const ok = deps.intervene(route.id, action);
          sendJson(res, ok ? 200 : 400, { ok });
        });
      } else if (route.type === "rename") {
        void readBody(req).then((body) => {
          let name = "";
          try {
            name = String(JSON.parse(body || "{}").name ?? "");
          } catch {
            name = "";
          }
          const ok = deps.rename(route.id, name);
          sendJson(res, ok ? 200 : 400, { ok });
        });
      } else if (route.type === "explain") {
        void readBody(req).then(async (body) => {
          let parsed = {};
          try {
            parsed = JSON.parse(body || "{}");
          } catch {
            parsed = {};
          }
          try {
            const result = await deps.explain(route.id, parsed);
            sendJson(res, 200, result);
          } catch (err) {
            sendJson(res, 500, { error: String(err) });
          }
        });
      } else if (route.type === "delete") {
        const ok = deps.remove(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else if (route.type === "dismiss") {
        const ok = deps.dismiss(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else if (route.type === "restore") {
        const ok = deps.restore(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else {
        sendJson(res, 404, { error: "not found" });
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err) });
    }
  });
}

// src/serve/build-id.ts
function buildIdFrom(entryPath) {
  const norm = entryPath.replace(/\\/g, "/");
  for (const marker of ["/dist/", "/src/"]) {
    const i = norm.lastIndexOf(marker);
    if (i >= 0) return norm.slice(0, i);
  }
  return norm;
}

// src/serve/load-snapshot.ts
import { statSync as statSync2 } from "node:fs";
import { join as join15 } from "node:path";

// src/caption/banned.ts
var BANNED_PHRASES = [
  /see how it works/i,
  /follow how it works/i,
  /adjust how it works/i,
  /see how the pieces fit together/i,
  // Empty "thinking" filler: a row or explanation that says the agent thought without saying
  // about what. These are the exact strings the old timeline emitted for a bare thinking turn.
  /thinking it through/i,
  /working through the approach before acting/i,
  /paused and reflected/i,
  /figure out what the right next step should be/i,
  // A status line once collapsed two git reads into "git state and git state"; never again.
  /git state and git state/i,
  /\bbefore changing anything\b/i,
  /\bchanging specific lines\b/i,
  /\bchanging files in place\b/i,
  /\bfind the part it needs\b/i,
  /\bmap how they connect\b/i,
  /\bchecking the code\b/i,
  /\bsearching the project for the code\b/i,
  /\breading files to understand them\b/i,
  /\bseveral files\b/i,
  /\ba few files\b/i,
  /\bvarious files\b/i,
  /\bseveral related files\b/i,
  /\brelated project files\b/i,
  /\bin one change\b/i,
  /\brunning shell commands\b/i,
  /\bchecking shell commands\b/i,
  /\ba few shell commands\b/i,
  /\bediting files\b/i,
  /\bupdating files\b/i,
  /\bmaking changes\b/i,
  /\bimproving the implementation\b/i,
  /\bworking on the task\b/i
];
function firstBannedPhrase(text) {
  for (const re of BANNED_PHRASES) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
function hasBannedPhrase(text) {
  return firstBannedPhrase(text) !== null;
}
var VACUOUS_EXPLANATION = [
  /\bpaused (to|and) (think|reflect)/i,
  /\b(the agent|claude) (paused|stopped) (to|and)\b/i,
  /\breflected on (its|the|what)/i,
  /\bno (specific|concrete|clear|particular) (reason|detail|information|context)\b/i,
  /\bnothing (specific|concrete|particular) (to (say|add|explain)|here)\b/i
];
function isVacuousExplanation(text) {
  if (hasBannedPhrase(text)) return true;
  return VACUOUS_EXPLANATION.some((re) => re.test(text));
}

// src/timeline/attribution.ts
function basename4(p) {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function patternFrom(input) {
  if (input && typeof input === "object") {
    const p = input.pattern;
    if (typeof p === "string") return p;
  }
  return null;
}
function fileFrom(input) {
  if (input && typeof input === "object") {
    const r = input;
    const p = r.file_path ?? r.path ?? r.notebook_path;
    if (typeof p === "string") return basename4(p);
  }
  return null;
}
function fullCommand(input) {
  if (input && typeof input === "object") {
    const c = input.command;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}
function descFrom(input) {
  if (input && typeof input === "object") {
    const d = input.description;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  return null;
}
function fullPath(input) {
  if (input && typeof input === "object") {
    const r = input;
    const p = r.file_path ?? r.path ?? r.notebook_path;
    if (typeof p === "string" && p.trim()) return p.trim();
  }
  return null;
}
var GENERIC_FOLDERS = /* @__PURE__ */ new Set(["src", "lib", "dist", "app", "test", "tests", "__tests__", ""]);
function folderArea(input) {
  const p = fullPath(input);
  if (!p) return void 0;
  const parts = p.split(/[\\/]/).filter(Boolean);
  const folder = parts[parts.length - 2] ?? "";
  return GENERIC_FOLDERS.has(folder.toLowerCase()) ? void 0 : folder;
}
function prettify(s) {
  const words = s.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function decisionText(text) {
  if (!text) return null;
  const one = text.replace(/\s+/g, " ").trim();
  if (!one) return null;
  const firstSentence = (one.split(/(?<=[.!?])\s+/)[0] || one).trim();
  const clamped = firstSentence.length > 140 ? firstSentence.slice(0, 137).trimEnd() + "\u2026" : firstSentence;
  if (hasBannedPhrase(clamped)) return null;
  return /[.!?…]$/.test(clamped) ? clamped : clamped + ".";
}
function thinkingSubtitle(text) {
  return decisionText(text) ?? "Claude weighed the next step before continuing.";
}
function describeAction(tool, input, text) {
  if (!tool || tool === "thinking") return decisionText(text) ? "Deciding the next step" : "Planning the next step";
  const file6 = fileFrom(input);
  switch (tool) {
    case "Write":
      return file6 ? `Writing ${file6}` : "Writing a file";
    case "Edit":
    case "MultiEdit":
      return file6 ? `Editing ${file6}` : "Editing a file";
    case "Read":
      return file6 ? `Reading ${file6}` : "Reading a file";
    case "Bash":
    case "PowerShell":
      return descFrom(input) ?? "Ran a command";
    case "Grep":
    case "Glob": {
      const p = patternFrom(input);
      return p ? `Searched for ${phrasePattern(p)}` : "Searched the code";
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return `${prettify(m[2])} via ${m[1]}`;
  return tool;
}
function actionSubject(tool, input) {
  if (tool === "Grep" || tool === "Glob") return phrasePattern(patternFrom(input) ?? "");
  const file6 = fileFrom(input);
  if (file6) return humanFile(file6);
  return humanFile(shortTarget(actionLabel(tool, input).target)) || "the code";
}
function actionTitle(tool, input, text) {
  if (!tool || tool === "thinking") return decisionText(text) ? "Deciding the next step" : "Planning the next step";
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = fullCommand(input);
    if (cmd) return describeShellIntent(cmd, descFrom(input)).title;
  }
  return purposeTitle(tool, classifyStage(tool, input), actionSubject(tool, input), 1);
}
function actionSubtitle(tool, input, text) {
  if (!tool || tool === "thinking") return thinkingSubtitle(text);
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = fullCommand(input);
    if (cmd) return describeShellIntent(cmd, descFrom(input)).sentence;
    const desc = descFrom(input);
    if (desc) return /[.!?]$/.test(desc) ? desc : `${desc}.`;
  }
  return purposeSentence(tool, classifyStage(tool, input), actionSubject(tool, input), 1, folderArea(input));
}
function rawDetail(tool, input) {
  if (!tool) return null;
  if (tool === "Bash" || tool === "PowerShell") return fullCommand(input);
  return fullPath(input);
}
function failSummaryFrom(tool, errorText) {
  const m = errorText ? /exit code\s+(\d+)/i.exec(errorText) : null;
  const what = tool === "Bash" || tool === "PowerShell" ? "command" : tool ? "step" : "step";
  if (m) return `This ${what} failed (exit code ${m[1]}).`;
  return `This ${what} didn't succeed.`;
}
function markResolved(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].status !== "fail") continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].tool === lines[i].tool && lines[j].status === "ok") {
        lines[i].resolved = true;
        break;
      }
    }
  }
}
function attributeChunk(turns, startTs, endTs) {
  const inWindow = turns.filter((t) => t.ts >= startTs && t.ts < endTs);
  const workLines = [];
  let workTotal = 0;
  let contextTotal = 0;
  for (const t of inWindow) {
    contextTotal += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
    if (t.outputTokens <= 0 && !t.tool) continue;
    workTotal += t.outputTokens;
    const isFail = !!(t.tool && t.tool !== "thinking" && t.isError);
    const thinking = !t.tool || t.tool === "thinking";
    workLines.push({
      label: describeAction(t.tool, t.input, t.assistantText),
      title: actionTitle(t.tool, t.input, t.assistantText),
      subtitle: actionSubtitle(t.tool, t.input, t.assistantText),
      tool: t.tool ?? "thinking",
      tokens: t.outputTokens,
      status: t.tool && t.tool !== "thinking" ? t.isError ? "fail" : "ok" : "none",
      errorText: t.isError ? t.errorText : null,
      resolved: false,
      raw: rawDetail(t.tool, t.input),
      why: t.assistantText ?? null,
      failSummary: isFail ? failSummaryFrom(t.tool, t.errorText) : null,
      ts: t.ts,
      thoughtFirst: false,
      // A real action always has something to explain; a thinking turn only does when it left
      // decision text behind. An evidence-less thinking row gets no "explain this step" button.
      explainable: thinking ? decisionText(t.assistantText) !== null : true
    });
  }
  markResolved(workLines);
  return { workTotal, workLines, contextTotal };
}

// src/timeline/totals.ts
function sessionTotals(turns) {
  let work = 0;
  let context = 0;
  for (const t of turns) {
    work += t.outputTokens;
    context += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
  }
  return { work, context, total: work + context };
}

// src/timeline/grouping.ts
function loneThinkRow(run) {
  const tokens = run.reduce((sum, l) => sum + l.tokens, 0);
  const last = run[run.length - 1];
  if (last && last.explainable !== false && last.why) {
    return { ...last, tokens, thoughtFirst: false };
  }
  return {
    label: "Thought about the next step.",
    title: "Planning the next step",
    subtitle: "Claude weighed the next step before continuing.",
    tool: "thinking",
    tokens,
    status: "none",
    errorText: null,
    resolved: false,
    raw: null,
    why: last?.why ?? null,
    failSummary: null,
    ts: run[0]?.ts ?? 0,
    thoughtFirst: false,
    explainable: false
  };
}
function groupThinking(lines) {
  const out = [];
  let run = [];
  for (const l of lines) {
    if (l.status === "none") {
      run.push(l);
      continue;
    }
    if (run.length) {
      const runTokens = run.reduce((sum, r) => sum + r.tokens, 0);
      out.push({ ...l, tokens: l.tokens + runTokens, thoughtFirst: true });
      run = [];
      continue;
    }
    out.push(l);
  }
  if (run.length) out.push(loneThinkRow(run));
  return out;
}

// src/timeline/prompt-groups.ts
function clampPrompt(s, n = 80) {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n - 1).trimEnd() + "\u2026" : oneLine;
}
function windowTotals(turns, startTs, endTs) {
  let work = 0, context = 0;
  for (const t of turns) {
    if (t.ts < startTs || t.ts >= endTs) continue;
    work += t.outputTokens;
    context += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
  }
  return { work, context };
}
function groupByPrompt(prompts, chunks, turns, sessionEndTs, live, cancelledAt = 0) {
  const boundaries = [];
  const sorted = [...prompts].filter((p) => p.ts > 0).sort((a, b) => a.ts - b.ts);
  const firstActivity = Math.min(
    chunks.length ? chunks[0].startTs : Number.MAX_SAFE_INTEGER,
    turns.length ? turns[0].ts : Number.MAX_SAFE_INTEGER
  );
  if (sorted.length === 0 || firstActivity !== Number.MAX_SAFE_INTEGER && firstActivity < sorted[0].ts) {
    boundaries.push({
      id: "p0",
      label: sorted.length === 0 ? "This session" : "Earlier in this session",
      startTs: firstActivity === Number.MAX_SAFE_INTEGER ? sorted[0]?.ts ?? 0 : firstActivity
    });
  }
  sorted.forEach((p, i) => {
    boundaries.push({
      id: `p${boundaries.length}`,
      label: clampPrompt(p.text) || `Prompt ${i + 1}`,
      startTs: p.ts
    });
  });
  if (boundaries.length === 0) return [];
  return boundaries.map((b, i) => {
    const next = boundaries[i + 1];
    const endTs = next ? next.startTs : sessionEndTs;
    const isLast = i === boundaries.length - 1;
    const groupChunks = chunks.filter((c) => c.startTs >= b.startTs && (next ? c.startTs < next.startTs : true));
    const { work, context } = windowTotals(turns, b.startTs, next ? next.startTs : Number.MAX_SAFE_INTEGER);
    const liveGroup = live && isLast;
    const cancelled = cancelledAt > 0 && cancelledAt >= b.startTs && (next ? cancelledAt < next.startTs : true);
    return {
      id: b.id,
      prompt: b.label,
      startTs: b.startTs,
      endTs,
      durationMs: liveGroup ? null : Math.max(0, endTs - b.startTs),
      workTotal: work,
      contextTotal: context,
      tokenTotal: work,
      taskCount: groupChunks.length,
      chunks: groupChunks,
      live: liveGroup,
      cancelled,
      summary: null
    };
  });
}

// src/serve/snapshot.ts
var LOOP_THRESHOLD2 = 5;
var REPEAT_ERROR_THRESHOLD2 = 3;
function chunkWarnings(slice, turns) {
  const events = reconcileErrors(slice, turns);
  const out = [];
  const loop = detectLoop(events, LOOP_THRESHOLD2);
  if (loop) out.push(loop);
  const repeat = detectRepeatError(events, REPEAT_ERROR_THRESHOLD2);
  if (repeat) out.push(repeat);
  return out;
}
function chunkBoundaries(rawChunks, events, prompts) {
  if (events.length === 0) return [];
  const rc = [...rawChunks].sort((a, b) => a.startIndex - b.startIndex);
  const indices = /* @__PURE__ */ new Set([0]);
  for (const c of rc) if (c.startIndex > 0 && c.startIndex < events.length) indices.add(c.startIndex);
  for (const p of prompts) {
    if (p.ts <= 0) continue;
    const i = events.findIndex((e) => e.timestamp >= p.ts);
    if (i > 0) indices.add(i);
  }
  return [...indices].sort((a, b) => a - b).map((i) => {
    let cover = rc[0];
    for (const c of rc) {
      if (c.startIndex <= i) cover = c;
      else break;
    }
    return { startIndex: i, name: cover?.name ?? "Working", narration: cover?.narration ?? "" };
  });
}
function buildSnapshot(input) {
  const { events, rawChunks, turns } = input;
  const boundaries = chunkBoundaries(rawChunks, events, input.prompts);
  const chunks = boundaries.map((rc, idx) => {
    const next = boundaries[idx + 1];
    const startTs = events[rc.startIndex]?.timestamp ?? 0;
    const endIndex = next ? next.startIndex : events.length;
    const endTs = next ? events[next.startIndex]?.timestamp ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const slice = events.slice(rc.startIndex, endIndex);
    const raw = attributeChunk(turns, startTs, endTs);
    const workLines = groupThinking(raw.workLines);
    const receipt = { ...raw, workLines };
    return {
      id: `c${idx}`,
      name: rc.name,
      narration: rc.narration,
      startTs,
      endTs,
      tokenTotal: receipt.workTotal + receipt.contextTotal,
      workTotal: receipt.workTotal,
      contextTotal: receipt.contextTotal,
      warnings: chunkWarnings(slice, turns),
      receipt,
      explanation: null
    };
  });
  const totals = sessionTotals(turns);
  const priciest = chunks.reduce(
    (m, c) => c.workTotal > 0 && (!m || c.workTotal > m.workTotal) ? c : m,
    null
  );
  const stamps = [
    ...events.map((e) => e.timestamp),
    ...turns.map((t) => t.ts),
    ...input.prompts.map((p) => p.ts)
  ].filter((t) => t > 0);
  const startedAt = stamps.length ? Math.min(...stamps) : 0;
  const activity = [...events.map((e) => e.timestamp), ...turns.map((t) => t.ts)].filter((t) => t > 0);
  const lastActivityAt = activity.length ? Math.max(...activity) : startedAt;
  const sessionEndTs = input.live ? input.now : lastActivityAt || input.now;
  const groups = groupByPrompt(input.prompts, chunks, turns, sessionEndTs, input.live, input.cancelledAt ?? 0);
  return {
    sessionId: input.sessionId,
    sessionName: input.sessionName,
    project: input.project,
    color: input.color,
    live: input.live,
    startedAt,
    lastActivityAt,
    totalTokens: totals.total,
    workTotal: totals.work,
    contextTotal: totals.context,
    taskCount: chunks.length,
    priciestTaskName: priciest ? priciest.name : null,
    priciestTaskWork: priciest ? priciest.workTotal : 0,
    groups,
    chunks,
    activeWarning: null,
    seedDepth: input.seedDepth ?? "deep",
    genAuto: input.genAuto ?? false,
    budgetLeft: null
  };
}

// src/intervene/active-warning.ts
var LOOP_THRESHOLD3 = 5;
var REPEAT_ERROR_THRESHOLD3 = 3;
function resolveActiveWarning(events, now) {
  const lastActivityTs = events.reduce((m, e) => Math.max(m, e.timestamp), 0) || void 0;
  return detectLoop(events, LOOP_THRESHOLD3) ?? detectRepeatError(events, REPEAT_ERROR_THRESHOLD3) ?? detectHang(computeOpenCalls(events), now, hangThreshold, lastActivityTs);
}

// src/serve/active.ts
function selectActive(items) {
  return items.filter((s) => s.open).sort((a, b) => b.lastPromptTs - a.lastPromptTs);
}

// src/timeline/explain-prompt.ts
function actionContext(l) {
  const status = l.status === "fail" ? " [failed]" : "";
  const detail = l.raw ? ` (${l.raw})` : "";
  const reason = l.why ? ` reasoning: ${l.why}` : "";
  const fail = l.failSummary ? ` ${l.failSummary}` : "";
  return `- ${l.label}${detail}${status}${reason}${fail}`;
}
function taskInstruction(depth) {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this task and why.";
    case "teach":
      return "In a few plain English sentences for someone learning to code, explain what Claude did in this task and why, then briefly teach the key concept involved (define any technical term you use).";
    default:
      return "In a few plain English sentences for a non-technical person, explain what Claude did in this task, why it matters, and how it actually addresses the problem.";
  }
}
function actionInstruction(depth) {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this single step and why.";
    case "teach":
      return "Explain this single step for someone learning to code, in three labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why Claude did it. Start the next line with 'How Claude did it:' then one or two sentences on how the step works. Start a final line with 'Concept:' then briefly teach the key concept involved and define any technical term you use.";
    default:
      return "Explain this single step for a non-technical person, in two labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why this step matters. Start the next line with 'How Claude did it:' then one or two sentences on how the step works.";
  }
}
var SELF_CONTAINED = "Explain only the steps shown above. The steps are all the context that exists, so never ask the user for more information, never say you lack context, and never ask them to describe what happened. If the detail is sparse, give your best plain high-level explanation from what is shown.";
var TAIL = "Describe the goal, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the explanation, no preamble.";
function buildTaskExplainPrompt(taskName, lines, depth) {
  const body = lines.map(actionContext).join("\n");
  return [
    `Codey automatically grouped these steps from an AI coding agent and labeled the group "${taskName}". That label is a rough guess, not the agent's stated goal, so explain what the steps below actually accomplish and do not claim the agent did the wrong thing just because the steps differ from the label. These are the steps, with the agent's own reasoning:`,
    body,
    "",
    `${taskInstruction(depth)} ${SELF_CONTAINED} ${TAIL}`
  ].join("\n");
}
function buildActionExplainPrompt(line, depth) {
  const intro = line.tool === "thinking" ? "An AI coding agent was deciding what to do next. This is that decision point, with the agent's own words:" : "An AI coding agent took this single step, with its own reasoning:";
  const decisionRule = line.tool === "thinking" ? " Explain the specific decision the agent was making and what it chose to do next, grounded in its words above. Do not say the agent paused, reflected, or thought; name the actual choice." : "";
  return [
    intro,
    actionContext(line),
    "",
    `${actionInstruction(depth)}${decisionRule} ${SELF_CONTAINED} ${TAIL}`
  ].join("\n");
}

// src/timeline/summary-prompt.ts
function taskBlock(t) {
  const reasons = t.lines.map((l) => l.why ? `    - ${l.why}` : `    - ${l.label}`).join("\n");
  return `- ${t.name}
${reasons}`;
}
function basename5(p) {
  return p.replace(/["']/g, "").split(/[\\/]/).pop() || p;
}
var EDIT_TOOLS = /* @__PURE__ */ new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
function changedFiles(tasks) {
  const out = [];
  for (const t of tasks) {
    for (const l of t.lines) {
      if (EDIT_TOOLS.has(l.tool) && l.raw) {
        const name = basename5(l.raw);
        if (!out.includes(name)) out.push(name);
      }
    }
  }
  return out;
}
function verifications(tasks) {
  const out = [];
  for (const t of tasks) {
    for (const l of t.lines) {
      if (l.tool !== "Bash" && l.tool !== "PowerShell" || !l.raw) continue;
      const cmd = l.raw;
      let v = null;
      if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) v = "the tests";
      else if (/\bbuild\b/.test(cmd)) v = "the build";
      else if (/\b(typecheck|tsc|lint|eslint)\b/.test(cmd)) v = "the checks";
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out;
}
function evidenceBlock(tasks) {
  const files = changedFiles(tasks);
  const checks = verifications(tasks);
  const lines = [
    "Grounding evidence (use only what is listed here, do not invent more):",
    `Files touched: ${files.length ? files.join(", ") : "none (Claude only looked around, did not change files)"}`,
    `Verification that ran: ${checks.length ? checks.join(", ") : "none (do not claim anything was tested or verified)"}`
  ];
  return lines.join("\n");
}
function instruction(depth) {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, recap what Claude accomplished for this prompt. Only say it changed, fixed, or verified something if the evidence shows it; otherwise say what it inspected or found.";
    case "teach":
      return [
        "Recap what Claude accomplished, for someone learning to code, using these sections with a blank line between them:",
        "What changed: a few short bullets on the actual behavior that changed (or, if nothing changed, what Claude inspected or found).",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "Then add one short plain-English note teaching the key concept involved (define any technical term you use).",
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it."
      ].join("\n");
    default:
      return [
        "Recap what Claude accomplished for a non-technical person, using these sections with a blank line between them:",
        "What changed: a few short bullets on the actual behavior that changed (or, if nothing changed, what Claude inspected or found).",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it."
      ].join("\n");
  }
}
function buildSummaryPrompt(promptText, tasks, depth) {
  const body = tasks.map(taskBlock).join("\n");
  return [
    `A user asked an AI coding agent: "${promptText}"`,
    "It worked through these tasks, with its own reasoning:",
    body,
    "",
    evidenceBlock(tasks),
    "",
    `${instruction(depth)} Focus on the outcome, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the recap, no preamble.`
  ].join("\n");
}

// src/timeline/explain-cache.ts
import { readFileSync as readFileSync15, writeFileSync as writeFileSync7, existsSync as existsSync15, mkdirSync as mkdirSync7 } from "node:fs";
import { join as join13 } from "node:path";
function cachePath2(sessionId, root) {
  return join13(root, sessionId, "explanations.json");
}
function idPrefix(scope, id) {
  return `${scope}:${id}:`;
}
function key(scope, id, contentHash, depth) {
  return `${idPrefix(scope, id)}${contentHash}:${depth}`;
}
function read(sessionId, root) {
  const p = cachePath2(sessionId, root);
  if (!existsSync15(p)) return {};
  try {
    const o = JSON.parse(readFileSync15(p, "utf8"));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function readExplanation(sessionId, scope, id, contentHash, depth, root = defaultRoot()) {
  const store = read(sessionId, root);
  const hit = store[key(scope, id, contentHash, depth)];
  return hit == null ? null : stripDashes(hit);
}
function writeExplanation(sessionId, scope, id, contentHash, depth, text, root = defaultRoot()) {
  const store = read(sessionId, root);
  const prefix = idPrefix(scope, id);
  const live = key(scope, id, contentHash, depth);
  for (const k of Object.keys(store)) {
    if (k.startsWith(prefix) && !k.startsWith(`${prefix}${contentHash}:`) && k !== live) delete store[k];
  }
  store[live] = stripDashes(text);
  mkdirSync7(join13(root, sessionId), { recursive: true });
  writeFileSync7(cachePath2(sessionId, root), JSON.stringify(store));
}

// src/util/hash.ts
import { createHash } from "node:crypto";
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}
function hashContent(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

// src/timeline/explain-service.ts
function timelineDefaults(mode) {
  switch (mode) {
    case "simple":
      return { seedDepth: "simple", genAuto: false };
    case "teach":
      return { seedDepth: "teach", genAuto: true };
    case "deep":
      return { seedDepth: "deep", genAuto: true };
    default:
      return { seedDepth: "deep", genAuto: false };
  }
}
function lineKey(l) {
  return [l.label, l.tool, l.status, l.why, l.raw, l.failSummary];
}
function parseActionId(id) {
  const at = id.lastIndexOf("#");
  if (at < 0) return null;
  const index = Number(id.slice(at + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { chunkId: id.slice(0, at), index };
}
function summaryTasks(chunks) {
  return chunks.map((c) => ({ name: c.name, lines: c.receipt.workLines }));
}
function locate(snap, req) {
  if (req.scope === "task") {
    const c = snap.chunks.find((x) => x.id === req.id);
    if (!c) return null;
    const lines = c.receipt.workLines;
    return { prompt: buildTaskExplainPrompt(c.name, lines, req.depth), hash: hashContent(lines.map(lineKey)) };
  }
  if (req.scope === "action") {
    const parsed = parseActionId(req.id);
    if (!parsed) return null;
    const c = snap.chunks.find((x) => x.id === parsed.chunkId);
    const line = c?.receipt.workLines[parsed.index];
    if (!line) return null;
    return { prompt: buildActionExplainPrompt(line, req.depth), hash: hashContent(lineKey(line)) };
  }
  const g = snap.groups.find((x) => x.id === req.id);
  if (!g) return null;
  const tasks = summaryTasks(g.chunks);
  const hash = hashContent([g.prompt, tasks.map((t) => [t.name, t.lines.map(lineKey)])]);
  return { prompt: buildSummaryPrompt(g.prompt, tasks, req.depth), hash };
}
async function explain(snap, req, deps) {
  const loc = locate(snap, req);
  if (!loc) return { text: null, cached: false, paused: false };
  const hit = readExplanation(req.sessionId, req.scope, req.id, loc.hash, req.depth, deps.root);
  if (hit != null) return { text: hit, cached: true, paused: false };
  if (!budgetAllows(readBudget(deps.sessionDir))) return { text: null, cached: false, paused: true };
  const res = await deps.narrate(loc.prompt);
  if (!res || !res.text.trim()) return { text: null, cached: false, paused: false };
  addSpend(deps.sessionDir, res.tokens);
  const text = stripDashes(res.text.trim());
  if (isVacuousExplanation(text)) return { text: null, cached: false, paused: false };
  writeExplanation(req.sessionId, req.scope, req.id, loc.hash, req.depth, text, deps.root);
  return { text, cached: false, paused: false };
}
function fillCachedExplanations(snap, depth, root) {
  const chunks = snap.chunks.map((c) => {
    const loc = locate(snap, { sessionId: snap.sessionId, scope: "task", id: c.id, depth });
    const hit = loc ? readExplanation(snap.sessionId, "task", c.id, loc.hash, depth, root) : null;
    return { ...c, explanation: hit };
  });
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const groups = snap.groups.map((g) => {
    const loc = locate(snap, { sessionId: snap.sessionId, scope: "summary", id: g.id, depth });
    const hit = loc ? readExplanation(snap.sessionId, "summary", g.id, loc.hash, depth, root) : null;
    return { ...g, summary: hit, chunks: g.chunks.map((c) => byId.get(c.id) ?? c) };
  });
  return { ...snap, chunks, groups };
}

// src/serve/now.ts
var TRAIL = 5;
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function currentLabel(tool, input) {
  const a = actionLabel(tool, input);
  return cap(`${a.tag} ${shortTarget(a.target)}`).trim();
}
function baseName(p) {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function currentDetail(tool, input) {
  const raw = rawTarget(tool, input);
  if (!raw) return null;
  if (tool === "Read" || tool === "Edit" || tool === "MultiEdit" || tool === "Write") return baseName(raw);
  const line = raw.trim().split("\n")[0];
  return line.length > 56 ? line.slice(0, 55) + "\u2026" : line;
}
function pastLabel(tool, input) {
  const a = actionLabel(tool, input);
  return cap(`${pastTense(a.tag)} ${shortTarget(a.target)}`).trim();
}
function completedSteps(events) {
  const open = /* @__PURE__ */ new Map();
  const done = [];
  for (const e of events) {
    const q = open.get(e.tool) ?? [];
    if (e.phase === "pre") {
      q.push(e);
      open.set(e.tool, q);
    } else {
      const pre = q.shift();
      open.set(e.tool, q);
      done.push({ label: pastLabel(e.tool, pre?.input ?? null), status: e.isError ? "fail" : "ok" });
    }
  }
  return done;
}
function buildNowView(allEvents, status, now, turnStart = Number.NEGATIVE_INFINITY, cancelledAt = 0) {
  const empty = { live: false, action: null, since: 0, thinking: false, steps: [] };
  if (allEvents.length === 0 && !status) return empty;
  const events = allEvents.filter((e) => e.timestamp >= turnStart);
  const lastActivity = events.reduce((m, e) => Math.max(m, e.timestamp), 0);
  const closed = status?.closedAt != null && status.closedAt >= Math.max(lastActivity, status.promptAt ?? 0);
  if (closed) return { ...empty, steps: completedSteps(events).slice(-TRAIL).reverse() };
  const steps = completedSteps(events).slice(-TRAIL).reverse();
  const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
  const finished = status?.doneAt != null && status.doneAt >= lastSignal;
  const cancelled = cancelledAt > 0 && cancelledAt >= lastSignal;
  if (finished || cancelled) return { ...empty, steps };
  const openCalls = computeOpenCalls(events);
  const current = openCalls.length ? openCalls[openCalls.length - 1] : null;
  const thinking = !current && status?.promptAt != null && status.promptAt > lastActivity && now - status.promptAt < THINKING_WINDOW_MS;
  const recent = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
  const turnInFlight = status?.promptAt != null && status.promptAt > (status.doneAt ?? 0) && now - status.promptAt < THINKING_WINDOW_MS;
  const live = !!current || thinking || recent || turnInFlight;
  if (current) {
    const action = {
      label: currentLabel(current.tool, current.input),
      tool: current.tool,
      detail: currentDetail(current.tool, current.input)
    };
    return { live, action, since: current.timestamp, thinking: false, steps };
  }
  if (thinking) {
    return { live, action: null, since: status.promptAt, thinking: true, steps };
  }
  return { live, action: null, since: lastActivity, thinking: false, steps };
}

// src/store/dismissed-store.ts
import { writeFileSync as writeFileSync8, readFileSync as readFileSync16, existsSync as existsSync16, mkdirSync as mkdirSync8 } from "node:fs";
import { join as join14 } from "node:path";
var FILE = "dismissed.json";
function file5(root) {
  return join14(root, FILE);
}
function readDismissed(root) {
  const p = file5(root);
  if (!existsSync16(p)) return /* @__PURE__ */ new Set();
  try {
    const parsed = JSON.parse(readFileSync16(p, "utf8"));
    if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function write(root, ids) {
  mkdirSync8(root, { recursive: true });
  writeFileSync8(file5(root), JSON.stringify([...ids], null, 2));
}
function dismiss(root, id) {
  const ids = readDismissed(root);
  if (ids.has(id)) return;
  ids.add(id);
  write(root, ids);
}
function restore(root, id) {
  const ids = readDismissed(root);
  if (!ids.delete(id)) return;
  write(root, ids);
}

// src/serve/load-snapshot.ts
function isRunning(dir, now, cancelledAt = 0) {
  let evMtime = 0;
  try {
    evMtime = statSync2(join15(dir, "events.jsonl")).mtimeMs;
  } catch {
    evMtime = 0;
  }
  const prompts = readPrompts(dir);
  const lastPrompt = prompts.length ? prompts[prompts.length - 1] : 0;
  const lastActivity = Math.max(evMtime, lastPrompt);
  const withinWindow = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
  const status = readStatus(dir);
  if (status?.closedAt != null && status.closedAt >= lastActivity) return false;
  const isThinking = status?.promptAt != null && status.promptAt > (status.doneAt ?? 0) && now - status.promptAt < THINKING_WINDOW_MS;
  const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
  const finished = status?.doneAt != null && status.doneAt >= lastSignal;
  if (finished) return false;
  if (cancelledAt > 0 && cancelledAt >= lastSignal) return false;
  return withinWindow || isThinking;
}
function loadSnapshot(sessionId, root = defaultRoot()) {
  const store = new SessionStore(sessionId, root);
  const events = store.readAll();
  const meta = readMeta(sessionId, root);
  const turns = readTranscriptTurns(meta?.transcriptPath ?? null);
  const cancelledAt = readLastInterrupt(meta?.transcriptPath ?? null);
  const now = Date.now();
  const live = isRunning(store.dir, now, cancelledAt);
  const promptMarks = readPrompts(store.dir);
  const lastPrompt = promptMarks.length ? promptMarks[promptMarks.length - 1] : 0;
  const foundTurn = lastPrompt > 0 ? events.findIndex((e) => e.timestamp >= lastPrompt) : 0;
  const turnStartIndex = foundTurn >= 0 ? foundTurn : events.length;
  const rawChunks = chunksFor(sessionId, events, root, { live, turnStartIndex });
  let mtimeMs = 0;
  try {
    mtimeMs = statSync2(store.path).mtimeMs;
  } catch {
    mtimeMs = 0;
  }
  const name = sessionDisplayName({
    firstChunkName: rawChunks[0]?.name ?? null,
    firstPrompt: readFirstPrompt(meta?.transcriptPath ?? null),
    sessionId,
    mtimeMs,
    customName: readCustomName(store.dir)
  });
  let prompts = readUserPrompts(meta?.transcriptPath ?? null);
  if (prompts.length === 0) prompts = promptMarks.map((ts) => ({ ts, text: "" }));
  const { seedDepth, genAuto } = timelineDefaults(readSessionMode(store.dir));
  const snap = buildSnapshot({
    sessionId,
    sessionName: name,
    project: projectFrom(meta?.cwd ?? null),
    color: sessionColor(sessionId),
    live,
    events,
    rawChunks,
    turns,
    prompts,
    now,
    seedDepth,
    genAuto,
    cancelledAt
  });
  const reconciled = reconcileErrors(events, turns);
  const withMeta = {
    ...snap,
    activeWarning: live ? resolveActiveWarning(reconciled, Date.now()) : null,
    budgetLeft: budgetLeftLabel(readBudget(store.dir))
  };
  return fillCachedExplanations(withMeta, seedDepth, root);
}
function loadNow(sessionId, root = defaultRoot()) {
  const store = new SessionStore(sessionId, root);
  const marks = readPrompts(store.dir);
  const turnStart = marks.length ? marks[marks.length - 1] : Number.NEGATIVE_INFINITY;
  const cancelledAt = readLastInterrupt(readMeta(sessionId, root)?.transcriptPath ?? null);
  return buildNowView(store.readAll(), readStatus(store.dir), Date.now(), turnStart, cancelledAt);
}
function isScope(s) {
  return s === "task" || s === "action" || s === "summary";
}
function isDepth(s) {
  return s === "simple" || s === "deep" || s === "teach";
}
function safeId(id) {
  return !!id && !id.includes("/") && !id.includes("\\") && !id.includes("..");
}
async function runExplain(sessionId, body, root = defaultRoot()) {
  if (!safeId(sessionId)) return { text: null, cached: false, paused: false };
  const b = body && typeof body === "object" ? body : {};
  if (!isScope(b.scope) || !isDepth(b.depth) || typeof b.id !== "string") {
    return { text: null, cached: false, paused: false };
  }
  const snap = loadSnapshot(sessionId, root);
  return explain(
    snap,
    { sessionId, scope: b.scope, id: b.id, depth: b.depth },
    { narrate: (prompt) => runClaudeMetered(prompt), root, sessionDir: join15(root, sessionId) }
  );
}
function loadLive(root = defaultRoot()) {
  const all = selectActive(listSessions(root));
  const dismissed = readDismissed(root);
  const hidden = all.filter((s) => dismissed.has(s.id)).map((s) => ({ sessionId: s.id, name: s.name, color: s.color }));
  const active = all.filter((s) => !dismissed.has(s.id));
  const sessions = active.map((s) => {
    const snap = loadSnapshot(s.id, root);
    const events = new SessionStore(s.id, root).readAll();
    const last = events[events.length - 1];
    const running = s.running && snap.live;
    const runningTool = running && last && last.phase === "pre" ? last.tool : null;
    const lastGroup = snap.groups[snap.groups.length - 1];
    const prompt = s.lastPromptTs > 0 && lastGroup ? lastGroup.prompt : "";
    const cancelled = lastGroup?.cancelled ?? false;
    const groupId = s.lastPromptTs > 0 && lastGroup ? lastGroup.id : null;
    return {
      sessionId: s.id,
      name: s.name,
      project: s.project,
      color: s.color,
      workTotal: snap.workTotal,
      running,
      open: s.open,
      lastPromptTs: s.lastPromptTs,
      chunks: snap.chunks,
      // The full prompt history, so each pane renders as a real single-terminal timeline
      // (oldest prompt on top, newest below) instead of a single overwriting receipt.
      groups: snap.groups,
      runningTool,
      acted: s.acted,
      // Live but no tool open: Claude is thinking (before the first tool) or between calls.
      thinking: running && !runningTool,
      prompt,
      cancelled,
      groupId,
      seedDepth: snap.seedDepth
    };
  });
  return { sessions, liveCount: sessions.filter((s) => s.running).length, hidden };
}

// src/intervene/file-io.ts
import { writeFileSync as writeFileSync9, readFileSync as readFileSync17, existsSync as existsSync17, rmSync as rmSync4, mkdirSync as mkdirSync9 } from "node:fs";
import { join as join16 } from "node:path";
function interventionPath(sessionId, root = defaultRoot()) {
  return join16(root, sessionId, "intervene.json");
}
function writeInterventionFile(sessionId, file6, root = defaultRoot()) {
  mkdirSync9(join16(root, sessionId), { recursive: true });
  writeFileSync9(interventionPath(sessionId, root), JSON.stringify(file6));
}

// src/intervene/record.ts
var ACTIONS = ["nudge", "different", "stop"];
function isAction(a) {
  return ACTIONS.includes(a);
}
function recordIntervention(sessionId, action, root = defaultRoot()) {
  if (!isAction(action)) return false;
  const events = new SessionStore(sessionId, root).readAll();
  const warning = resolveActiveWarning(events, Date.now());
  if (!warning) return false;
  writeInterventionFile(
    sessionId,
    { action, tool: warning.tool, count: warning.count, createdAt: Date.now() },
    root
  );
  return true;
}

// src/store/session-prune.ts
import { readdirSync as readdirSync3, statSync as statSync3, existsSync as existsSync18, rmSync as rmSync5 } from "node:fs";
import { join as join17 } from "node:path";
function newestMtime(dir) {
  let newest = statSync3(dir).mtimeMs;
  let entries;
  try {
    entries = readdirSync3(dir);
  } catch {
    return newest;
  }
  for (const name of entries) {
    try {
      const ms = statSync3(join17(dir, name)).mtimeMs;
      if (ms > newest) newest = ms;
    } catch {
    }
  }
  return newest;
}
function pruneEventless(root, now, maxAgeMs) {
  if (!existsSync18(root)) return [];
  let entries;
  try {
    entries = readdirSync3(root);
  } catch {
    return [];
  }
  const removed = [];
  for (const name of entries) {
    const dir = join17(root, name);
    try {
      if (!statSync3(dir).isDirectory()) continue;
      if (existsSync18(join17(dir, "events.jsonl"))) continue;
      const age = now - newestMtime(dir);
      if (age < maxAgeMs) continue;
      rmSync5(dir, { recursive: true, force: true });
      removed.push(name);
    } catch {
    }
  }
  return removed;
}

// src/cli/serve.ts
var here = dirname2(fileURLToPath(import.meta.url));
function publicDir() {
  return join18(here, "..", "serve", "public");
}
function runServe(opts) {
  try {
    pruneEventless(defaultRoot(), Date.now(), 30 * 6e4);
  } catch {
  }
  const server = createServer({
    pagePath: join18(publicDir(), "index.html"),
    fontsDir: join18(publicDir(), "fonts"),
    buildId: buildIdFrom(fileURLToPath(import.meta.url)),
    listSessions: () => listSessions(),
    getSnapshot: (id) => loadSnapshot(id),
    getNow: (id) => loadNow(id),
    getLive: () => loadLive(),
    intervene: (id, action) => recordIntervention(id, action),
    rename: (id, name) => {
      if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) return false;
      try {
        writeCustomName(join18(defaultRoot(), id), name);
        return true;
      } catch {
        return false;
      }
    },
    remove: (id) => {
      if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) return false;
      try {
        rmSync6(join18(defaultRoot(), id), { recursive: true, force: true });
        return true;
      } catch {
        return false;
      }
    },
    dismiss: (id) => {
      if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) return false;
      try {
        dismiss(defaultRoot(), id);
        return true;
      } catch {
        return false;
      }
    },
    restore: (id) => {
      if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) return false;
      try {
        restore(defaultRoot(), id);
        return true;
      } catch {
        return false;
      }
    },
    explain: (id, body) => runExplain(id, body)
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${opts.port} is already in use.`);
    } else {
      console.error(`Timeline server error: ${err.message}`);
    }
    process.exit(1);
  });
  server.listen(opts.port, () => {
    console.log(`Codey timeline at http://localhost:${opts.port}`);
    if (opts.session) console.log(`(session: ${opts.session})`);
  });
}

// src/cli/feed.ts
import { existsSync as existsSync19, watchFile as watchFile3 } from "node:fs";
import { join as join19 } from "node:path";

// src/feed/render.ts
var RESET3 = "\x1B[0m";
var BOLD3 = "\x1B[1m";
var DIM3 = "\x1B[2m";
var BRAND3 = "\x1B[38;5;75m";
var NUM = "\x1B[38;5;220m";
var TITLE = "\x1B[38;5;253m";
var BODY = "\x1B[38;5;250m";
var LAV = "\x1B[38;5;147m";
var RED2 = "\x1B[38;5;203m";
var RULE = "\x1B[38;5;240m";
function turnOf(ts, prompts) {
  let t = 0;
  for (const p of prompts) {
    if (ts >= p) t++;
    else break;
  }
  return t;
}
function whyFor(start, end, whys) {
  const inWindow = whys.filter((w) => w.ts >= start && w.ts < end);
  return inWindow.length ? inWindow[inWindow.length - 1].why : null;
}
function feedChunks(events, prompts, whys, mode) {
  const byTurn = /* @__PURE__ */ new Map();
  for (const e of events) {
    const t = turnOf(e.timestamp, prompts);
    (byTurn.get(t) ?? byTurn.set(t, []).get(t)).push(e);
  }
  const out = [];
  for (const turn of [...byTurn.keys()].sort((a, b) => a - b)) {
    const chunks = chunkEvents(byTurn.get(turn));
    chunks.forEach((chunk, i) => {
      const end = chunks[i + 1]?.startTs ?? Infinity;
      const why = whyFor(chunk.startTs, end, whys);
      out.push({ key: `${turn}:${chunk.index}`, turn, step: chunk.index, ts: chunk.startTs, caption: buildCaption(chunk, mode, why) });
    });
  }
  return out;
}
function turnHeader(turn, prompts) {
  const ts = prompts[turn - 1];
  const when = ts ? new Date(ts).toTimeString().slice(0, 5) : "";
  const label = when ? `Prompt ${turn} \xB7 ${when}` : `Before the first prompt`;
  return `
${BOLD3}${BRAND3}\u2550\u2550 ${label} \u2550\u2550${RESET3}`;
}
function chunkBlock(c) {
  const cap2 = c.caption;
  const sentence = cap2.teach ?? cap2.deep ?? cap2.simple;
  const lines = [
    `${RULE}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET3}`,
    `${BOLD3}${NUM}${c.step}.${RESET3} ${TITLE}${cap2.title}${RESET3}`,
    `   ${BODY}${sentence}${RESET3}`
  ];
  if (cap2.outcome) {
    const tone = cap2.stage === "debugging" && !/recover/i.test(cap2.outcome) ? RED2 : LAV;
    lines.push(`   ${tone}${cap2.outcome}${RESET3}`);
  }
  return lines.join("\n");
}
function renderFeedHeader() {
  return `${BOLD3}${BRAND3}codey${RESET3} ${DIM3}\xB7 session work log${RESET3}`;
}
function advanceFeed(chunks, cursor, sealAll = false) {
  const parts = [];
  const printedChunks = new Set(cursor.printedChunks);
  const turnsHeadered = new Set(cursor.turnsHeadered);
  const lastKey = chunks[chunks.length - 1]?.key;
  const prompts = promptTimes(chunks);
  for (const c of chunks) {
    const sealed = sealAll || c.key !== lastKey;
    if (!sealed || printedChunks.has(c.key)) continue;
    if (!turnsHeadered.has(c.turn)) {
      parts.push(turnHeader(c.turn, prompts));
      turnsHeadered.add(c.turn);
    }
    parts.push(chunkBlock(c));
    printedChunks.add(c.key);
  }
  return { text: parts.join("\n"), cursor: { printedChunks, turnsHeadered } };
}
function promptTimes(chunks) {
  const firstOfTurn = /* @__PURE__ */ new Map();
  for (const c of chunks) {
    if (c.turn >= 1 && !firstOfTurn.has(c.turn)) firstOfTurn.set(c.turn, c.ts);
  }
  const max = Math.max(0, ...firstOfTurn.keys());
  const out = [];
  for (let t = 1; t <= max; t++) out.push(firstOfTurn.get(t) ?? 0);
  return out;
}

// src/cli/feed.ts
function runFeed(sessionId) {
  const store = new SessionStore(sessionId);
  const narrationPath = join19(store.dir, "narration.jsonl");
  const promptsPath = join19(store.dir, "prompts.jsonl");
  let cursor = { printedChunks: /* @__PURE__ */ new Set(), turnsHeadered: /* @__PURE__ */ new Set() };
  const build = () => {
    const mode = readSessionMode(store.dir) ?? "simple";
    return feedChunks(store.readAll(), readPrompts(store.dir), readWhys(store.dir), mode);
  };
  const flush = () => {
    if (!existsSync19(store.path)) return;
    const r = advanceFeed(build(), cursor);
    cursor = r.cursor;
    if (r.text) process.stdout.write(r.text + "\n");
  };
  process.stdout.write(renderFeedHeader() + "\n");
  flush();
  watchFile3(store.path, { interval: 1e3 }, flush);
  watchFile3(narrationPath, { interval: 1e3 }, flush);
  watchFile3(promptsPath, { interval: 1e3 }, flush);
}

// src/cli/toggle.ts
import { readFileSync as readFileSync18, writeFileSync as writeFileSync10, existsSync as existsSync20, mkdirSync as mkdirSync10, rmSync as rmSync7 } from "node:fs";
import { spawn } from "node:child_process";
import { join as join20, dirname as dirname3 } from "node:path";
import { homedir as homedir2 } from "node:os";
function withStatusLine(s, command2) {
  return { ...s, statusLine: { type: "command", command: command2 } };
}
function withoutStatusLine(s) {
  const next = { ...s };
  delete next.statusLine;
  return next;
}
function settingsPath() {
  return join20(homedir2(), ".claude", "settings.json");
}
function readSettings() {
  const p = settingsPath();
  if (!existsSync20(p)) return {};
  try {
    return JSON.parse(readFileSync18(p, "utf8"));
  } catch {
    return {};
  }
}
function writeSettings(s) {
  const p = settingsPath();
  mkdirSync10(dirname3(p), { recursive: true });
  writeFileSync10(p, JSON.stringify(s, null, 2));
}
function statusLineCommand(self) {
  return `node "${self}" statusline`;
}
function ensureStatusLine(self) {
  const s = readSettings();
  if (!s.statusLine) writeSettings(withStatusLine(s, statusLineCommand(self)));
}
function pidPath(sessionDir) {
  return join20(sessionDir, "narrator.pid");
}
function stopNarrator(path, kill = (pid) => process.kill(pid)) {
  if (!existsSync20(path)) return;
  const pid = Number(readFileSync18(path, "utf8").trim());
  if (pid > 0) {
    try {
      kill(pid);
    } catch {
    }
  }
  rmSync7(path, { force: true });
}
function turnOn(mode, session) {
  const self = process.argv[1];
  const dir = join20(defaultRoot(), session);
  mkdirSync10(dir, { recursive: true });
  stopNarrator(pidPath(dir));
  writeSessionMode(mode, dir);
  patchStatus(dir, { mode, why: null, action: null, warning: null, doneAt: null });
  writeSettings(withStatusLine(readSettings(), statusLineCommand(self)));
  const child = spawn(process.execPath, [self, "narrate", "--mode", mode, "--session", session], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  writeFileSync10(pidPath(dir), String(child.pid ?? ""));
}
function turnOff(session) {
  const dir = join20(defaultRoot(), session);
  stopNarrator(pidPath(dir));
  clearBudget(dir);
  clearSessionMode(dir);
  if (!anyActiveSession(defaultRoot())) writeSettings(withoutStatusLine(readSettings()));
}

// src/cli/timeline.ts
import { spawn as spawn2 } from "node:child_process";
import { connect } from "node:net";
import { get as httpGet } from "node:http";
import { readFileSync as readFileSync19, writeFileSync as writeFileSync11, existsSync as existsSync21 } from "node:fs";
import { join as join21 } from "node:path";
var DEFAULT_PORT = 4317;
function timelineDecision(lock, currentBuild, probe) {
  if (!lock) return { action: "spawn", port: DEFAULT_PORT };
  const p = probe(lock.port);
  if (!p.up) return { action: "spawn", port: DEFAULT_PORT };
  if (p.build && p.build === currentBuild) return { action: "reuse", port: lock.port };
  return { action: "replace", port: lock.port, pid: lock.pid };
}
function lockPath(root) {
  return join21(root, "serve.lock");
}
function readLock(root) {
  const p = lockPath(root);
  if (!existsSync21(p)) return null;
  try {
    const o = JSON.parse(readFileSync19(p, "utf8"));
    if (typeof o.port === "number" && typeof o.pid === "number") {
      return { port: o.port, pid: o.pid, build: typeof o.build === "string" ? o.build : "" };
    }
    return null;
  } catch {
    return null;
  }
}
function probePort(port, timeoutMs = 300) {
  return new Promise((resolve) => {
    const sock = connect({ host: "127.0.0.1", port });
    const done = (ok) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}
function fetchBuild(port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const req = httpGet({ host: "127.0.0.1", port, path: "/health", timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try {
          resolve(String(JSON.parse(data).build ?? "") || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
  });
}
async function waitForPort(port, attempts = 20, gapMs = 150) {
  for (let i = 0; i < attempts; i++) {
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return false;
}
async function waitForPortFree(port, attempts = 20, gapMs = 150) {
  for (let i = 0; i < attempts; i++) {
    if (!await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return false;
}
function killPid(pid) {
  try {
    process.kill(pid);
  } catch {
  }
}
async function runTimeline() {
  const session = latestSessionId();
  if (!session) {
    console.error("No Codey sessions found yet.");
    process.exit(1);
  }
  const root = defaultRoot();
  const currentBuild = buildIdFrom(process.argv[1]);
  ensureStatusLine(process.argv[1]);
  const lock = readLock(root);
  let probed = { up: false, build: null };
  if (lock) {
    const up = await probePort(lock.port);
    probed = { up, build: up ? await fetchBuild(lock.port) : null };
  }
  const plan = timelineDecision(lock, currentBuild, () => probed);
  if (plan.action === "reuse") {
    console.log(`Codey timeline already open at http://localhost:${plan.port}`);
    return;
  }
  if (plan.action === "replace") {
    killPid(plan.pid);
    if (!await waitForPortFree(plan.port)) {
      console.error(`Could not free port ${plan.port}; the old timeline server is still running. Close it and try again.`);
      process.exit(1);
    }
  }
  const port = DEFAULT_PORT;
  const self = process.argv[1];
  const child = spawn2(process.execPath, [self, "serve", "--session", session, "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  const ready = await waitForPort(port);
  const build = ready ? await fetchBuild(port) : null;
  if (ready && build && build !== currentBuild) {
    console.error(`A different timeline build is serving port ${port}. Close it and try again.`);
    process.exit(1);
  }
  writeFileSync11(lockPath(root), JSON.stringify({ port, pid: child.pid ?? 0, build: currentBuild }));
  if (ready) console.log(`Codey timeline at http://localhost:${port}`);
  else console.log(`Codey timeline starting at http://localhost:${port} (give it a moment to open).`);
}

// src/cli/index.ts
import { join as join22 } from "node:path";
function parseMode(m) {
  return ["simple", "deep", "teach"].includes(m) ? m : "simple";
}
function resolveWatchMode(opt, session) {
  if (opt) return parseMode(opt);
  const snap = readStatus(join22(defaultRoot(), session));
  return snap?.mode ?? "simple";
}
var program2 = new Command();
program2.name("codey").description("Live legibility for Claude Code");
program2.command("watch").description("Watch the current Claude Code session and narrate what it's doing").option("-m, --mode <mode>", "narration depth: simple | deep | teach (defaults to the session's mode)").option("-s, --session <id>", "session id to watch (defaults to most recent)").action((opts) => {
  const session = opts.session ?? latestSessionId();
  if (!session) {
    console.error("No Codey sessions found yet. Start a Claude Code session with the plugin enabled, then run `codey watch`.");
    process.exit(1);
  }
  runWatch(session, resolveWatchMode(opts.mode, session));
});
program2.command("serve").description("Open the browser timeline for a Claude Code session").option("-s, --session <id>", "session id to open (defaults to most recent)").option("-p, --port <port>", "port to serve on", "4317").action((opts) => {
  runServe({ session: opts.session, port: Number(opts.port) || 4317 });
});
program2.command("feed").description("Scrollable terminal view of every task and why in this session").option("-s, --session <id>", "session id to show (defaults to most recent)").action((opts) => {
  const session = opts.session ?? latestSessionId();
  if (!session) {
    console.error("No Codey sessions found yet.");
    process.exit(1);
  }
  runFeed(session);
});
program2.command("narrate").description("Background narrator that feeds the status line").option("-m, --mode <mode>", "narration depth: simple | deep | teach", "simple").option("-s, --session <id>", "session id (defaults to most recent)").action((opts) => {
  const mode = parseMode(opts.mode);
  const session = opts.session ?? latestSessionId();
  if (!session) {
    console.error("No Codey sessions found yet.");
    process.exit(1);
  }
  runNarrate(session, mode);
});
program2.command("statusline").description("Print the Codey status line (called by Claude Code)").action(() => runStatusLine());
program2.command("on").description("Turn narration on in the status line").option("-m, --mode <mode>", "simple | deep | teach", "simple").action((opts) => {
  const mode = parseMode(opts.mode);
  const session = latestSessionId();
  if (!session) {
    console.error("No Codey sessions found yet.");
    process.exit(1);
  }
  turnOn(mode, session);
  console.log(`Codey narration on (${mode}).`);
  console.log("For the full scrollable task history, run this in a new terminal:");
  console.log(`  node "${process.argv[1]}" feed`);
});
program2.command("timeline").description("Open the browser timeline for this session, reusing a running one").action(() => {
  void runTimeline();
});
program2.command("off").description("Turn narration off and restore the plain status line").action(() => {
  const session = latestSessionId();
  if (session) turnOff(session);
  console.log("Codey narration off.");
});
program2.parseAsync(process.argv);
