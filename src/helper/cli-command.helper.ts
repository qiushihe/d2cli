import { Command } from "commander";

import { CommandDefinitions } from "~src/cli/d2cli.types";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

const required = (name: string) => `<${name}>`;

const optional = (name: string) => `[${name}]`;

const buildNestedCommands = (
  program: Command,
  commands: CommandDefinitions,
  parentName: string
) => {
  Object.entries(commands).forEach(
    ([
      name,
      {
        description: cmdDescription,
        options: cmdOptions,
        arguments: cmdArguments,
        action: cmdAction,
        commands: subCommands
      }
    ]) => {
      const cmd = program.command(name);
      const cmdName = `${parentName}:${name}`;

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

          const appModule = AppModule.getDefaultInstance();

          const cmdLogger = appModule.resolve<LogService>("LogService").getLogger(cmdName);

          await cmdAction(cmdArguments, cmdOptions, { app: appModule, logger: cmdLogger });
        });
      }

      buildNestedCommands(cmd, subCommands || {}, cmdName);
    }
  );
};

export const buildCommands = (program: Command, commands: CommandDefinitions, name: string) => {
  buildNestedCommands(program, commands, name);
};
