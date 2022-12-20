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
    const state = { t: new Date().getTime(), r: returnUrl || "" };
    const encodedState = base42EncodeString(JSON.stringify(state));

    res.redirect(
      302,
      `${oauthRoot}?client_id=${clientId}&response_type=code&state=${encodeURIComponent(
        encodedState
      )}`
    );
  } else {
    res.status(405);
  }
}
