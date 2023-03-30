import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { BungieMembershipService } from "~src/service/bungie-membership/bungie-membership.service";
import { SessionService } from "~src/service/session/session.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "Display authentication status with Bungie.net",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = app.resolve<SessionService>("SessionService");

    const bungieMembershipService = app.resolve<BungieMembershipService>("BungieMembershipService");

    logger.info("Retrieving authorization status ...");
    const [loginStatusErr, loginStatus] = await sessionService.getLoginStatus(sessionId);
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

        const tableData: string[][] = [];

        tableData.push(["Active", "Type", "Membership", "Display Name"]);

        if (verbose) {
          logger.info("Retrieving Bungie.net membership ID ...");
          const [bungieNetMembershipIdErr, bungieNetMembershipId] =
            await sessionService.getBungieNetMembershipId(sessionId);
          if (bungieNetMembershipIdErr) {
            return logger.loggedError(
              `Unable to retrieve Bungie.net membership ID: ${bungieNetMembershipIdErr.message}`
            );
          }

          tableData.push(["✓", "Bungie.net", bungieNetMembershipId, ""]);

          logger.info("Retrieving Destiny 2 membership ...");
          const [membershipErr, membershipInfo] =
            await bungieMembershipService.getDestiny2Membership(bungieNetMembershipId);
          if (membershipErr) {
            return logger.loggedError(
              `Unable to retrieve Destiny 2 membership: ${membershipErr.message}`
            );
          }

          tableData.push([
            "✓",
            "Destiny 2",
            `${membershipInfo.membership.membershipType}:${membershipInfo.membership.membershipId}`,
            `${membershipInfo.membership.bungieGlobalDisplayName}#${membershipInfo.membership.bungieGlobalDisplayNameCode}`
          ]);

          membershipInfo.otherMemberships.forEach((otherMembership) => {
            tableData.push([
              "",
              "Destiny 2",
              `${otherMembership.membershipType}:${otherMembership.membershipId}`,
              `${otherMembership.bungieGlobalDisplayName}#${otherMembership.bungieGlobalDisplayNameCode}`
            ]);
          });

          logger.log(makeTable2(tableData));

          if (membershipInfo.otherMemberships.length > 0) {
            logger.warn(
              `Also found ${membershipInfo.otherMemberships.length} other Destiny 2 membership(s)`
            );
          }
        }
      }
    } else {
      logger.log("Not logged in");
    }
  }
};

export default cmd;
