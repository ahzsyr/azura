"use client";

import type { CompareRowEntry } from "@/features/comparison/types";

type Props = {
  entry: CompareRowEntry;
  columnCount: number;
};

export function ComparisonFieldRenderer({ entry, columnCount }: Props) {
  if (entry.type === "group") {
    return (
      <tr className="cmp-table__group">
        <th colSpan={columnCount + 1} scope="colgroup">
          {entry.group}
        </th>
      </tr>
    );
  }

  return (
    <tr>
      <th scope="row" className="cmp-table__term">
        {entry.label}
      </th>
      {entry.values.map((val, colIdx) => (
        <td
          key={`${entry.key}-${colIdx}`}
          className={`cmp-table__val${entry.differs && entry.highlightDifferences ? " is-diff" : ""}`}
        >
          {val ?? "—"}
        </td>
      ))}
    </tr>
  );
}
