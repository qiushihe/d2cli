import { table } from "table";

const makeTable = (data: string[][]): string => {
  return table(data, {
    drawHorizontalLine: (row) => {
      return row <= 1 || row === data.length;
    }
  });
};

export const stringifyTable = (data: string[][]): string => {
  return makeTable(data).replace(/^\s*/, "").replace(/\s*$/, "");
};
