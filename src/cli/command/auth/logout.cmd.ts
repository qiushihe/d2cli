import { CommandDefinition } from "~src/cli/d2qdb.types";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

type CmdOptions = {
  session: string;
};

const cmd: CommandDefinition = {
  description: "Log out from Bungie.net",
  options: [
    {
      flags: ["s", "session <id>"],
      description: "D2QDB session ID",
      defaultValue: DEFAULT_SESSION_ID
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:logout");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const clearTokenErr = await sessionService.setData(
      sessionId,
      SessionDataName.BungieAccessToken,
      null
    );
    if (clearTokenErr) {
      logger.error(`Unable to logout: ${clearTokenErr.message}`);
    } else {
      logger.log("Logged out from Bungie.net");
    }
  }
};

export default cmd;
