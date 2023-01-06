import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { formatAlignedDateString } from "~src/helper/date.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2VendorService } from "~src/service/destiny2-vendor/destiny2-vendor.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestPlaceDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestDestinationDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestVendorDefinitions } from "~type/bungie-asset/destiny2.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { VerboseCommandOptions } from "../../command-option/verbose.option";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const VENDOR_HASH_BY_KEY: Record<string, number> = {
  xur: 2190858386,
  zavala: 69482069,
  shaxx: 3603221665,
  drifter: 248695599,
  saint: 765357505,
  saladin: 895295461,
  banshee: 672118013,
  ada: 350061650
};

const cmd: CommandDefinition = {
  description: "List vendors in Destiny 2",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:vendor:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2VendorService =
      AppModule.getDefaultInstance().resolve<Destiny2VendorService>("Destiny2VendorService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
    }

    const [vendorDefinitionsErr, vendorDefinitions] = await fnWithSpinner(
      "Retrieving vendor definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestVendorDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.VendorDefinition
        )
    );
    if (vendorDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve vendor definitions: ${vendorDefinitionsErr.message}`
      );
    }

    const [destinationDefinitionsErr, destinationDefinitions] = await fnWithSpinner(
      "Retrieving destination definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestDestinationDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.DestinationDefinition
        )
    );
    if (destinationDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve destination definitions: ${destinationDefinitionsErr.message}`
      );
    }

    const [placeDefinitionsErr, placeDefinitions] = await fnWithSpinner(
      "Retrieving place definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestPlaceDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.PlaceDefinition
        )
    );
    if (placeDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve place definitions: ${placeDefinitionsErr.message}`
      );
    }

    const [vendorsErr, vendors] = await fnWithSpinner("Retrieving vendors ...", () =>
      destiny2VendorService.getVendors(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      )
    );
    if (vendorsErr) {
      return logger.loggedError(`Unable to retrieve vendors: ${vendorsErr.message}`);
    }

    const tableData: string[][] = [];

    tableData.push([
      "Key",
      "Name",
      ...(verbose ? ["Title"] : []),
      "Location",
      ...(verbose ? ["Refresh"] : [])
    ]);

    Object.entries(VENDOR_HASH_BY_KEY).forEach(([key, vendorHash]) => {
      const vendorDefinition = vendorDefinitions[vendorHash];
      const vendor = vendors.find((_vendor) => _vendor.vendorHash === vendorHash);

      let vendorRefresh = "???";
      let vendorLocation = "???";

      if (vendor) {
        vendorRefresh = formatAlignedDateString(vendor.nextRefreshDate);

        const location = vendorDefinition.locations[vendor.vendorLocationIndex];
        if (location) {
          const destinationDefinition = destinationDefinitions[location.destinationHash];
          if (destinationDefinition) {
            const place = placeDefinitions[destinationDefinition.placeHash];
            if (place) {
              vendorLocation = `${destinationDefinition.displayProperties.name}, ${place.displayProperties.name}`;
            } else {
              vendorLocation = `${destinationDefinition.displayProperties.name}`;
            }
          }
        }
      }

      tableData.push([
        `${key}`,
        `${vendorDefinition.displayProperties.name}`,
        ...(verbose ? [`${vendorDefinition.displayProperties.subtitle}`] : []),
        `${vendorLocation}`,
        ...(verbose ? [`${vendorRefresh}`] : [])
      ]);
    });

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
