import { NextRequest, NextResponse } from "next/server";

import { ConfigService } from "~src/service/config/config.service";

const AUTH_CREDENTIALS = ConfigService.getDefaultInstance()
  .getHttpBasicAuthCredentials()
  .split(",")
  .map((credential) => credential.split(":"))
  .reduce(
    (acc, credential) => ({ ...acc, [credential[0]]: credential[1] }),
    {} as Record<string, string>
  );

export const middleware = async (req: NextRequest) => {
  const authHeader = req.headers.get("Authorization");

  if (authHeader) {
    const headerValues = authHeader.split(" ")[1];
    const [username, password] = atob(headerValues).split(":");

    if (AUTH_CREDENTIALS[username] && password === AUTH_CREDENTIALS[username]) {
      return NextResponse.next();
    }
  }

  return new NextResponse(undefined, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic Realm="Secure Area"'
    }
  });
};
