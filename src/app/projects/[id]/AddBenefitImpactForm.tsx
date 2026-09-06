"use client";

import { useState } from "react";
import { addBenefitImpactAction } from "./actions";
import { FREQUENCY_UNITS, FREQUENCY_LABELS_TH, computeHoursPerWeek, isFrequencyUnit } from "@/lib/workload";
import type { BenefitPhase } from "@/lib/repos/benefit";

export function AddBenefitImpactForm({
  projectId,
  phase,
  companyUsers,
}: {
  projectId: string;
  phase: BenefitPhase;
  companyUsers: { id: string; name: string }[];
}) {
  const [frequencyUnit, setFrequencyUnit] = useState<(typeof FREQUENCY_UNITS)[number]>("PER_WEEK");
  const [frequencyCount, setFrequencyCount] = useState(1);
  const [minutesPerOccurrence, setMinutesPerOccurrence] = useState(15);

  const previewHoursPerWeek = computeHoursPerWeek({ frequencyUnit, frequencyCount, minutesPerOccurrence });

  return (
    <form action={addBenefitImpactAction} className="flex flex-col gap-2.5 rounded-lg border border-border-soft bg-surface-alt p-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="phase" value={phase} />

      <select name="userId" required className="input text-[12px]" defaultValue="">
        <option value="" disabled>
          เลือกพนักงาน...
        </option>
        {companyUsers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <div className="flex gap-1.5">
        <input
          name="frequencyCount"
          type="number"
          min="0.5"
          step="0.5"
          required
          value={frequencyCount}
          onChange={(e) => setFrequencyCount(Number(e.target.value) || 0)}
          className="input w-16 text-[12px]"
        />
        <select
          name="frequencyUnit"
          value={frequencyUnit}
          onChange={(e) => {
            const v = e.target.value;
            if (isFrequencyUnit(v)) setFrequencyUnit(v);
          }}
          className="input flex-1 text-[12px]"
        >
          {FREQUENCY_UNITS.map((u) => (
            <option key={u} value={u}>
              {FREQUENCY_LABELS_TH[u]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-text-faint">
        เวลาที่ใช้ต่อครั้ง (นาที)
        <input
          name="minutesPerOccurrence"
          type="number"
          min="1"
          step="1"
          required
          value={minutesPerOccurrence}
          onChange={(e) => setMinutesPerOccurrence(Number(e.target.value) || 0)}
          className="input ml-auto w-20 text-[12px]"
        />
      </label>

      <div className="flex items-center justify-between rounded-md bg-surface px-2.5 py-1.5">
        <span className="text-[11px] text-text-faint">≈</span>
        <span className="text-[12px] font-semibold text-blue">{previewHoursPerWeek.toLocaleString()} ชม./สัปดาห์</span>
      </div>

      <button
        type="submit"
        className="self-start rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-text-dim hover:border-blue hover:text-blue"
      >
        + เพิ่ม
      </button>
    </form>
  );
}
