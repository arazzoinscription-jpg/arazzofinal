"use client";

import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

// Pièces terminées par jour (mock). "done" = terminées, "wip" = en cours.
const data = [
  { day: "S", done: 42, wip: 18 },
  { day: "M", done: 64, wip: 22 },
  { day: "T", done: 51, wip: 30 },
  { day: "W", done: 88, wip: 24 },
  { day: "T", done: 73, wip: 35 },
  { day: "F", done: 60, wip: 28 },
  { day: "S", done: 38, wip: 14 },
];

const VIOLET = "#6B21C8";
const ORANGE = "#E8650A";

export function ActivityChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-bold text-lg text-[#1a1a1a]">Activité Hebdomadaire</h3>
          <p className="text-sm text-gray-400">Pièces confectionnées par jour</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-[#6B21C8]" /> Activité hebdomadaire
        </span>
      </div>

      <div className="flex-1 min-h-[200px] mt-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={4} barCategoryGap="22%">
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <Bar dataKey="done" radius={[6, 6, 6, 6]} barSize={14}>
              {data.map((_, i) => <Cell key={i} fill={VIOLET} />)}
            </Bar>
            <Bar dataKey="wip" radius={[6, 6, 6, 6]} barSize={14}>
              {data.map((_, i) => <Cell key={i} fill={ORANGE} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
        <span className="text-sm text-gray-500">Moyenne : <strong className="text-[#1a1a1a]">62%</strong></span>
        <span className="text-sm font-semibold text-[#E8650A]">Pic : 88%</span>
      </div>
    </div>
  );
}
