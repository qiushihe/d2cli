import { AppModule } from "~src/module/app.module";
import { SessionService } from "~src/service/session/session.service";

import { CliCmdDefinition } from "../cli.types";

export const logout: CliCmdDefinition = {
  description: "Logout from Bungie.net",
  action: async (server, context) => {
    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const clearTokenErr = await sessionService.setBungieAccessToken(context.sessionId, null);
    if (clearTokenErr) {
      console.error(`Unable to clear bungie access token: ${clearTokenErr.message}`);
    } else {
      console.log("Logged out from Bungie.net");
    }
  }
};
