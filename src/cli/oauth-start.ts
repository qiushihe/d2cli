import "~src/module/register";

import minimist from "minimist";
import opener from "opener";
import * as path from "path";
import * as ProtocolRegistry from "protocol-registry";

import { base42EncodeString } from "~src/helper/string.helper";
import { AppModule } from "~src/module/app.module";
import { BungieOAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

type RunOAuthStartOptions = {
  argv: string[];
  repoRootPath: string;
};

type RunOAuthStartArgv = {
  sessionId: string;
};

class OAuthStart {
  async run(options: RunOAuthStartOptions) {
    require("dotenv").config({ path: ".env" });

    const { sessionId } = minimist<RunOAuthStartArgv>(options.argv, {
      string: ["session-id"],
      boolean: [],
      default: { sessionId: DEFAULT_SESSION_ID },
      alias: { sessionId: ["session-id", "s"] }
    });

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    const oauthRoot = config.getBungieOauthRoot();
    const clientId = config.getBungieOauthClientId();
    const state: BungieOAuthState = { t: new Date().getTime(), s: sessionId };
    const encodedState = base42EncodeString(JSON.stringify(state));

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);

    const tsNodeCmd = path.join(options.repoRootPath, "node_modules/.bin/ts-node");
    const handlerPath = path.join(options.repoRootPath, "src/cli/oauth-return-raw.ts");

    await ProtocolRegistry.register({
      protocol: "dtwoqdb",
      command: `${tsNodeCmd} ${handlerPath} ${options.repoRootPath} $_URL_`,
      override: true,
      terminal: true,
      script: true
    });
    console.log("[OAuthStart] Done protocol registration");

    opener(oauthUrl.toString());
  }
}

new OAuthStart()
  .run({
    argv: process.argv.slice(2),
    repoRootPath: path.join(__dirname, "../..")
  })
  .then();
