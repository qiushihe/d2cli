import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";

import { CliCmdDefinition } from "../cli.types";

export const getLoginStatus: CliCmdDefinition = {
  description: "Get login status of current session",
  action: async (server, context) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:getLoginStatus");

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const [loginStatusErr, loginStatus] = await sessionService.getLoginStatus(context.sessionId);
    if (loginStatusErr) {
      logger.error(`Unable to get login status: ${loginStatusErr.message}`);
    } else {
      if (loginStatus.isLoggedIn) {
        if (loginStatus.isLoginExpired) {
          logger.log("Login expired");
        } else {
          logger.log("Currently logged in");
        }
      } else {
        logger.log("Not logged in");
      }
    }
  }
};
