import "~src/module/register";

import { Command } from "commander";

import { buildCommands } from "~src/helper/cli.helper";

import { commands } from "./command";

const program = new Command();

program
  .name("d2qdb")
  .helpOption("", "Display help for command")
  .addHelpCommand(true, "Display help for command");

buildCommands(program, commands);

program.parse();
