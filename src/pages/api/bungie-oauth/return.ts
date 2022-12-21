import { setCookie } from "cookies-next";
import type { NextApiRequest, NextApiResponse } from "next";
import { isEmpty } from "ramda";

import { base42DecodeString, base42EncodeString } from "~src/helper/string.helper";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { D2QDB } from "~type/d2qdb";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    const query = req.query as D2QDB.BungieOAuthReturnQuery;

    const authorizationCode = decodeURIComponent(query.code as string);
    const encodedState = decodeURIComponent(query.state as string);
    const state = JSON.parse(base42DecodeString(encodedState)) as D2QDB.BungieOAuthState;
    const { t: timestamp, r: returnUrlString } = state;

    if (isEmpty(returnUrlString)) {
      const bungieOauth = BungieOauthService.getDefaultInstance();

      const [accessTokenErr, accessToken] = await bungieOauth.getAccessToken(
        authorizationCode,
        timestamp
      );
      if (accessTokenErr) {
        res.status(500).json(accessTokenErr);
      } else {
        setCookie(
          "bungie-access-token",
          JSON.stringify(accessToken), // TODO: Encrypt this.
          {
            req,
            res,
            httpOnly: true,
            expires: new Date(accessToken.refreshTokenExpiredAt || accessToken.expiredAt)
          }
        );
        res.redirect(302, "/oauth-result");
      }
    } else {
      const relayedState: D2QDB.BungieOAuthState = { t: timestamp, r: "" };
      const encodedRelayedState = base42EncodeString(JSON.stringify(relayedState));

      const returnUrl = new URL(returnUrlString);
      returnUrl.searchParams.set("code", authorizationCode);
      returnUrl.searchParams.set("state", encodedRelayedState);

      res.redirect(302, returnUrl.toString());
    }
  } else {
    res.status(405);
  }
};

export default handleRequest;
