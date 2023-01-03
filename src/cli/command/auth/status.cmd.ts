import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { VerboseCommandOptions } from "../../command-option/verbose.option";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "Display authentication status with Bungie.net",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:status");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
    const destiny2MembershipService =
      AppModule.getDefaultInstance().resolve<Destiny2MembershipService>(
        "Destiny2MembershipService"
      );

    const [loginStatusErr, loginStatus] = await fnWithSpinner(
      "Retrieving authorization status ...",
      () => sessionService.getLoginStatus(sessionId)
    );
    if (loginStatusErr) {
      return logger.loggedError(
        `Unable to retrieve authorization status: ${loginStatusErr.message}`
      );
    }

    if (loginStatus.isLoggedIn) {
      if (loginStatus.isLoginExpired) {
        logger.log("Authorization expired");
      } else {
        logger.log("Currently logged in");

        if (verbose) {
          const [bungieNetMembershipIdErr, bungieNetMembershipId] = await fnWithSpinner(
            "Retrieving Bungie.net membership ID ...",
            () => sessionService.getBungieNetMembershipId(sessionId)
          );
          if (bungieNetMembershipIdErr) {
            return logger.loggedError(
              `Unable to retrieve Bungie.net membership ID: ${bungieNetMembershipIdErr.message}`
            );
          }

          logger.log(`Bungie.net membership ID: ${bungieNetMembershipId}`);

          const [membershipErr, membership] = await fnWithSpinner(
            "Retrieving Destiny 2 membership ...",
            () => destiny2MembershipService.getBungieNetDestiny2Membership(bungieNetMembershipId)
          );
          if (membershipErr) {
            return logger.loggedError(
              `Unable to retrieve Destiny 2 membership: ${membershipErr.message}`
            );
          }

          logger.log(
            `Destiny 2 membership ID: ${membership.membershipId} (Type: ${membership.membershipType})`
          );
        }
      }
    } else {
      logger.log("Not logged in");
    }
  }
};

export default cmd;
