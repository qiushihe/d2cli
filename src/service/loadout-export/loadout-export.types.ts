export type ExportedItemType = "SUBCLASS" | "WEAPON" | "ARMOUR";

export type ExportedItem = {
  type: ExportedItemType;
  isExtra: boolean;
  itemHash: number;
  itemInstanceId: string;
  itemName: string;
  plugs: ExportedPlug[];
};

export type ExportedPlug = {
  itemHash: number;
  itemName: string;
  socketIndex: number;
};
