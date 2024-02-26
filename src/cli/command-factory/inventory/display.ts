export const transformHeaderColumn = (val: string): string => {
  if (val === "Crafted") {
    return "";
  } else {
    return val;
  }
};

export const transformDataColumn = (
  headers: string[],
  rows: string[][],
  valueTransformers: Record<string, (val: string) => string>
): string[][] => {
  const newRows: string[][] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const columns = rows[rowIndex];
    const newColumns: string[] = [];

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
      const column = columns[columnIndex];

      let transform = valueTransformers[headers[columnIndex]];
      if (!transform) {
        transform = (val) => val;
      }

      newColumns.push(transform(column));
    }

    newRows.push(newColumns);
  }

  return newRows;
};

export const craftedValue = (val: string): string => {
  if (val === "true") {
    return "#";
  } else {
    return val;
  }
};

export const sortTableByColumns = (
  headers: string[],
  rows: string[][],
  sortTransformers: Record<string, (val: string) => string>
): string[][] => {
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

export const tierSortValue = (val: string): string => {
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

export const slotSortValue = (val: string): string => {
  const order = SLOT_ORDER[val];
  return `${order || "zz"}:${val}`;
};

export const frameSortValue = (val: string): string => {
  if (val === "Häkke Precision") {
    return "Precision Frame:0";
  } else if (val === "Precision") {
    return "Precision Frame:1";
  } else {
    return val;
  }
};
