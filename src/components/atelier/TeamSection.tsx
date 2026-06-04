import { Plus } from "lucide-react";

type Status = "Terminé" | "En cours" | "En attente";

interface Member {
  initials: string;
  name: string;
  task: string;
  status: Status;
  avatar: string;
}

const MEMBERS: Member[] = [
  { initials: "SA", name: "Sara Ait", task: "Patron robe de soirée", status: "Terminé", avatar: "bg-[#6B21C8]" },
  { initials: "NB", name: "Nadia Bel", task: "Assemblage veste en laine", status: "En cours", avatar: "bg-[#E8650A]" },
  { initials: "KM", name: "Kenza M.", task: "Broderie col kimono", status: "En attente", avatar: "bg-[#9333ea]" },
  { initials: "HZ", name: "Houria Z.", task: "Doublure manteau", status: "En cours", avatar: "bg-[#db2777]" },
];

const STATUS_STYLES: Record<Status, string> = {
  "Terminé": "bg-green-100 text-green-700",
  "En cours": "bg-[#ede9fe] text-[#6B21C8]",
  "En attente": "bg-[#fff0e6] text-[#E8650A]",
};

export function TeamSection() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-[#1a1a1a]">Collaboration Atelier</h3>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B21C8] border border-[#ede9fe] hover:bg-[#ede9fe] px-3 py-1.5 rounded-full transition-colors">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {MEMBERS.map((m) => (
          <div key={m.name} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-50 transition-colors">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${m.avatar}`}>
              {m.initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1a1a] truncate">{m.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.task}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[m.status]}`}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
