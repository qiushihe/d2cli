import type { NextApiRequest, NextApiResponse } from "next";

import { base42EncodeString } from "~src/helper/string.helper";
import { ConfigService } from "~src/service/config/config.service";
import { D2QDB } from "~type/d2qdb";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const config = ConfigService.getDefaultInstance();

  if (req.method === "GET") {
    const query = req.query as D2QDB.BungieOAuthStartQuery;

    const oauthRoot = config.getBungieOauthRoot();
    const clientId = config.getBungieOauthClientId();
    const state: D2QDB.BungieOAuthState = { t: new Date().getTime(), r: query.returnUrl || "" };
    const encodedState = base42EncodeString(JSON.stringify(state));

    const oauthUrl = new URL(oauthRoot);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("state", encodedState);

    res.redirect(302, oauthUrl.toString());
  } else {
    res.status(405);
  }
};

export default handleRequest;
