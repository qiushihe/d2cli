import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CommandOptionDefinition } from "../d2qdb.types";

export const sessionIdOption: CommandOptionDefinition = {
  flags: ["s", "session <id>"],
  description: "D2QDB session ID",
  defaultValue: DEFAULT_SESSION_ID
};
