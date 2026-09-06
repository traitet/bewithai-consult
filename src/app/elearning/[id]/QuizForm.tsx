"use client";

import { useRef, useState } from "react";
import type { QuizQuestion } from "@/lib/courseContent";

export function QuizForm({
  courseId,
  questions,
  action,
  mode,
}: {
  courseId: string;
  questions: QuizQuestion[];
  action: (formData: FormData) => void | Promise<void>;
  mode: "pre" | "post";
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const scoreInputRef = useRef<HTMLInputElement>(null);
  const allAnswered = answers.every((a) => a !== null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!allAnswered) {
          e.preventDefault();
          return;
        }
        const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
        const score = Math.round((correct / questions.length) * 100);
        if (scoreInputRef.current) scoreInputRef.current.value = String(score);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input ref={scoreInputRef} type="hidden" name="score" defaultValue="0" />

      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border border-border-soft p-3">
          <p className="mb-2 text-[12.5px] font-medium text-text">
            {qi + 1}. {q.question}
          </p>
          <div className="flex flex-col gap-1.5">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 text-[12px] text-text-dim">
                <input
                  type="radio"
                  name={`q-${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      {mode === "post" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border-soft p-3">
          <span className="text-[12px] font-medium text-text">ความพึงพอใจต่อคอร์สนี้ (1 = น้อยที่สุด, 5 = มากที่สุด)</span>
          <select name="satisfactionRating" defaultValue="5" className="input w-32">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <textarea name="satisfactionComment" rows={2} placeholder="ความคิดเห็นเพิ่มเติม (ถ้ามี)" className="input resize-none" />
        </div>
      )}

      <button
        type="submit"
        disabled={!allAnswered}
        className="self-start rounded-lg bg-gradient-to-br from-blue to-teal px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
      >
        {mode === "pre" ? "ส่งแบบทดสอบก่อนเรียน" : "ส่งแบบทดสอบหลังเรียน"}
      </button>
      {!allAnswered && <p className="text-[11px] text-text-faint">กรุณาตอบให้ครบทุกข้อก่อนส่ง</p>}
    </form>
  );
}
