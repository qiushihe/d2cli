import "~src/module/register";

import * as fs from "fs";
import * as path from "path";
import * as R from "ramda";

import { base42DecodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
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

    const bungieOauth =
      AppModule.getDefaultInstance().resolve<BungieOauthService>("BungieOauthService");

    const [accessTokenErr, accessToken] = await bungieOauth.getAccessToken(
      authorizationCode,
      timestamp
    );
    if (accessTokenErr) {
      console.error(`[OauthReturn] Error getting access token: ${accessTokenErr.message}`);
    } else {
      const accessTokenFilePath = path.join(__dirname, "../../.bungie-access-token.json");

      // TODO: Encrypt access token
      fs.writeFileSync(accessTokenFilePath, JSON.stringify(accessToken, null, 2), "utf8");

      console.log(`[OauthReturn] Bungie Access Token written to: ${accessTokenFilePath}`);
    }
  }
}

new OauthReturn().run().then();
