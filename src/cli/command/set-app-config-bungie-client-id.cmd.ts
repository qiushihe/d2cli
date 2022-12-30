import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const setAppConfigBungieClientId: CliCmdDefinition = {
  description: "Set Bungie client ID",
  action: async (server, context, arg) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:setAppConfigBungieClientId");

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    config.setAppConfig(AppConfigName.BungieOauthClientId, arg || null);
    logger.debug(`Bungie client ID set to: ${arg}`);
  }
};
