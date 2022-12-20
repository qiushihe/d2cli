import type { NextApiRequest, NextApiResponse } from "next";
import { isEmpty } from "ramda";

import { base42DecodeString, base42EncodeString } from "~src/helper/string.helper";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { code: queryCode, state: queryState },
    method,
  } = req;

  const authorizationCode = decodeURIComponent(queryCode as string);
  const encodedState = decodeURIComponent(queryState as string);
  const state = JSON.parse(base42DecodeString(encodedState)) as BungieOAuthState;
  const { t: timestamp, r: returnUrlString } = state;

  if (isEmpty(returnUrlString)) {
    console.log("!!! OAuth Result", method, authorizationCode, encodedState, state);
    res.redirect(302, "/oauth-result");
  } else {
    const relayedState: BungieOAuthState = { t: timestamp, r: "" };
    const encodedRelayedState = base42EncodeString(JSON.stringify(relayedState));

    const returnUrl = new URL(returnUrlString);
    returnUrl.searchParams.set("code", authorizationCode);
    returnUrl.searchParams.set("state", encodedRelayedState);

    res.redirect(302, returnUrl.toString());
  }
}
