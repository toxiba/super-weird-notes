import { useMemo } from "react";
import type { NoteRecord } from "../../../electron/types";
import { dateParts } from "../../lib/dates";

export function DateTree({ notes, current, onSelect }: { notes: NoteRecord[]; current: string | null; onSelect: (value: string | null) => void }) {
  const tree = useMemo(() => {
    const years = new Map<string, Map<string, Map<string, Map<string, number>>>>();
    for (const note of notes) {
      const parts = dateParts(note.createdAt);
      if (!years.has(parts.year)) years.set(parts.year, new Map());
      const quarters = years.get(parts.year)!;
      if (!quarters.has(parts.quarter)) quarters.set(parts.quarter, new Map());
      const months = quarters.get(parts.quarter)!;
      if (!months.has(parts.month)) months.set(parts.month, new Map());
      const days = months.get(parts.month)!;
      days.set(parts.day, (days.get(parts.day) || 0) + 1);
    }
    return years;
  }, [notes]);
  const countDays = (days: Map<string, number>) => [...days.values()].reduce((sum, count) => sum + count, 0);
  const countMonths = (months: Map<string, Map<string, number>>) =>
    [...months.values()].reduce((sum, days) => sum + countDays(days), 0);
  const countQuarters = (quarters: Map<string, Map<string, Map<string, number>>>) =>
    [...quarters.values()].reduce((sum, months) => sum + countMonths(months), 0);
  return <div className="date-tree">
    {[...tree.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, quarters]) => (
      <details key={year} open>
        <summary><button className={`tree-button ${current === year ? "chosen" : ""}`} onClick={() => onSelect(current === year ? null : year)}>{year}<span>({countQuarters(quarters)})</span></button></summary>
        {[...quarters.entries()].map(([quarter, months]) => {
          const qKey = `${year}/${quarter}`;
          return <details key={qKey} open>
            <summary><button className={`tree-button nested ${current === qKey ? "chosen" : ""}`} onClick={() => onSelect(current === qKey ? null : qKey)}>{quarter}<span>({countMonths(months)})</span></button></summary>
            {[...months.entries()].map(([month, days]) => {
              const mKey = `${qKey}/${month}`;
              const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: "short" });
              return <details key={mKey}>
                <summary><button className={`tree-button nested deeper ${current === mKey ? "chosen" : ""}`} onClick={() => onSelect(current === mKey ? null : mKey)}>{monthName}<span>({countDays(days)})</span></button></summary>
                {[...days.entries()].map(([day, count]) => {
                  const dKey = `${mKey}/${day}`;
                  return <button key={dKey} className={`tree-button day-node ${current === dKey ? "chosen" : ""}`} onClick={() => onSelect(current === dKey ? null : dKey)}>{day}<span>({count})</span></button>;
                })}
              </details>;
            })}
          </details>;
        })}
      </details>
    ))}
  </div>;
}
