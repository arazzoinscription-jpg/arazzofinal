import { Plus } from "lucide-react";

interface Order {
  emoji: string;
  name: string;
  client: string;
  due: string;
  tint: string;
}

const ORDERS: Order[] = [
  { emoji: "👗", name: "Robe de mariée", client: "Mme Amira", due: "15 jan", tint: "bg-[#ede9fe]" },
  { emoji: "🧥", name: "Manteau laine", client: "Mme Souhila", due: "18 jan", tint: "bg-[#fff0e6]" },
  { emoji: "👘", name: "Caftan brodé", client: "Mme Leila", due: "20 jan", tint: "bg-[#ede9fe]" },
  { emoji: "🪡", name: "Costume sur mesure", client: "M. Yacine", due: "22 jan", tint: "bg-[#fff0e6]" },
  { emoji: "✂️", name: "Retouche robe", client: "Mme Nour", due: "25 jan", tint: "bg-[#ede9fe]" },
];

export function OrderList() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-[#1a1a1a]">Commandes</h3>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B21C8] bg-[#ede9fe] hover:bg-[#ddd6fe] px-3 py-1.5 rounded-full transition-colors">
          <Plus size={14} /> Nouvelle
        </button>
      </div>

      <div className="space-y-1">
        {ORDERS.map((o) => (
          <div key={o.name} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-50 transition-colors">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${o.tint}`}>{o.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1a1a] truncate">{o.name}</p>
              <p className="text-xs text-gray-400 truncate">{o.client}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">Livraison : {o.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
