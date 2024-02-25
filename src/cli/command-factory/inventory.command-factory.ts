import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { InventoryBucket, InventoryBucketHashes } from "~src/enum/inventory.enum";
import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { cachedGetter } from "~src/helper/cache.helper";
import { makeTable2 } from "~src/helper/table.helper";
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

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

type InventoryCommandOptions = {
  description: string;
  includeSlots?: string[] | null;
};

export type InventoryItem = {
  itemHash: number;
  itemInstanceId: string;
  tags: string[];
};

const BUCKET_KINETIC = InventoryBucketHashes[InventoryBucket.KineticWeapon];
const BUCKET_ENERGY = InventoryBucketHashes[InventoryBucket.EnergyWeapon];
const BUCKET_POWER = InventoryBucketHashes[InventoryBucket.PowerWeapon];
const BUCKET_GHOST = InventoryBucketHashes[InventoryBucket.Ghost];
const BUCKET_ARTIFACT = InventoryBucketHashes[InventoryBucket.SeasonalArtifact];

const BUCKET_HELMET = InventoryBucketHashes[InventoryBucket.Helmet];
const BUCKET_GAUNTLET = InventoryBucketHashes[InventoryBucket.Gauntlet];
const BUCKET_CHEST = InventoryBucketHashes[InventoryBucket.ChestArmour];
const BUCKET_LEG = InventoryBucketHashes[InventoryBucket.LegArmour];
const BUCKET_CLASS = InventoryBucketHashes[InventoryBucket.ClassItem];
const BUCKET_BANNER = InventoryBucketHashes[InventoryBucket.ClanBanner];

const BUCKET_EMBLEM = InventoryBucketHashes[InventoryBucket.Emblem];
const BUCKET_VEHICLE = InventoryBucketHashes[InventoryBucket.Vehicle];
const BUCKET_SHIP = InventoryBucketHashes[InventoryBucket.Ship];

const BUCKET_FINISHER = InventoryBucketHashes[InventoryBucket.Finisher];
const BUCKET_EMOTE = InventoryBucketHashes[InventoryBucket.Emote];
const BUCKET_EMOTES = InventoryBucketHashes[InventoryBucket.CommonEmotes];

const BUCKET_SUBCLASS = InventoryBucketHashes[InventoryBucket.Subclass];
const BUCKET_QUEST = InventoryBucketHashes[InventoryBucket.Quest];
const BUCKET_CONSUMABLE = InventoryBucketHashes[InventoryBucket.Consumable];

const BUCKET_MOD = InventoryBucketHashes[InventoryBucket.Modification];

const BUCKETS_UNLABELED = [
  1801258597, // Quest step
  2422292810, // Quest item
  497170007, // Engram
  444348033, // Personal weekly objective
  3621873013 // Actually unknown
];

const BUCKET_LABELERS = [
  (hash: number) => (hash === BUCKET_KINETIC ? "Kinetic" : null),
  (hash: number) => (hash === BUCKET_ENERGY ? "Energy" : null),
  (hash: number) => (hash === BUCKET_POWER ? "Power" : null),
  (hash: number) => (hash === BUCKET_GHOST ? "Ghost" : null),
  (hash: number) => (hash === BUCKET_ARTIFACT ? "Artifact" : null),
  (hash: number) => (hash === BUCKET_HELMET ? "Helmet" : null),
  (hash: number) => (hash === BUCKET_GAUNTLET ? "Glove" : null),
  (hash: number) => (hash === BUCKET_CHEST ? "Chest" : null),
  (hash: number) => (hash === BUCKET_LEG ? "Leg" : null),
  (hash: number) => (hash === BUCKET_CLASS ? "Class" : null),
  (hash: number) => (hash === BUCKET_BANNER ? "Banner" : null),
  (hash: number) => (hash === BUCKET_EMBLEM ? "Emblem" : null),
  (hash: number) => (hash === BUCKET_VEHICLE ? "Vehicle" : null),
  (hash: number) => (hash === BUCKET_SHIP ? "Ship" : null),
  (hash: number) => (hash === BUCKET_FINISHER ? "Finisher" : null),
  (hash: number) => (hash === BUCKET_EMOTE ? "Emote" : null),
  (hash: number) => (hash === BUCKET_EMOTES ? "Emotes" : null),
  (hash: number) => (hash === BUCKET_SUBCLASS ? "Subclass" : null),
  (hash: number) => (hash === BUCKET_QUEST ? "Quest" : null),
  (hash: number) => (hash === BUCKET_CONSUMABLE ? "Consumable" : null),
  (hash: number) => (hash === BUCKET_MOD ? "Mod" : null),
  (hash: number) => (BUCKETS_UNLABELED.includes(hash) ? "Unlabeled" : null)
];

const inventoryItemsSlotTagger =
  (logger: Logger) =>
  (
    inventoryItems: InventoryItem[],
    itemDefinitions: Record<string, DestinyInventoryItemDefinition>
  ): InventoryItem[] => {
    const taggedItems = inventoryItems.map<InventoryItem>(({ itemHash, itemInstanceId, tags }) => ({
      itemHash,
      itemInstanceId,
      tags: [...tags]
    }));

    for (const item of taggedItems) {
      const itemDefinition = itemDefinitions[`${item.itemHash}:${item.itemInstanceId}`];

      if (itemDefinition && itemDefinition.inventory) {
        const bucketTypeHash = itemDefinition.inventory.bucketTypeHash;

        let label: string | null = null;
        for (const labler of BUCKET_LABELERS) {
          label = labler(bucketTypeHash);
          if (label) {
            break;
          }
        }

        if (label) {
          item.tags.push(`Slot:${label}`);
        } else {
          logger.warn(`Unknown inventory bucket: ${bucketTypeHash} for item: ${item.itemHash}`);
        }
      } else {
        logger.error(`Item missing inventory data: ${item.itemHash}`);
      }
    }

    return taggedItems;
  };

const inventoryItemsExcluder =
  (slots: string[]) =>
  (inventoryItems: InventoryItem[]): InventoryItem[] => {
    return inventoryItems.filter((inventoryItem) => {
      return !inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });
    });
  };

const inventoryItemsIncluder =
  (slots?: string[] | null) =>
  (inventoryItems: InventoryItem[]): InventoryItem[] => {
    if (!slots) {
      return inventoryItems;
    }

    return inventoryItems.filter((inventoryItem) => {
      return inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });
    });
  };

const TIER_LABEL = {
  [TierType.Unknown]: "Unknown",
  [TierType.Currency]: "Currency",
  [TierType.Basic]: "Basic",
  [TierType.Common]: "Common",
  [TierType.Rare]: "Rare",
  [TierType.Superior]: "Legendary",
  [TierType.Exotic]: "Exotic"
};

const inventoryItemsWeaponTierTagger =
  () =>
  (
    inventoryItems: InventoryItem[],
    itemDefinitions: Record<string, DestinyInventoryItemDefinition>
  ): InventoryItem[] => {
    return inventoryItems.map(({ itemHash, itemInstanceId, tags }) => {
      const itemDefinition = itemDefinitions[`${itemHash}:${itemInstanceId}`];
      const label = TIER_LABEL[itemDefinition.inventory.tierType] || TIER_LABEL[TierType.Unknown];
      return { itemHash, itemInstanceId, tags: [...tags, `Tier:${label}`] };
    });
  };

const inventoryItemsNameTagger =
  () =>
  (
    inventoryItems: InventoryItem[],
    itemDefinitions: Record<string, DestinyInventoryItemDefinition>
  ): InventoryItem[] => {
    return inventoryItems.map(({ itemHash, itemInstanceId, tags }) => {
      const itemDefinition = itemDefinitions[`${itemHash}:${itemInstanceId}`];

      return {
        itemHash,
        itemInstanceId,
        tags: [...tags, `Name:${itemDefinition.displayProperties.name || "UNKNOWN"}`]
      };
    });
  };

const inventoryItemsLightLevelTagger =
  (slots: string[]) =>
  (
    inventoryItems: InventoryItem[],
    itemInstances: Record<string, DestinyItemInstanceComponent>
  ): InventoryItem[] => {
    return inventoryItems.map((inventoryItem) => {
      const matchSlot = inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });

      if (matchSlot) {
        const itemInstance = itemInstances[inventoryItem.itemInstanceId];
        const lightLevel = `${itemInstance?.primaryStat?.value || "N/A"}`;

        return {
          itemHash: inventoryItem.itemHash,
          itemInstanceId: inventoryItem.itemInstanceId,
          tags: [...inventoryItem.tags, `Light:${lightLevel}`]
        };
      } else {
        return inventoryItem;
      }
    });
  };

const WEAPON_TYPE: Record<number, string> = {
  [ItemSubType.AutoRifle]: "Auto Rifle",
  [ItemSubType.Shotgun]: "Shotgun",
  [ItemSubType.Machinegun]: "Machine Gun",
  [ItemSubType.HandCannon]: "Hand Cannon",
  [ItemSubType.RocketLauncher]: "Rocket Launcher",
  [ItemSubType.FusionRifle]: "Fusion Rifle",
  [ItemSubType.SniperRifle]: "Sniper Rifle",
  [ItemSubType.PulseRifle]: "Pulse Rifle",
  [ItemSubType.ScoutRifle]: "Scout Rifle",
  [ItemSubType.Sidearm]: "Sidearm",
  [ItemSubType.Sword]: "Sword",
  [ItemSubType.FusionRifleLine]: "Linear Fusion Rifle",
  [ItemSubType.GrenadeLauncher]: "Grenade Launcher",
  [ItemSubType.SubmachineGun]: "Submachine Gun",
  [ItemSubType.TraceRifle]: "Trace Rifle",
  [ItemSubType.Bow]: "Bow",
  [ItemSubType.Glaive]: "Glaive"
};

const WEAPON_DAMAGE_TYPE: Record<number, string> = {
  [DamageType.Kinetic]: "Kinetic",
  [DamageType.Arc]: "Arc",
  [DamageType.Thermal]: "Solar",
  [DamageType.Void]: "Void",
  [DamageType.Stasis]: "Stasis",
  [DamageType.Strand]: "Strand"
};

const inventoryItemsWeaponTagger =
  (slots: string[]) =>
  (
    inventoryItems: InventoryItem[],
    itemDefinitions: Record<string, DestinyInventoryItemDefinition>,
    intrinsicItemDefinitions: Record<string, DestinyInventoryItemDefinition>,
    damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition>
  ): InventoryItem[] => {
    return inventoryItems.map((inventoryItem) => {
      const matchSlot = inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });

      if (matchSlot) {
        const itemDefinition =
          itemDefinitions[`${inventoryItem.itemHash}:${inventoryItem.itemInstanceId}`];

        if (itemDefinition) {
          const weaponTags: string[] = [];

          const weaponType = WEAPON_TYPE[itemDefinition.itemSubType] || "Unknown";
          weaponTags.push(`Weapon:${weaponType}`);

          const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
            ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
          );

          if (intrinsicTraitSocket) {
            const intrinsicTraitSocketItemDefinition =
              intrinsicItemDefinitions[`${intrinsicTraitSocket.singleInitialItemHash}:`];
            const intrinsicTraitName =
              intrinsicTraitSocketItemDefinition?.displayProperties?.name || "";

            const frameName = intrinsicTraitName.replace(/\sFrame$/, "").replace(/\sGlaive$/, "");
            weaponTags.push(`Frame:${frameName}`);
          }

          const damageTypeDefinition = damageTypeDefinitions[inventoryItem.itemHash];
          if (damageTypeDefinition) {
            const damageTypeName = WEAPON_DAMAGE_TYPE[damageTypeDefinition.enumValue] || "Unknown";
            weaponTags.push(`Damage:${damageTypeName}`);
          }

          return {
            itemHash: inventoryItem.itemHash,
            itemInstanceId: inventoryItem.itemInstanceId,
            tags: [...inventoryItem.tags, ...weaponTags]
          };
        } else {
          return inventoryItem;
        }
      } else {
        return inventoryItem;
      }
    });
  };

const CACHE_NS = "inventory:command-factory";

const inventoryDataGetter =
  (
    logger: Logger,
    manifestDefinitionService: ManifestDefinitionService,
    cacheService: CacheService,
    characterService: CharacterService,
    characterDescriptionService: CharacterDescriptionService,
    inventoryService: InventoryService
  ) =>
  async (
    sessionId: string
  ): Promise<
    | [Error, null]
    | [
        null,
        {
          inventoryItems: InventoryItem[];
          itemInstances: Record<string, DestinyItemInstanceComponent>;
          itemDefinitions: Record<string, DestinyInventoryItemDefinition>;
          intrinsicItemDefinitions: Record<string, DestinyInventoryItemDefinition>;
          damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition>;
        }
      ]
  > => {
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
    const itemInstances: Record<string, DestinyItemInstanceComponent> = {};
    const itemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const intrinsicItemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition> = {};

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
      Object.assign(itemInstances, equipmentItems.instances);

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
      Object.assign(itemInstances, inventoryItems.instances);
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
    Object.assign(itemInstances, vaultItems.instances);

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
      itemDefinitions[`${item.itemHash}:${item.itemInstanceId || ""}`] = itemDefinition;

      // Intrinsic trait item definition
      // ------------------------------------------------------------------------------------------

      const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
        ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
      );
      if (intrinsicTraitSocket) {
        const [socketItemDefinitionErr, socketItemDefinition] =
          await manifestDefinitionService.getItemDefinition(
            intrinsicTraitSocket.singleInitialItemHash
          );
        if (socketItemDefinitionErr) {
          return [
            logger.loggedError(
              `Unable to retrieve item intrinsic trait socket for item definition for ${item.itemHash}: ${socketItemDefinitionErr.message}`
            ),
            null
          ];
        }
        intrinsicItemDefinitions[`${socketItemDefinition.hash}:`] = socketItemDefinition;

        // Damage type item definition
        // ------------------------------------------------------------------------------------------

        // Although the data structure for damage type is an array (for some reason), it only ever
        // has 1 value. So we're just taking the 1st value out of the array.
        const damageTypeHash = (itemDefinition.damageTypeHashes || [])[0];
        if (damageTypeHash) {
          const [damageTypeDefinitionErr, damageTypeDefinition] =
            await manifestDefinitionService.getDamageTypeDefinition(damageTypeHash);
          if (damageTypeDefinitionErr) {
            return [
              logger.loggedError(
                `Unable to retrieve item damage type definition for ${item.itemHash}: ${damageTypeDefinitionErr.message}`
              ),
              null
            ];
          }
          damageTypeDefinitions[item.itemHash] = damageTypeDefinition;
        }
      }
    }

    const inventoryItems: InventoryItem[] = Object.entries(itemDefinitions).map(([key]) => {
      const identifiers = key.split(":", 2);
      const itemHash = parseInt(identifiers[0], 10);
      const itemInstanceId = identifiers[1];

      return { itemHash, itemInstanceId, tags: [] };
    });

    return [
      null,
      {
        inventoryItems,
        itemInstances,
        itemDefinitions,
        intrinsicItemDefinitions,
        damageTypeDefinitions
      }
    ];
  };

const sortTableByColumns = (
  headers: string[],
  rows: string[][],
  sortTransformers: Record<string, (val: string) => string>
) => {
  const newRows = [...rows];

  newRows.sort((rowA, rowB) => {
    for (let columnIndex = 0; columnIndex < rowA.length; columnIndex++) {
      const valueA = rowA[columnIndex];
      const valueB = rowB[columnIndex];

      let transform = sortTransformers[headers[columnIndex]];
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

const TIER_ORDER: Record<string, string> = {
  ["Exotic"]: "aa",
  ["Legendary"]: "ab",
  ["Rare"]: "ac",
  ["Common"]: "ad",
  ["Basic"]: "ae",
  ["Currency"]: "af",
  ["Unknown"]: "ag"
};

const transformTierColumn = (val: string) => {
  const order = TIER_ORDER[val];
  return `${order || "zz"}:${val}`;
};

const SLOT_ORDER: Record<string, string> = {
  ["Kinetic"]: "aa",
  ["Energy"]: "ab",
  ["Power"]: "ac",
  ["Ghost"]: "ae",
  ["Artifact"]: "af",
  ["Helmet"]: "ag",
  ["Glove"]: "ah",
  ["Chest"]: "ai",
  ["Leg"]: "aj",
  ["Class"]: "ak",
  ["Banner"]: "al"
};

const transformSlotColumn = (val: string) => {
  const order = SLOT_ORDER[val];
  return `${order || "zz"}:${val}`;
};

const transformFrameColumn = (val: string) => {
  if (val === "Häkke Precision") {
    return "Precision Frame:0";
  } else if (val === "Precision") {
    return "Precision Frame:1";
  } else {
    return val;
  }
};

export const inventoryCommand = (options: InventoryCommandOptions): CommandDefinition => {
  return {
    description: options.description,
    options: [sessionIdOption, verboseOption],
    action: async (_, opts, { app, logger }) => {
      const { session: sessionId, verbose } = opts as CmdOptions;
      logger.debug(`Session ID: ${sessionId}`);

      const getInventoryData = inventoryDataGetter(
        logger,
        app.resolve(ManifestDefinitionService),
        app.resolve(CacheService),
        app.resolve(CharacterService),
        app.resolve(CharacterDescriptionService),
        app.resolve(InventoryService)
      );

      const tagInventoryItemsSlot = inventoryItemsSlotTagger(logger);
      const excludeInventoryItems = inventoryItemsExcluder(["Emotes", "Subclass", "Unlabeled"]);
      const includeInventoryItems = inventoryItemsIncluder(options.includeSlots);
      const tagInventoryItemsTier = inventoryItemsWeaponTierTagger();
      const tagInventoryItemsName = inventoryItemsNameTagger();
      const tagInventoryItemsLightLevel = inventoryItemsLightLevelTagger([
        "Kinetic",
        "Energy",
        "Power",
        "Helmet",
        "Glove",
        "Chest",
        "Leg",
        "Class"
      ]);
      const tagInventoryItemsWeapon = inventoryItemsWeaponTagger(["Kinetic", "Energy", "Power"]);

      const [inventoryDataErr, inventoryData] = await getInventoryData(sessionId);
      if (inventoryDataErr) {
        return inventoryDataErr;
      }

      const {
        inventoryItems,
        itemInstances,
        itemDefinitions,
        intrinsicItemDefinitions,
        damageTypeDefinitions
      } = inventoryData;

      const slotTaggedInventoryItems = tagInventoryItemsSlot(inventoryItems, itemDefinitions);
      const exclusiveInventoryItems = excludeInventoryItems(slotTaggedInventoryItems);
      const inclusiveInventoryItems = includeInventoryItems(exclusiveInventoryItems);
      const tierTaggedInventoryItems = tagInventoryItemsTier(
        inclusiveInventoryItems,
        itemDefinitions
      );
      const nameTaggedInventoryItems = tagInventoryItemsName(
        tierTaggedInventoryItems,
        itemDefinitions
      );
      const lightTaggedInventoryItems = tagInventoryItemsLightLevel(
        nameTaggedInventoryItems,
        itemInstances
      );
      const weaponTaggedInventoryItems = tagInventoryItemsWeapon(
        lightTaggedInventoryItems,
        itemDefinitions,
        intrinsicItemDefinitions,
        damageTypeDefinitions
      );

      const tableColumns = [
        "Slot",
        "Tier",
        "Weapon",
        "Frame",
        "Damage",
        "Name",
        "Light",
        ...(verbose ? ["ID"] : [])
      ];

      const displayRows = weaponTaggedInventoryItems.map((inventoryItem) => {
        const fields = [
          { name: "ID", value: `${inventoryItem.itemHash}:${inventoryItem.itemInstanceId}` }
        ];

        const displayTags = inventoryItem.tags.filter((tag) => {
          return tableColumns.find((column) => tag.startsWith(`${column}:`));
        });

        displayTags.forEach((displayTag) => {
          const tagParts = displayTag.split(":", 2);
          fields.push({ name: tagParts[0], value: tagParts[1] });
        });

        return fields;
      });

      const tableData: string[][] = [];

      tableData.push(tableColumns);

      const tableRows: string[][] = [];
      for (const displayRow of displayRows) {
        const tableRow: string[] = [];
        for (const tableColumn of tableColumns) {
          const displayColumn = displayRow.find(({ name }) => name === tableColumn);
          if (displayColumn) {
            tableRow.push(displayColumn.value);
          } else {
            tableRow.push("@@NO@DATA@@");
          }
        }
        tableRows.push(tableRow);
      }

      const emptyColumns = [];
      for (const columnIndex in tableColumns) {
        let isEmpty = true;
        for (const rowIndex in tableRows) {
          if (tableRows[rowIndex][columnIndex] !== "@@NO@DATA@@") {
            isEmpty = false;
          }
        }
        if (isEmpty) {
          emptyColumns.push(columnIndex);
        }
      }

      tableData.push(
        ...sortTableByColumns(tableColumns, tableRows, {
          ["Slot"]: transformSlotColumn,
          ["Tier"]: transformTierColumn,
          ["Frame"]: transformFrameColumn
        })
      );

      const cleanedUpTableData: string[][] = [];
      for (const rowIndex in tableData) {
        const columns = tableData[rowIndex];
        const cleanedUpColumns: string[] = [];

        for (const columnIndex in columns) {
          const column = tableData[rowIndex][columnIndex];

          if (!emptyColumns.includes(columnIndex)) {
            if (column === "@@NO@DATA@@") {
              cleanedUpColumns.push("--");
            } else {
              cleanedUpColumns.push(column);
            }
          }
        }
        cleanedUpTableData.push(cleanedUpColumns);
      }

      logger.log(makeTable2(cleanedUpTableData));
    }
  };
};
