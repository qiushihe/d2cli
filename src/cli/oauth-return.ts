import "~src/module/register";

import * as R from "ramda";

import { base42DecodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

class OauthReturn {
  async run() {
    const oauthReturnUrl = new URL(process.argv[2]);

    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cli:OauthReturn");

    const [authorizationCode, encodedState] = R.pipe(
      R.split("/"),
      R.filter(R.complement(R.isEmpty)),
      R.remove(0, 2)
    )(`${oauthReturnUrl.host}${oauthReturnUrl.pathname}`);

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
      logger.error(`Error getting access token: ${accessTokenErr.message}`);
    } else {
      const sessionService =
        AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

      const [reloadSessionErr] = await sessionService.reload(sessionId);
      if (reloadSessionErr) {
        logger.error(`Unable to reload session: ${reloadSessionErr.message}`);
      } else {
        logger.info(`Session reloaded`);

        const setTokenErr = await sessionService.setData(
          sessionId,
          SessionDataName.BungieAccessToken,
          accessToken
        );
        if (setTokenErr) {
          logger.error(`Unable to store access token: ${setTokenErr.message}`);
        } else {
          logger.info(`Access token stored`);
        }
      }
    }
  }
}

new OauthReturn().run().then();
