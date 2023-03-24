import * as Base64 from "base64-js";
import http from "http";
import { Socket } from "net";

import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { OAuthAccessToken, OAuthState } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

const parseUrl = (url: string): [Error, null] | [null, URL] => {
  try {
    return [null, new URL(url)];
  } catch (err) {
    return [err as Error, null];
  }
};

const handleOAuthReturn = async (oauthReturnUrl: string): Promise<[string[], boolean]> => {
  const urlMatch = `${oauthReturnUrl}`.trim().match(/originalOAuthReturnUrl=([^&]*)/);
  if (urlMatch) {
    const messages: string[] = [];
    messages.push("Original OAuth Return URL detected");

    const encodedOriginalOAuthReturnUrl = `${urlMatch[1]}`.trim();
    if (encodedOriginalOAuthReturnUrl.length > 0) {
      messages.push("Decoding original OAuth Return URL ...");

      const [originalOAuthReturnUrlErr, originalOAuthReturnUrl] = parseUrl(
        decodeURIComponent(encodedOriginalOAuthReturnUrl)
      );
      if (originalOAuthReturnUrlErr) {
        messages.push(`Unable to parse original OAuth Return URL: ${originalOAuthReturnUrlErr}`);
      } else {
        const authorizationCode = originalOAuthReturnUrl.searchParams.get("code") || "";
        const encodedState = originalOAuthReturnUrl.searchParams.get("state") || "";

        messages.push(`Authorization Code: ${authorizationCode}`);
        messages.push(`Encoded State: ${encodedState}`);

        const state = JSON.parse(
          new TextDecoder().decode(Base64.toByteArray(encodedState))
        ) as OAuthState;
        messages.push(`Decoded State: ${JSON.stringify(state)}`);

        const { t: timestamp, s: sessionId } = state;

        const sessionService =
          AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

        const bungieOauthService =
          AppModule.getDefaultInstance().resolve<BungieOauthService>("BungieOauthService");

        messages.push("Obtaining Bungie.net OAuth access token ...");
        const [accessTokenErr, accessToken] = await bungieOauthService.getAccessToken(
          authorizationCode,
          timestamp
        );
        if (accessTokenErr) {
          messages.push(`Error obtain Bungie.net OAuth access token: ${accessTokenErr.message}`);
        } else {
          messages.push("Reloading session ...");
          const [reloadSessionErr] = await sessionService.reload(sessionId);
          if (reloadSessionErr) {
            messages.push(`Unable to reload session: ${reloadSessionErr.message}`);
          } else {
            messages.push(`Session reloaded`);

            messages.push("Storing Bungie.net OAuth access token ...");
            const setTokenErr = await sessionService.setData<OAuthAccessToken>(
              sessionId,
              SessionDataName.BungieAccessToken,
              accessToken
            );
            if (setTokenErr) {
              messages.push(
                `Unable to store Bungie.net OAuth access token: ${setTokenErr.message}`
              );
            } else {
              messages.push(`Successfully logged into Bungie.net`);
              messages.push(`You may now close this window`);
            }
          }
        }
      }
    }
    return [messages, true];
  } else {
    return [["Invalid URL"], false];
  }
};

export const startOAuthReturnHandlerServer = async (host: string, port: number) => {
  const logger = AppModule.getDefaultInstance()
    .resolve<LogService>("LogService")
    .getLogger("cmd:auth:login:oauth-return");

  const sockets: Socket[] = [];

  const server = http.createServer(async (req, res) => {
    if (req.url?.match(/service-worker\.js$/)) {
      res.writeHead(404);
      return res.end();
    }

    const [oauthMessages, oauthSuccess] = await handleOAuthReturn(req.url || "");

    res.writeHead(200);
    res.write("<!doctype html>");
    res.write("<html lang=en>");
    res.write("<head>");
    res.write("<meta charset=utf-8>");
    res.write("<title>Bungie OAuth Return Handler</title>");
    res.write("</head>");
    res.write("<body>");
    res.write("<ul>");
    res.write(oauthMessages.map((message) => `<li>${message}</li>`).join("\n"));
    res.write("</ul>");
    res.write("</body>");
    res.end();

    if (oauthSuccess) {
      logger.info("OAuth return handled successfully; Stopping OAuth Return Handler server ...");
      server.close();
      sockets.forEach((socket) => socket.destroy());
    } else {
      logger.info(`Invalid OAuth return request: ${req.url}`);
    }
  });

  server.on("connection", (socket) => {
    sockets.push(socket);
    socket.on("close", () => {
      delete sockets[sockets.indexOf(socket)];
    });
  });

  return new Promise<void>((resolve) => server.listen(port, host, resolve));
};
