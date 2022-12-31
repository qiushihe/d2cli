import { CommandDefinition } from "~src/cli/d2qdb.types";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";

import { SessionCommandOptions } from "../command.types";
import { sessionIdOption } from "../session-id.option";

type CmdOptions = SessionCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Display authentication status with Bungie.net",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:status");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const [loginStatusErr, loginStatus] = await sessionService.getLoginStatus(sessionId);
    if (loginStatusErr) {
      logger.error(`Unable to get login status: ${loginStatusErr.message}`);
    } else {
      if (loginStatus.isLoggedIn) {
        if (loginStatus.isLoginExpired) {
          logger.log(`Authorization expired`);
        } else {
          logger.log("Currently logged in");
        }
      } else {
        logger.log("Not logged in");
      }
    }
  }
};

export default cmd;
