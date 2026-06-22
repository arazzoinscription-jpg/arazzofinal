"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function VisitsChart({ data }: { data: { day: string; visites: number; visiteurs: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gVisites" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FE7223" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FE7223" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gVisiteurs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B16F9" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#5B16F9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DED4" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9b96a8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9b96a8" }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E8DED4", fontSize: 12, fontFamily: "inherit" }}
          labelStyle={{ fontWeight: 600, color: "#2a1245" }}
        />
        <Area type="monotone" dataKey="visites" name="Pages vues" stroke="#FE7223" strokeWidth={2} fill="url(#gVisites)" />
        <Area type="monotone" dataKey="visiteurs" name="Visiteurs" stroke="#5B16F9" strokeWidth={2} fill="url(#gVisiteurs)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
