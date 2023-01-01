import { CommandDefinition } from "~src/cli/d2qdb.types";
import { AppModule } from "~src/module/app.module";
import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionCommandOptions } from "../command.types";

type CmdOptions = SessionCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Log out from Bungie.net",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:logout");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const clearTokenErr = await sessionService.setData<BungieOAuthAccessToken | null>(
      sessionId,
      SessionDataName.BungieAccessToken,
      null
    );
    if (clearTokenErr) {
      return logger.loggedError(`Unable to logout: ${clearTokenErr.message}`);
    }

    logger.log("Logged out from Bungie.net");
  }
};

export default cmd;
