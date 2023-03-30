import { AppModule } from "~src/module/app.module";
import { Logger } from "~src/service/log/log.types";

export type CommandOptionDefinition = {
  flags: string[];
  stringPlaceholder?: string;
  description?: string;
  defaultValue?: string | boolean;
};

export type CommandArgumentDefinition = {
  name: string;
  description?: string;
  isRequired: boolean;
};

export type CommandActionContext = {
  app: AppModule;
  logger: Logger;
};

export type CommandAction = (
  args: string[],
  opts: Record<string, string | boolean>,
  ctx: CommandActionContext
) => any;

export type CommandDefinition = {
  description?: string;
  options?: CommandOptionDefinition[];
  arguments?: CommandArgumentDefinition[];
  action?: CommandAction;
  commands?: CommandDefinitions;
};

export type CommandDefinitions = Record<string, CommandDefinition>;
