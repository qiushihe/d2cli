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

export type CommandDefinition = {
  description?: string;
  options?: CommandOptionDefinition[];
  arguments?: CommandArgumentDefinition[];
  action?: (args: string[], opts: Record<string, string | boolean>) => any;
  commands?: CommandDefinitions;
};

export type CommandDefinitions = Record<string, CommandDefinition>;
