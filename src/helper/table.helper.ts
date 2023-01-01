import * as R from "ramda";
import { table } from "table";

export const stringifyTable = (data: string[][]): string =>
  table(data, {
    drawHorizontalLine: R.cond([
      [R.gte(1), R.T],
      [R.equals(data.length), R.T],
      [R.T, R.F]
    ])
  });
