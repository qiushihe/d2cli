import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";

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

        const tableData: string[][] = [];

        tableData.push(["Active", "Membership", "Type", "ID", "Display Name"]);

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

          tableData.push(["✓", "Bungie.net", "", bungieNetMembershipId, ""]);

          const [membershipErr, membershipInfo] = await fnWithSpinner(
            "Retrieving Destiny 2 membership ...",
            () => destiny2MembershipService.getBungieNetDestiny2Membership(bungieNetMembershipId)
          );
          if (membershipErr) {
            return logger.loggedError(
              `Unable to retrieve Destiny 2 membership: ${membershipErr.message}`
            );
          }

          tableData.push([
            "✓",
            "Destiny 2",
            `${membershipInfo.membership.membershipType}`,
            membershipInfo.membership.membershipId,
            `${membershipInfo.membership.bungieGlobalDisplayName}#${membershipInfo.membership.bungieGlobalDisplayNameCode}`
          ]);

          membershipInfo.otherMemberships.forEach((otherMembership) => {
            tableData.push([
              "",
              "Destiny 2",
              `${otherMembership.membershipType}`,
              otherMembership.membershipId,
              `${otherMembership.bungieGlobalDisplayName}#${otherMembership.bungieGlobalDisplayNameCode}`
            ]);
          });

          logger.log(stringifyTable(tableData));

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
