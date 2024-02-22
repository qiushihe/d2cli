import { InventoryBucket, InventoryBucketHashes } from "~src/enum/inventory.enum";
import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { DamageType, ItemSubType, TierType } from "~type/bungie-api/destiny.types";
import {
  DestinyDamageTypeDefinition,
  DestinyInventoryItemDefinition
} from "~type/bungie-api/destiny/definitions.types";

export type ReportItem = {
  itemHash: number;
  itemInstanceId: string;
  tags: string[];
};

export const reportItemsWeaponSlotGrouper =
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

export const reportItemsWeaponDamageTypeTagger =
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

export const reportItemsWeaponTypeTagger =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    for (const reportItem of reportItems) {
      const itemDefinition =
        itemDefinitionsByHash[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (itemDefinition.itemSubType === ItemSubType.AutoRifle) {
        reportItem.tags.push("Type:AutoRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Shotgun) {
        reportItem.tags.push("Type:Shotgun");
      } else if (itemDefinition.itemSubType === ItemSubType.Machinegun) {
        reportItem.tags.push("Type:MachineGun");
      } else if (itemDefinition.itemSubType === ItemSubType.HandCannon) {
        reportItem.tags.push("Type:HandCannon");
      } else if (itemDefinition.itemSubType === ItemSubType.RocketLauncher) {
        reportItem.tags.push("Type:RocketLauncher");
      } else if (itemDefinition.itemSubType === ItemSubType.FusionRifle) {
        reportItem.tags.push("Type:FusionRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.SniperRifle) {
        reportItem.tags.push("Type:SniperRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.PulseRifle) {
        reportItem.tags.push("Type:PulseRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.ScoutRifle) {
        reportItem.tags.push("Type:ScoutRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Sidearm) {
        reportItem.tags.push("Type:Sidearm");
      } else if (itemDefinition.itemSubType === ItemSubType.Sword) {
        reportItem.tags.push("Type:Sword");
      } else if (itemDefinition.itemSubType === ItemSubType.FusionRifleLine) {
        reportItem.tags.push("Type:LinearFusionRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.GrenadeLauncher) {
        reportItem.tags.push("Type:GrenadeLauncher");
      } else if (itemDefinition.itemSubType === ItemSubType.SubmachineGun) {
        reportItem.tags.push("Type:SubMachineGun");
      } else if (itemDefinition.itemSubType === ItemSubType.TraceRifle) {
        reportItem.tags.push("Type:TraceRifle");
      } else if (itemDefinition.itemSubType === ItemSubType.Bow) {
        reportItem.tags.push("Type:Bow");
      } else if (itemDefinition.itemSubType === ItemSubType.Glaive) {
        reportItem.tags.push("Type:Glaive");
      }
    }
  };

export const reportItemsWeaponFrameTagger =
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

        const frameName = intrinsicTraitName
          .replace(/'/g, "")
          .replace(/-/g, "")
          .split(" ")
          .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
          .join("");

        reportItem.tags.push(`Frame:${frameName}`);
      }
    }
  };

export const reportItemsWeaponTierTagger =
  (reportItems: ReportItem[]) =>
  (itemDefinitionsByHash: Record<string, DestinyInventoryItemDefinition>) => {
    for (const reportItem of reportItems) {
      const itemDefinition =
        itemDefinitionsByHash[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (itemDefinition.inventory.tierType === TierType.Exotic) {
        reportItem.tags.push("Tier:Exotic");
      } else {
        reportItem.tags.push("Tier:NonExotic");
      }
    }
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
  if (val === "NonExotic") {
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
  if (val === "PrecisionFrame") {
    return "PrecisionFrame:0";
  } else if (val === "HäkkePrecisionFrame") {
    return "PrecisionFrame:1";
  } else {
    return val;
  }
};
