import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { formatAlignedDateString } from "~src/helper/date-string.helper";
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

const ADDITIONAL_VENDOR_HASHES = [
  2190858386 // Weekly Xur
];

const VENDOR_KEY_BY_HASH: Record<number, string> = {
  2190858386: "xur",
  350061650: "ada",
  672118013: "banshee",
  895295461: "saladin",
  765357505: "saint"
};

const EXCLUDE_REFRESH_VENDOR_HASHES = [
  3642056527 // Relic Conduit
];

const EXCLUDE_SUBTITLE_VENDOR_HASHES = [
  518338309, // Star Chart
  3411552308, // Lectern of Enchantment
  4230408743, // Monument to Lost Lights
  4287814313, // War Table
  1423393512, // Gift of the Thunder Gods
  3642056527 // Relic Conduit
];

const EXCLUDE_PLACE_DESTINATION_HASHES = [
  3929841832, // H.E.L.M.
  677774031, // The Moon
  1416096592, // The Dreaming City
  2244580325, // Savathûn's Throne World
  1729879943, // Europa
  1925528349 // Mars
];

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

    const tableHeaders: string[] = [
      "Vendor",
      "Location",
      ...(verbose ? ["ID (Key)", "Refresh"] : [])
    ];

    const tableRows: string[][] = [];

    [...ADDITIONAL_VENDOR_HASHES, ...vendors.map((vendor) => vendor.vendorHash)]
      .filter((value, index, items) => items.indexOf(value) === index)
      .map((vendorHash) => {
        const vendorDefinition = vendorDefinitions[vendorHash];
        const vendor = vendors.find((_vendor) => _vendor.vendorHash === vendorHash);

        if (vendorDefinition.groups.length <= 0) {
          return;
        }

        let vendorRefresh = "???";
        let vendorLocation = "???";

        if (vendor) {
          if (!EXCLUDE_REFRESH_VENDOR_HASHES.includes(vendorHash)) {
            vendorRefresh = formatAlignedDateString(vendor.nextRefreshDate);
          } else {
            vendorRefresh = "N/A";
          }

          const location = vendorDefinition.locations[vendor.vendorLocationIndex];
          if (location) {
            const destinationDefinition = destinationDefinitions[location.destinationHash];
            if (destinationDefinition) {
              const place = placeDefinitions[destinationDefinition.placeHash];
              if (place) {
                if (EXCLUDE_PLACE_DESTINATION_HASHES.includes(location.destinationHash)) {
                  vendorLocation = `${destinationDefinition.displayProperties.name}`;
                } else {
                  vendorLocation = `${destinationDefinition.displayProperties.name}, ${place.displayProperties.name}`;
                }
              } else {
                vendorLocation = `${destinationDefinition.displayProperties.name}`;
              }
            }
          }
        }

        tableRows.push([
          EXCLUDE_SUBTITLE_VENDOR_HASHES.includes(vendorHash)
            ? `${vendorDefinition.displayProperties.name}`
            : `${vendorDefinition.displayProperties.name}, ${vendorDefinition.displayProperties.subtitle}`,
          `${vendorLocation}`,
          ...(verbose
            ? [
                `${
                  VENDOR_KEY_BY_HASH[vendorHash]
                    ? `${vendorHash} (${VENDOR_KEY_BY_HASH[vendorHash]})`
                    : vendorHash
                }`,
                `${vendorRefresh}`
              ]
            : [])
        ]);
      });

    logger.log(
      stringifyTable([tableHeaders, ...tableRows.sort((a, b) => a[0].localeCompare(b[0]))])
    );
  }
};

export default cmd;
