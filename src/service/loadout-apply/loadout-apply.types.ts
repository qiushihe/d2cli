import { InventoryBucket } from "~src/enum/inventory.enum";

export type LoadoutItemType = "SUBCLASS" | "WEAPON" | "ARMOUR" | "OTHER";

export type LoadoutItemBucket =
  | InventoryBucket.KineticWeapon
  | InventoryBucket.EnergyWeapon
  | InventoryBucket.PowerWeapon
  | InventoryBucket.Helmet
  | InventoryBucket.Gauntlet
  | InventoryBucket.ChestArmour
  | InventoryBucket.LegArmour
  | InventoryBucket.ClassItem
  | InventoryBucket.Subclass
  | "other";

export type LoadoutItem = {
  itemType: LoadoutItemType;
  itemBucket: LoadoutItemBucket;
  itemHash: number;
  itemInstanceId: string;
  isItemExotic: boolean;
};

export type LoadoutPlug = {
  itemType: LoadoutItemType;
  itemBucket: LoadoutItemBucket;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number;
  plugItemHash: number;
};

export type LoadoutAction = {
  skip: boolean;
  type: "DEPOSIT" | "WITHDRAW" | "EQUIP" | "SOCKET";
  characterId: string;
  characterName: string;
  itemHash: number;
  itemName: string;
  itemInstanceId: string;
  socketIndex: number | null;
  plugItemHash: number | null;
  plugItemName: string | null;
};
