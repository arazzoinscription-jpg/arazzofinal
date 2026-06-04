"use client";

import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

export interface DayDatum { label: string; count: number; }

/** Graphe d'activité hebdomadaire : leçons terminées par jour (données réelles). */
export function WeeklyActivityChart({ data }: { data: DayDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="28%">
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "rgba(107,33,200,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
          formatter={((v: number) => [`${v} leçon(s)`, "Terminées"]) as never}
        />
        <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count >= max && max > 0 ? "#E8650A" : "#6B21C8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
