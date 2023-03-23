import * as Base64 from "base64-js";
import opener from "opener";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { AppModule } from "~src/module/app.module";
import { OAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { startOAuthReturnHandlerServer } from "./oauth-return.handler";

type CmdOptions = SessionIdCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Log into Bungie.net",
  options: [sessionIdOption],
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

    const state: OAuthState = { t: new Date().getTime(), s: sessionId };
    const encodedState = Base64.fromByteArray(new TextEncoder().encode(JSON.stringify(state)));
    logger.debug("Done state encoding");

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);
    logger.debug("Done URL construction");

    await fnWithSpinner("Starting OAuth return handler server ...", () =>
      startOAuthReturnHandlerServer("0.0.0.0", 2371)
    );
    logger.debug("Started OAuth return handler server");

    const oauthUrlString = oauthUrl.toString();
    logger.info(`Bungie.net login URL: ${oauthUrlString}`);

    logger.log(`Opening a browser window to log into Bungie.net ...`);
    opener(oauthUrlString);
  }
};

export default cmd;
