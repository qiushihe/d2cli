import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CommandOptionDefinition } from "../d2cli.types";

export type SessionIdCommandOptions = {
  session: string;
};

export const sessionIdOption: CommandOptionDefinition = {
  flags: ["s", "session <id>"],
  description: "Destiny 2 CLI session ID",
  defaultValue: DEFAULT_SESSION_ID
};
