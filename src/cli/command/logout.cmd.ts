import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

import { CliCmdDefinition } from "../cli.types";

export const logout: CliCmdDefinition = {
  description: "Logout from Bungie.net",
  action: async (server, context) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:logout");

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const clearTokenErr = await sessionService.setData(
      context.sessionId,
      SessionDataName.BungieAccessToken,
      null
    );
    if (clearTokenErr) {
      logger.error(`Unable to clear bungie access token: ${clearTokenErr.message}`);
    } else {
      logger.info("Logged out from Bungie.net");
    }
  }
};
