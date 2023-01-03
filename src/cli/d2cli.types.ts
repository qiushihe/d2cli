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

export type CommandAction = (args: string[], opts: Record<string, string | boolean>) => any;

export type CommandDefinition = {
  description?: string;
  options?: CommandOptionDefinition[];
  arguments?: CommandArgumentDefinition[];
  action?: CommandAction;
  commands?: CommandDefinitions;
};

export type CommandDefinitions = Record<string, CommandDefinition>;
