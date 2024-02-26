import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { DamageType, ItemSubType } from "~type/bungie-api/destiny.types";
import {
  DestinyDamageTypeDefinition,
  DestinyInventoryItemDefinition
} from "~type/bungie-api/destiny/definitions.types";

import { InventoryItem } from "./type";

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

export const weaponTagger =
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

          // Weapon type
          // --------------------------------------------------------------------------------------

          const weaponType = WEAPON_TYPE[itemDefinition.itemSubType] || "Unknown";
          weaponTags.push(`Weapon:${weaponType}`);

          // Weapon frame
          // --------------------------------------------------------------------------------------

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

          // Weapon damage type
          // --------------------------------------------------------------------------------------

          const damageTypeDefinition = damageTypeDefinitions[inventoryItem.itemHash];
          if (damageTypeDefinition) {
            const damageTypeName = WEAPON_DAMAGE_TYPE[damageTypeDefinition.enumValue] || "Unknown";
            weaponTags.push(`Damage:${damageTypeName}`);
          }

          // Crafted weapon
          // --------------------------------------------------------------------------------------

          if (itemDefinition.inventory.recipeItemHash) {
            weaponTags.push(`#:#`);
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
