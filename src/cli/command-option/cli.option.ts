import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CommandOptionDefinition } from "../d2cli.types";

export type VerboseCommandOptions = {
  verbose: boolean;
};

export const verboseOption: CommandOptionDefinition = {
  flags: ["v", "verbose"],
  description: "Show additional information",
  defaultValue: false
};

export type SessionIdCommandOptions = {
  session: string;
};

export const sessionIdOption: CommandOptionDefinition = {
  flags: ["session <id>"],
  description: "Destiny 2 CLI session ID",
  defaultValue: DEFAULT_SESSION_ID
};
