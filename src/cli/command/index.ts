import { CommandDefinitions } from "~src/cli/d2qdb.types";

import auth from "./auth.cmd";
import config from "./config.cmd";
import reminder from "./reminder.cmd";

export const commands: CommandDefinitions = { config, auth, reminder };
