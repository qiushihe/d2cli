import opener from "opener";
import path from "path";
import * as ProtocolRegistry from "protocol-registry";

import { CommandDefinition } from "~src/cli/d2qdb.types";
import { getRepoRootPath } from "~src/helper/path.helper";
import { base42EncodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

type CmdOptions = {
  session: string;
};

const cmd: CommandDefinition = {
  description: "Log into Bungie.net",
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
      .getLogger("cmd:auth:login");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    const oauthRoot = config.getBungieOauthRoot();
    const [clientIdErr, clientId] = config.getAppConfig(AppConfigName.BungieOauthClientId);
    if (clientIdErr) {
      return logger.loggedError(`Unable to get Bungie OAuth client ID: ${clientIdErr.message}`);
    }
    if (!clientId) {
      return logger.loggedError(`Missing Bungie OAuth client ID`);
    }

    const state: BungieOAuthState = { t: new Date().getTime(), s: sessionId };
    const encodedState = base42EncodeString(JSON.stringify(state));
    logger.debug("Done state encoding");

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);
    logger.debug("Done URL construction");

    const handlerPath = path.join(getRepoRootPath(), "dist/src/cli/d2qdb.js");
    logger.debug(`OAuth return handler path: ${handlerPath}`);

    await ProtocolRegistry.register({
      protocol: "dtwoqdb",
      command: `node ${handlerPath} auth oauth-return $_URL_`,
      override: true,
      terminal: true,
      script: true
    });
    logger.debug("Done protocol registration");

    const oauthUrlString = oauthUrl.toString();
    logger.info(`Bungie.net login URL: ${oauthUrlString}`);

    logger.log(`Opening a browser window to log into Bungie.net ...`);
    opener(oauthUrlString);
  }
};

export default cmd;
