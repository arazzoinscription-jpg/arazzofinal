"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Livrées", value: 41, color: "#6B21C8" },
  { name: "En cours", value: 38, color: "#E8650A" },
  { name: "En attente", value: 21, color: "#ddd6fe" },
];

export function DonutChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="font-bold text-lg text-[#1a1a1a] mb-4">Progression des Commandes</h3>

      <div className="relative flex-1 flex items-center justify-center min-h-[200px]">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Texte central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-[#1a1a1a]">41%</span>
          <span className="text-sm text-gray-400">Livrées</span>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
