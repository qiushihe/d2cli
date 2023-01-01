import { CommandDefinitions } from "~src/cli/d2qdb.types";

import auth from "./auth.cmd";
import character from "./character.cmd";
import config from "./config.cmd";
import postmaster from "./postmaster.cmd";
import reminder from "./reminder.cmd";

export const commands: CommandDefinitions = { auth, character, config, postmaster, reminder };
