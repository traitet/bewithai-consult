"use client";

import { useState } from "react";
import { addIssueImpactAction } from "./actions";
import { FREQUENCY_UNITS, FREQUENCY_LABELS_TH, computeHoursPerYear, isFrequencyUnit } from "@/lib/workload";

export function AddImpactForm({
  issueId,
  companyUsers,
}: {
  issueId: string;
  companyUsers: { id: string; name: string }[];
}) {
  const [frequencyUnit, setFrequencyUnit] = useState<(typeof FREQUENCY_UNITS)[number]>("PER_WEEK");
  const [frequencyCount, setFrequencyCount] = useState(1);
  const [minutesPerOccurrence, setMinutesPerOccurrence] = useState(15);

  const previewHoursPerYear = computeHoursPerYear({ frequencyUnit, frequencyCount, minutesPerOccurrence });

  return (
    <form action={addIssueImpactAction} className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface-alt p-4">
      <input type="hidden" name="issueId" value={issueId} />
      <span className="text-[12px] font-semibold text-text">เพิ่มผู้ได้รับผลกระทบ</span>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-faint">พนักงาน</span>
          <select name="userId" required className="input">
            <option value="">เลือกพนักงาน...</option>
            {companyUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-faint">ความถี่</span>
          <div className="flex gap-1.5">
            <input
              name="frequencyCount"
              type="number"
              min="0.5"
              step="0.5"
              required
              value={frequencyCount}
              onChange={(e) => setFrequencyCount(Number(e.target.value) || 0)}
              className="input w-16"
            />
            <select
              name="frequencyUnit"
              value={frequencyUnit}
              onChange={(e) => {
                const v = e.target.value;
                if (isFrequencyUnit(v)) setFrequencyUnit(v);
              }}
              className="input flex-1"
            >
              {FREQUENCY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {FREQUENCY_LABELS_TH[u]}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-[11px] text-text-faint">เวลาที่เสียต่อครั้ง (นาที)</span>
          <input
            name="minutesPerOccurrence"
            type="number"
            min="1"
            step="1"
            required
            value={minutesPerOccurrence}
            onChange={(e) => setMinutesPerOccurrence(Number(e.target.value) || 0)}
            className="input"
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
        <span className="text-[11.5px] text-text-faint">รวมเวลาที่เสีย ≈</span>
        <span className="text-[13px] font-semibold text-blue">{previewHoursPerYear.toLocaleString()} ชม./ปี</span>
      </div>

      <button
        type="submit"
        className="self-start rounded-md border border-border px-3 py-1.5 text-[11.5px] font-semibold text-text-dim hover:border-blue hover:text-blue"
      >
        + เพิ่มผู้ได้รับผลกระทบ
      </button>
    </form>
  );
}
