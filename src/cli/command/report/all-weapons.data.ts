import { InventoryBucket, InventoryBucketHashes } from "~src/enum/inventory.enum";
import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { cachedGetter } from "~src/helper/cache.helper";
import { minutesInMilliseconds } from "~src/helper/time.helper";
import { CacheService } from "~src/service/cache/cache.service";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { DamageType, ItemSubType, TierType } from "~type/bungie-api/destiny.types";
import {
  DestinyDamageTypeDefinition,
  DestinyInventoryItemDefinition
} from "~type/bungie-api/destiny/definitions.types";
import {
  DestinyItemComponent,
  DestinyItemInstanceComponent
} from "~type/bungie-api/destiny/entities/items.types";

export type ReportItem = {
  itemHash: number;
  itemInstanceId: string;
  tags: string[];
};

const reportItemsWeaponSlotGrouper =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    const entries = Object.entries(itemDefinitionsByHash);

    for (const [key, itemDefinition] of entries) {
      const identifiers = key.split(":", 2);
      const itemHash = parseInt(identifiers[0], 10);
      const itemInstanceId = identifiers[1];

      if (itemDefinition && itemDefinition.inventory) {
        if (
          itemDefinition.inventory.bucketTypeHash ===
          InventoryBucketHashes[InventoryBucket.KineticWeapon]
        ) {
          reportItems.push({
            itemHash: itemHash,
            itemInstanceId: itemInstanceId,
            tags: ["Slot:Kinetic"]
          });
        } else if (
          itemDefinition.inventory.bucketTypeHash ===
          InventoryBucketHashes[InventoryBucket.EnergyWeapon]
        ) {
          reportItems.push({
            itemHash: itemHash,
            itemInstanceId: itemInstanceId,
            tags: ["Slot:Energy"]
          });
        } else if (
          itemDefinition.inventory.bucketTypeHash ===
          InventoryBucketHashes[InventoryBucket.PowerWeapon]
        ) {
          reportItems.push({
            itemHash: itemHash,
            itemInstanceId: itemInstanceId,
            tags: ["Slot:Power"]
          });
        }
      }
    }
  };

const reportItemsWeaponDamageTypeTagger =
  (reportItems: ReportItem[]) =>
  (damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition>) => {
    for (const reportItem of reportItems) {
      const damageTypeDefinition = damageTypeDefinitions[reportItem.itemHash];
      if (damageTypeDefinition.enumValue === DamageType.Kinetic) {
        reportItem.tags.push("Damage:Kinetic");
      } else if (damageTypeDefinition.enumValue === DamageType.Arc) {
        reportItem.tags.push("Damage:Arc");
      } else if (damageTypeDefinition.enumValue === DamageType.Thermal) {
        reportItem.tags.push("Damage:Solar");
      } else if (damageTypeDefinition.enumValue === DamageType.Void) {
        reportItem.tags.push("Damage:Void");
      } else if (damageTypeDefinition.enumValue === DamageType.Stasis) {
        reportItem.tags.push("Damage:Stasis");
      } else if (damageTypeDefinition.enumValue === DamageType.Strand) {
        reportItem.tags.push("Damage:Strand");
      }
    }
  };

const reportItemsWeaponTypeTagger =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    for (const reportItem of reportItems) {
      const itemDefinition =
        itemDefinitionsByHash[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (itemDefinition.itemSubType === ItemSubType.AutoRifle) {
        reportItem.tags.push("Type:Auto Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Shotgun) {
        reportItem.tags.push("Type:Shotgun");
      } else if (itemDefinition.itemSubType === ItemSubType.Machinegun) {
        reportItem.tags.push("Type:Machine Gun");
      } else if (itemDefinition.itemSubType === ItemSubType.HandCannon) {
        reportItem.tags.push("Type:Hand Cannon");
      } else if (itemDefinition.itemSubType === ItemSubType.RocketLauncher) {
        reportItem.tags.push("Type:Rocket Launcher");
      } else if (itemDefinition.itemSubType === ItemSubType.FusionRifle) {
        reportItem.tags.push("Type:Fusion Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.SniperRifle) {
        reportItem.tags.push("Type:Sniper Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.PulseRifle) {
        reportItem.tags.push("Type:Pulse Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.ScoutRifle) {
        reportItem.tags.push("Type:Scout Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Sidearm) {
        reportItem.tags.push("Type:Sidearm");
      } else if (itemDefinition.itemSubType === ItemSubType.Sword) {
        reportItem.tags.push("Type:Sword");
      } else if (itemDefinition.itemSubType === ItemSubType.FusionRifleLine) {
        reportItem.tags.push("Type:Linear Fusion Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.GrenadeLauncher) {
        reportItem.tags.push("Type:Grenade Launcher");
      } else if (itemDefinition.itemSubType === ItemSubType.SubmachineGun) {
        reportItem.tags.push("Type:Submachine Gun");
      } else if (itemDefinition.itemSubType === ItemSubType.TraceRifle) {
        reportItem.tags.push("Type:Trace Rifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Bow) {
        reportItem.tags.push("Type:Bow");
      } else if (itemDefinition.itemSubType === ItemSubType.Glaive) {
        reportItem.tags.push("Type:Glaive");
      }
    }
  };

const reportItemsWeaponFrameTagger =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    for (const reportItem of reportItems) {
      const itemDefinition =
        itemDefinitionsByHash[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
        ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
      );
      if (intrinsicTraitSocket) {
        const intrinsicTraitSocketItemDefinition =
          itemDefinitionsByHash[`${intrinsicTraitSocket.singleInitialItemHash}:`];

        const intrinsicTraitName =
          intrinsicTraitSocketItemDefinition?.displayProperties?.name || "";

        const frameName = intrinsicTraitName.replace(/\sFrame$/, "").replace(/\sGlaive$/, "");

        reportItem.tags.push(`Frame:${frameName}`);
      }
    }
  };

const reportItemsWeaponTierTagger =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    for (const reportItem of reportItems) {
      const itemDefinition =
        itemDefinitionsByHash[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (itemDefinition.inventory.tierType === TierType.Exotic) {
        reportItem.tags.push("Tier:Exotic");
      } else {
        reportItem.tags.push("Tier:Non Exotic");
      }
    }
  };

type ReportData = {
  reportItems: ReportItem[];
  allItemInstances: Record<string, DestinyItemInstanceComponent>;
  allItemDefinitions: Record<string, DestinyInventoryItemDefinition>;
};

const CACHE_NS = "report:all-weapons";

export const getDataSource = (
  logger: Logger,
  manifestDefinitionService: ManifestDefinitionService,
  cacheService: CacheService,
  characterService: CharacterService,
  characterDescriptionService: CharacterDescriptionService,
  inventoryService: InventoryService
) => {
  const getReportData = async (sessionId: string): Promise<[Error, null] | [null, ReportData]> => {
    const cachedGet = cachedGetter(cacheService);

    logger.info("Retrieving characters ...");
    const [charactersErr, characters] = await cachedGet(
      () => characterService.getCharacters(sessionId),
      CACHE_NS,
      "characters",
      minutesInMilliseconds(5)
    );
    if (charactersErr) {
      return [logger.loggedError(`Unable to get characters: ${charactersErr.message}`), null];
    }
    if (characters.length <= 0) {
      return [logger.loggedError("Missing characters"), null];
    }

    logger.info("Retrieving character descriptions ...");
    const characterDescriptionById: Record<string, string> = {};
    for (const character of characters) {
      const [characterDescriptionErr, characterDescription] = await cachedGet(
        () => characterDescriptionService.getDescription(character),
        CACHE_NS,
        "character-descriptions",
        minutesInMilliseconds(5)
      );
      if (characterDescriptionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve character description: ${characterDescriptionErr.message}`
          ),
          null
        ];
      }
      characterDescriptionById[character.characterId] = characterDescription.asString;
    }

    const allItems: DestinyItemComponent[] = [];
    let allItemInstances: Record<string, DestinyItemInstanceComponent> = {};
    const allItemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const allItemDamageTypeDefinitions: Record<string, DestinyDamageTypeDefinition> = {};

    const reportItems: ReportItem[] = [];
    const groupReportItemsByWeaponSlot = reportItemsWeaponSlotGrouper(reportItems);
    const tagReportItemsWeaponDamageType = reportItemsWeaponDamageTypeTagger(reportItems);
    const tagReportItemsWeaponType = reportItemsWeaponTypeTagger(reportItems);
    const tagReportItemsWeaponFrame = reportItemsWeaponFrameTagger(reportItems);
    const tagReportItemsWeaponTier = reportItemsWeaponTierTagger(reportItems);

    for (const character of characters) {
      const characterDescription = characterDescriptionById[character.characterId];

      logger.info(`Retrieving equipment items for ${characterDescription} ...`);
      const [equipmentItemsErr, equipmentItems] = await cachedGet(
        () =>
          inventoryService.getEquipmentItems(
            sessionId,
            character.membershipType,
            character.membershipId,
            character.characterId
          ),
        CACHE_NS,
        `equipment-items-${character.membershipType}-${character.membershipId}-${character.characterId}`,
        minutesInMilliseconds(1)
      );
      if (equipmentItemsErr) {
        return [
          logger.loggedError(
            `Unable to retrieve equipment items for ${characterDescription}: ${equipmentItemsErr.message}`
          ),
          null
        ];
      }
      allItems.push(...equipmentItems.components);
      allItemInstances = { ...allItemInstances, ...equipmentItems.instances };

      logger.info(`Retrieving inventory items for ${characterDescription} ...`);
      const [inventoryItemsErr, inventoryItems] = await cachedGet(
        () =>
          inventoryService.getInventoryItems(
            sessionId,
            character.membershipType,
            character.membershipId,
            character.characterId
          ),
        CACHE_NS,
        `inventory-items-${character.membershipType}-${character.membershipId}-${character.characterId}`,
        minutesInMilliseconds(1)
      );
      if (inventoryItemsErr) {
        return [
          logger.loggedError(
            `Unable to retrieve inventory items for ${characterDescription}: ${inventoryItemsErr.message}`
          ),
          null
        ];
      }
      allItems.push(...inventoryItems.components);
      allItemInstances = { ...allItemInstances, ...inventoryItems.instances };
    }

    logger.info("Retrieving vault items ...");
    const [vaultItemsErr, vaultItems] = await cachedGet(
      () =>
        inventoryService.getVaultItems(
          sessionId,
          characters[0].membershipType,
          characters[0].membershipId
        ),
      CACHE_NS,
      `vault-items-${characters[0].membershipType}-${characters[0].membershipId}`,
      minutesInMilliseconds(1)
    );
    if (vaultItemsErr) {
      return [logger.loggedError(`Unable to retrieve vault items: ${vaultItemsErr.message}`), null];
    }
    allItems.push(...vaultItems.components);
    allItemInstances = { ...allItemInstances, ...vaultItems.instances };

    logger.info("Retrieving item definitions ...");
    for (const item of allItems) {
      const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
        item.itemHash
      );
      if (itemDefinitionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve item definition for ${item.itemHash}: ${itemDefinitionErr.message}`
          ),
          null
        ];
      }
      allItemDefinitions[`${item.itemHash}:${item.itemInstanceId}`] = itemDefinition;
    }
    groupReportItemsByWeaponSlot(allItemDefinitions);
    tagReportItemsWeaponType(allItemDefinitions);
    tagReportItemsWeaponTier(allItemDefinitions);

    logger.info("Retrieving item damage type definitions ...");
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (!itemDefinition.damageTypeHashes || itemDefinition.damageTypeHashes.length <= 0) {
        return [
          logger.loggedError(`Item missing damage type hashes: ${reportItem.itemHash}`),
          null
        ];
      }

      if (itemDefinition.damageTypeHashes.length > 1) {
        return [
          logger.loggedError(`Item has more than 1 damage type hash: ${reportItem.itemHash}`),
          null
        ];
      }

      // Although the data structure for damage type is an array (for some reason), it only ever
      // has 1 value. So we're just taking the 1st value out of the array.
      const [damageTypeDefinitionErr, damageTypeDefinition] =
        await manifestDefinitionService.getDamageTypeDefinition(itemDefinition.damageTypeHashes[0]);
      if (damageTypeDefinitionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve item damage type definition for ${reportItem.itemHash}: ${damageTypeDefinitionErr.message}`
          ),
          null
        ];
      }
      allItemDamageTypeDefinitions[reportItem.itemHash] = damageTypeDefinition;
    }
    tagReportItemsWeaponDamageType(allItemDamageTypeDefinitions);

    logger.info("Retrieving item intrinsic trait socket item definitions ...");
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
        ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
      );
      if (!intrinsicTraitSocket) {
        return [
          logger.loggedError(`Missing intrinsic trait socket for item: ${reportItem.itemHash}`),
          null
        ];
      }

      const [socketItemDefinitionErr, socketItemDefinition] =
        await manifestDefinitionService.getItemDefinition(
          intrinsicTraitSocket.singleInitialItemHash
        );
      if (socketItemDefinitionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve item intrinsic trait socket for item definition for ${reportItem.itemHash}: ${socketItemDefinitionErr.message}`
          ),
          null
        ];
      }
      allItemDefinitions[`${socketItemDefinition.hash}:`] = socketItemDefinition;
    }
    tagReportItemsWeaponFrame(allItemDefinitions);

    return [null, { reportItems, allItemInstances, allItemDefinitions }];
  };

  return { getReportData };
};

export const sortTableByColumns = (
  rows: string[][],
  sortTransformers: Record<number, (val: string) => string>
) => {
  const newRows = [...rows];

  newRows.sort((rowA, rowB) => {
    for (let columnIndex = 0; columnIndex < rowA.length; columnIndex++) {
      const valueA = rowA[columnIndex];
      const valueB = rowB[columnIndex];

      let transform = sortTransformers[columnIndex];
      if (!transform) {
        transform = (val) => val;
      }

      const comparison = transform(valueA).localeCompare(transform(valueB));
      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });

  return newRows;
};

export const transformTierColumn = (val: string) => {
  if (val === "Non Exotic") {
    return `0:${val}`;
  } else if (val === "Exotic") {
    return `1:${val}`;
  } else {
    return val;
  }
};

export const transformSlotColumn = (val: string) => {
  if (val === "Kinetic") {
    return `0:${val}`;
  } else if (val === "Energy") {
    return `1:${val}`;
  } else if (val === "Power") {
    return `2:${val}`;
  } else {
    return val;
  }
};

export const transformFrameColumn = (val: string) => {
  if (val === "Precision") {
    return "Precision Frame:0";
  } else if (val === "Häkke Precision") {
    return "Precision Frame:1";
  } else {
    return val;
  }
};
