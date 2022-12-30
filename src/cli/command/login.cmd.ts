import minimist from "minimist";
import opener from "opener";
import path from "path";
import * as ProtocolRegistry from "protocol-registry";

import { base42EncodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

type LoginCmdArgv = {
  noOpen: boolean;
};

export const login: CliCmdDefinition = {
  description: "Login with Bungie.net",
  action: async (server, context, arg) => {
    const { noOpen } = minimist<LoginCmdArgv>((arg || "").split(" "), {
      string: [],
      boolean: ["noOpen"],
      default: { noOpen: false },
      alias: { noOpen: ["no-open", "no"] }
    });

    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:login");

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    const oauthRoot = config.getBungieOauthRoot();
    const [clientIdErr, clientId] = config.getAppConfig(AppConfigName.BungieOauthClientId);
    if (clientIdErr) {
      return logger.loggedError(`Unable to get Bungie OAuth client ID: ${clientIdErr.message}`);
    }
    if (!clientId) {
      return logger.loggedError(`Missing Bungie OAuth client ID`);
    }

    const state: BungieOAuthState = { t: new Date().getTime(), s: context.sessionId };
    const encodedState = base42EncodeString(JSON.stringify(state));
    logger.debug("Done state encoding");

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);
    logger.debug("Done URL construction");

    const handlerPath = path.join(context.repoRootPath, "dist/src/cli/oauth-return-raw.js");
    logger.debug(`OAuth return raw handler path: ${handlerPath}`);

    await ProtocolRegistry.register({
      protocol: "dtwoqdb",
      command: `node ${handlerPath} ${context.repoRootPath} $_URL_`,
      override: true,
      terminal: true,
      script: true
    });
    logger.debug("Done protocol registration");

    const oauthUrlString = oauthUrl.toString();

    if (noOpen) {
      logger.log(`Bungie.net login URL: ${oauthUrlString}`);
    } else {
      logger.info(`Bungie.net login URL: ${oauthUrlString}`);
      opener(oauthUrlString);
    }
  }
};
