import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CommandOptionDefinition } from "../d2cli.types";

export type SessionIdCommandOptions = {
  session: string;
};

export const sessionIdOption: CommandOptionDefinition = {
  flags: ["session <id>"],
  description: "Destiny 2 CLI session ID",
  defaultValue: DEFAULT_SESSION_ID
};

export type VerboseCommandOptions = {
  verbose: boolean;
};

export const verboseOption: CommandOptionDefinition = {
  flags: ["v", "verbose"],
  description: "Show additional information for each item/component/etc. records",
  defaultValue: false
};

export type ShowAllCommandOptions = {
  showAll: boolean;
};

export const showAllOption: CommandOptionDefinition = {
  flags: ["a", "show-all"],
  description: "Show all available item/component/etc. records",
  defaultValue: false
};
