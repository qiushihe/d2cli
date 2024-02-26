import { InventoryBucket, InventoryBucketHashes } from "~src/enum/inventory.enum";
import { Logger } from "~src/service/log/log.types";
import { TierType } from "~type/bungie-api/destiny.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";

import { InventoryItem } from "./type";

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

const TIER_LABEL = {
  [TierType.Unknown]: "Unknown",
  [TierType.Currency]: "Currency",
  [TierType.Basic]: "Basic",
  [TierType.Common]: "Common",
  [TierType.Rare]: "Rare",
  [TierType.Superior]: "Legendary",
  [TierType.Exotic]: "Exotic"
};

export const slotTagger =
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

      if (!itemDefinition) {
        logger.error(`Item missing definition: ${item.itemHash}`);
        continue;
      }

      // Name
      // ------------------------------------------------------------------------------------------

      item.tags.push(`Name:${itemDefinition.displayProperties.name || "UNKNOWN"}`);

      if (!itemDefinition.inventory) {
        logger.error(`Item missing inventory data: ${item.itemHash}`);
        continue;
      }

      // Bucket Label
      // ------------------------------------------------------------------------------------------

      const bucketTypeHash = itemDefinition.inventory.bucketTypeHash;
      let bucketLabel: string | null = null;
      for (const getBucketLabel of BUCKET_LABELERS) {
        bucketLabel = getBucketLabel(bucketTypeHash);
        if (bucketLabel) {
          break;
        }
      }

      if (bucketLabel) {
        item.tags.push(`Slot:${bucketLabel}`);
      } else {
        logger.warn(`Unknown inventory bucket: ${bucketTypeHash} for item: ${item.itemHash}`);
      }

      // Tier Label
      // ------------------------------------------------------------------------------------------

      const tierLabel =
        TIER_LABEL[itemDefinition.inventory.tierType] || TIER_LABEL[TierType.Unknown];
      item.tags.push(`Tier:${tierLabel}`);
    }

    return taggedItems;
  };
