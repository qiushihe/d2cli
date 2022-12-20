import type { NextApiRequest, NextApiResponse } from "next";

import { base42EncodeString } from "~src/helper/string.helper";
import { ConfigService } from "~src/service/config/config.service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = ConfigService.getDefaultInstance();

  const {
    query: { returnUrl },
    method,
  } = req;

  if (method === "GET") {
    const oauthRoot = config.getBungieOauthRoot();
    const clientId = config.getBungieOauthClientId();
    const state: BungieOAuthState = { t: new Date().getTime(), r: (returnUrl as string) || "" };
    const encodedState = base42EncodeString(JSON.stringify(state));

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);

    res.redirect(302, oauthUrl.toString());
  } else {
    res.status(405);
  }
}
