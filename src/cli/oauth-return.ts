import "~src/module/register";

import * as R from "ramda";

import { base42DecodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { SessionService } from "~src/service/session/session.service";
import { D2QDB } from "~type/d2qdb";

class OauthReturn {
  async run() {
    require("dotenv").config({ path: ".env" });

    const oauthReturnUrl = new URL(process.argv[2]);

    const [authorizationCode, encodedState] = R.pipe(
      R.split("/"),
      R.filter(R.complement(R.isEmpty)),
      R.remove(0, 2)
    )(`${oauthReturnUrl.host}${oauthReturnUrl.pathname}`);

    console.log(`[OauthReturn] Authorization Code: ${authorizationCode}`);
    console.log(`[OauthReturn] Encoded State: ${encodedState}`);

    const state = JSON.parse(base42DecodeString(encodedState)) as D2QDB.BungieOAuthState;
    const { t: timestamp } = state;

    const bungieOauthService =
      AppModule.getDefaultInstance().resolve<BungieOauthService>("BungieOauthService");

    const [accessTokenErr, accessToken] = await bungieOauthService.getAccessToken(
      authorizationCode,
      timestamp
    );
    if (accessTokenErr) {
      console.error(`[OauthReturn] Error getting access token: ${accessTokenErr.message}`);
    } else {
      const sessionService =
        AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

      const [reloadSessionErr] = await sessionService.reload();
      if (reloadSessionErr) {
        console.error(`[OauthReturn] Unable to reload session: ${reloadSessionErr.message}`);
      } else {
        console.log(`[OauthReturn] Session reloaded`);

        const setTokenErr = await sessionService.setBungieAccessToken(accessToken);
        if (setTokenErr) {
          console.error(`[OauthReturn] Unable to store access token: ${setTokenErr.message}`);
        } else {
          console.log(`[OauthReturn] Access token stored`);
        }
      }
    }
  }
}

new OauthReturn().run().then();
