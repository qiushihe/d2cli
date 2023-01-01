import { CommandDefinition } from "~src/cli/d2qdb.types";
import { base42DecodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

const cmd: CommandDefinition = {
  description: "Handler of Bungie.net OAuth return callback",
  arguments: [
    {
      name: "url",
      description: "Bungie.net OAuth return URL",
      isRequired: true
    }
  ],
  action: async (args) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:oauth-return");

    const oauthReturnUrl = new URL(args[0]);
    logger.debug(`OAuth return URL: ${oauthReturnUrl}`);

    const authorizationCode = oauthReturnUrl.searchParams.get("code") || "";
    const encodedState = oauthReturnUrl.searchParams.get("state") || "";

    logger.info("Extracted authorization code and encoded state");
    logger.debug(`Authorization Code: ${authorizationCode}`);
    logger.debug(`Encoded State: ${encodedState}`);

    const state = JSON.parse(base42DecodeString(encodedState)) as BungieOAuthState;
    const { t: timestamp, s: sessionId } = state;

    const bungieOauthService =
      AppModule.getDefaultInstance().resolve<BungieOauthService>("BungieOauthService");

    const [accessTokenErr, accessToken] = await bungieOauthService.getAccessToken(
      authorizationCode,
      timestamp
    );
    if (accessTokenErr) {
      return logger.loggedError(`Error getting access token: ${accessTokenErr.message}`);
    }

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const [reloadSessionErr] = await sessionService.reload(sessionId);
    if (reloadSessionErr) {
      return logger.loggedError(`Unable to reload session: ${reloadSessionErr.message}`);
    }

    logger.info(`Session reloaded`);

    const setTokenErr = await sessionService.setData<BungieOAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken,
      accessToken
    );
    if (setTokenErr) {
      return logger.loggedError(`Unable to store access token: ${setTokenErr.message}`);
    }

    logger.log(`Successfully logged into Bungie.net`);
    logger.log(`You may now close this window`);
  }
};

export default cmd;
