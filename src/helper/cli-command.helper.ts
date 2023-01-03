import { Command } from "commander";

import { CommandDefinitions } from "~src/cli/d2cli.types";

const required = (name: string) => `<${name}>`;

const optional = (name: string) => `[${name}]`;

export const buildCommands = (program: Command, commands: CommandDefinitions) => {
  Object.entries(commands).forEach(
    ([
      cmdName,
      {
        description: cmdDescription,
        options: cmdOptions,
        arguments: cmdArguments,
        action: cmdAction,
        commands: subCommands
      }
    ]) => {
      const cmd = program.command(cmdName);

      if (cmdDescription) {
        cmd.description(cmdDescription);
      }

      (cmdOptions || []).forEach((optionDefinition) => {
        const suffix = optionDefinition.stringPlaceholder
          ? ` <${optionDefinition.stringPlaceholder}>`
          : "";

        cmd.option(
          optionDefinition.flags
            .map((flag) => (flag.length > 1 ? `--${flag}${suffix}` : `-${flag}${suffix}`))
            .join(", "),
          optionDefinition.description,
          optionDefinition.defaultValue
        );
      });

      (cmdArguments || []).forEach((argumentDefinition) => {
        // TODO: Ensure optional arguments can not be in front of required arguments.

        cmd.argument(
          (argumentDefinition.isRequired ? required : optional)(argumentDefinition.name),
          argumentDefinition.description
        );
      });

      if (cmdAction) {
        cmd.action(async (...argv: any[]) => {
          // The last argument is the command instance itself.
          // So we're doing this to remove it.
          const cmdArgv = argv.reverse().slice(1).reverse();

          let cmdArguments: string[];
          let cmdOptions: Record<string, any>;

          if (cmdArgv.length <= 1) {
            cmdArguments = [];
            cmdOptions = cmdArgv[0] || {};
          } else {
            cmdArguments = cmdArgv.slice(0, cmdArgv.length - 1) || [];
            cmdOptions = cmdArgv.slice(cmdArgv.length - 1)[0] || {};
          }

          await cmdAction(cmdArguments, cmdOptions);
        });
      }

      buildCommands(cmd, subCommands || {});
    }
  );
};
