import "~src/module/register";

import opener from "opener";
import * as path from "path";
import * as ProtocolRegistry from "protocol-registry";

import { base42EncodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

class OAuthStart {
  async run() {
    require("dotenv").config({ path: ".env" });

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    const oauthRoot = config.getBungieOauthRoot();
    const clientId = config.getBungieOauthClientId();
    const state: BungieOAuthState = { t: new Date().getTime(), s: DEFAULT_SESSION_ID };
    const encodedState = base42EncodeString(JSON.stringify(state));

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);

    const workingDir = `${path.join(__dirname, "../..")}`;
    const tsNodeCmd = `${path.join(__dirname, "../../node_modules/.bin/ts-node")}`;
    const handlerPath = path.join(__dirname, "./oauth-return-raw.ts");

    await ProtocolRegistry.register({
      protocol: "dtwoqdb",
      command: `${tsNodeCmd} ${handlerPath} ${workingDir} $_URL_`,
      override: true,
      terminal: true,
      script: true
    });
    console.log("[OAuthStart] Done protocol registration");

    opener(oauthUrl.toString());
  }
}

new OAuthStart().run().then();
