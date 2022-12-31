export class TextGrid {
  private rows: string[][];

  constructor() {
    this.rows = [];
  }

  addRow(row: string[]): void {
    this.rows.push(row);
  }

  toString(): string {
    const columnsCount = this.rows.reduce((acc, row) => (row.length > acc ? row.length : acc), 0);

    const columnLengths = this.rows.reduce((acc, row) => {
      for (let columnIndex = 0; columnIndex < columnsCount; columnIndex++) {
        const columnLength = (row[columnIndex] || "").length;
        if (columnLength > (acc[columnIndex] || 0)) {
          acc[columnIndex] = columnLength;
        }
      }
      return acc;
    }, [] as number[]);

    return this.rows
      .map((row) =>
        row
          .map((cell, columnIndex) => (cell || "").padEnd(columnLengths[columnIndex], " "))
          .join("\t")
      )
      .join("\n");
  }
}
