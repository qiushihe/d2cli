import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const setAppConfigBungieClientSecret: CliCmdDefinition = {
  description: "Set Bungie client secret",
  action: async (server, context, arg) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:setAppConfigBungieClientSecret");

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    config.setAppConfig(AppConfigName.BungieOauthClientSecret, arg || null);
    logger.debug(`Bungie client secret set to: ${arg}`);
  }
};
