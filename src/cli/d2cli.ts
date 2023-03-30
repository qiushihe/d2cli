import "~src/module/register";

import { Command } from "commander";

import { buildCommands } from "~src/helper/cli-command.helper";

import { commands } from "./command";

const programName = "d2cli";
const program = new Command();

program.name(programName);

// By default, the help string for `commander.js` is spelled with a lower-cased "d" for "Display",
// as the first work in a sentence. So these calls just correct those spellings.
program.helpOption("", "Display help for command");
program.addHelpCommand(true, "Display help for command");

buildCommands(program, commands, programName);

program.parse();
