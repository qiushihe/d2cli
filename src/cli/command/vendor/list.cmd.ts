import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveVendors } from "~src/service/destiny2-component-data/vendor.resolver";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

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
  1629742958, // War Table. Again.
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

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const destiny2ComponentDataService =
      AppModule.getDefaultInstance().resolve<Destiny2ComponentDataService>(
        "Destiny2ComponentDataService"
      );

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving vendors ...");
    const [vendorsErr, vendors] = await destiny2ComponentDataService.getVendorComponentsData(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId,
      resolveVendors
    );
    if (vendorsErr) {
      return logger.loggedError(`Unable to retrieve vendors: ${vendorsErr.message}`);
    }

    const tableHeaders: string[] = [
      "Vendor",
      "Location",
      ...(verbose ? ["ID", "Key", "Refresh"] : [])
    ];

    const tableRows: string[][] = [];

    const vendorHashes = [
      ...ADDITIONAL_VENDOR_HASHES,
      ...vendors.map((vendor) => vendor.vendorHash)
    ].filter((value, index, items) => items.indexOf(value) === index);
    for (let vendorHashIndex = 0; vendorHashIndex < vendorHashes.length; vendorHashIndex++) {
      const vendorHash = vendorHashes[vendorHashIndex];

      logger.info(`Fetching vendor definition for ${vendorHash} ...`);
      const [vendorDefinitionErr, vendorDefinition] =
        await manifestDefinitionService.getVendorDefinition(vendorHash);
      if (vendorDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch vendor definition for ${vendorHash}: ${vendorDefinitionErr.message}`
        );
      }

      const vendor = vendors.find((_vendor) => _vendor.vendorHash === vendorHash);

      if (vendorDefinition.groups.length <= 0) {
        continue;
      }

      let vendorRefresh = "???";
      let vendorLocation = "???";

      if (vendor) {
        if (!EXCLUDE_REFRESH_VENDOR_HASHES.includes(vendorHash)) {
          vendorRefresh = vendor.nextRefreshDate;
        } else {
          vendorRefresh = "N/A";
        }

        const location = vendorDefinition.locations[vendor.vendorLocationIndex];
        if (location) {
          logger.info(`Fetching destination definition for ${location.destinationHash} ...`);
          const [destinationDefinitionErr, destinationDefinition] =
            await manifestDefinitionService.getDestinationDefinition(location.destinationHash);
          if (destinationDefinitionErr) {
            return logger.loggedError(
              `Unable to fetch destination definition for ${location.destinationHash}: ${destinationDefinitionErr.message}`
            );
          }

          if (destinationDefinition) {
            logger.info(`Fetching place definition for ${destinationDefinition.placeHash} ...`);
            const [placeDefinitionErr, placeDefinition] =
              await manifestDefinitionService.getPlaceDefinition(destinationDefinition.placeHash);
            if (placeDefinitionErr) {
              return logger.loggedError(
                `Unable to fetch place definition for ${destinationDefinition.placeHash}: ${placeDefinitionErr.message}`
              );
            }

            if (placeDefinition) {
              if (EXCLUDE_PLACE_DESTINATION_HASHES.includes(location.destinationHash)) {
                vendorLocation = `${destinationDefinition.displayProperties.name}`;
              } else {
                vendorLocation = `${destinationDefinition.displayProperties.name}, ${placeDefinition.displayProperties.name}`;
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
          ? [`${vendorHash}`, VENDOR_KEY_BY_HASH[vendorHash] || "", `${vendorRefresh}`]
          : [])
      ]);
    }

    logger.log(
      makeTable2([tableHeaders, ...tableRows.sort((a, b) => a[0].localeCompare(b[0]))], {
        flexibleColumns: [0, 1]
      })
    );
  }
};

export default cmd;
