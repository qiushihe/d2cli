import * as R from "ramda";
import { table } from "table";

const makeTable = (data: string[][]): string =>
  table(data, {
    drawHorizontalLine: R.cond([
      [R.gte(1), R.T],
      [R.equals(data.length), R.T],
      [R.T, R.F]
    ])
  });

export const stringifyTable = (data: string[][]): string =>
  R.pipe(makeTable, R.replace(/^\s*/, ""), R.replace(/\s*$/, ""))(data);
