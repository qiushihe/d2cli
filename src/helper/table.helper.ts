import { table } from "table";

export const makeTable = (data: string[][]): string => {
  return table(data, { drawHorizontalLine: (row) => row <= 1 || row === data.length }).trim();
};

const DEFAULT_COLUMNS = 80;

const getTerminalWidth = (): number => {
  return process.stdout.columns || DEFAULT_COLUMNS;
};

const ensureColumnSpace = (value?: number): number => {
  if (!value) {
    return 1;
  } else if (value < 1) {
    return 1;
  } else {
    return value;
  }
};

export type MakeTableOptions = {
  columnSpace?: number;
  flexibleColumns?: number[];
};

export const makeTable2 = (rows: string[][], options?: MakeTableOptions): string => {
  const columnSpace = ensureColumnSpace(options?.columnSpace);
  const flexibleColumnIndices = options?.flexibleColumns || [];

  const trimmedRows = rows.map((columns) => columns.map((column) => `${column}`.trim()));

  const columnWidths: number[] = [];
  trimmedRows.forEach((columns) => {
    columns.forEach((column, columnIndex) => {
      if (column.length > (columnWidths[columnIndex] || 0)) {
        columnWidths[columnIndex] = column.length;
      }
    });
  });

  const maxRowWidth = getTerminalWidth() - 2;

  const maxColumnsWidth =
    columnWidths.reduce((acc, width) => acc + width, 0) +
    Math.max(columnWidths.length - 1, 0) * columnSpace;

  const overflowWidth = Math.max(maxColumnsWidth - maxRowWidth, 0);
  const overflowWidthPerColumn =
    flexibleColumnIndices.length <= 0 ? 0 : Math.ceil(overflowWidth / flexibleColumnIndices.length);

  return trimmedRows
    .map((columns) => {
      return columns
        .map((column, columnIndex) => {
          const columnWidth = columnWidths[columnIndex];
          let columnString = column.padEnd(columnWidth, " ".repeat(columnSpace));

          if (flexibleColumnIndices.includes(columnIndex)) {
            columnString = columnString.slice(0, columnString.length - overflowWidthPerColumn);
          }

          return columnString;
        })
        .join(" ");
    })
    .join("\n");
};
