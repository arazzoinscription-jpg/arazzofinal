import { Search, Mail, Bell, Plus, Download } from "lucide-react";
import { Sidebar } from "@/components/atelier/Sidebar";
import { StatCard } from "@/components/atelier/StatCard";
import { ActivityChart } from "@/components/atelier/ActivityChart";
import { DonutChart } from "@/components/atelier/DonutChart";
import { OrderList } from "@/components/atelier/OrderList";
import { TeamSection } from "@/components/atelier/TeamSection";
import { TimeTracker } from "@/components/atelier/TimeTracker";
import { CoinShootingCard } from "@/components/atelier/CoinShootingCard";

export const metadata = { title: "Atelier — Tableau de bord" };

export default function AtelierPage() {
  return (
    <div className="min-h-screen bg-[#faf7ff]">
      <Sidebar />

      <div className="lg:ml-60 min-w-0">
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-[#faf7ff]/80 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-md mx-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher une commande..."
              className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/30 shadow-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6B21C8] transition-colors">
              <Mail size={18} />
            </button>
            <button className="relative w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6B21C8] transition-colors">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-9 h-9 rounded-full bg-[#6B21C8] text-white text-sm font-semibold flex items-center justify-center">AA</span>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-[#1a1a1a]">Atelier Arazzo</p>
                <p className="text-xs text-gray-400">contact@arazzo.shop</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Contenu ── */}
        <main className="px-4 lg:px-8 pb-10 pt-2 space-y-6">
          {/* Titre + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#1a1a1a]">Tableau de bord</h1>
              <p className="text-gray-500 mt-1">Gérez vos commandes et votre atelier avec facilité.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 bg-[#6B21C8] hover:bg-[#5a1aad] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                <Plus size={16} /> Nouvelle Commande
              </button>
              <button className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Download size={16} /> Importer
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Commandes" value={38} trend="Hausse ce mois" highlighted />
            <StatCard title="Commandes Livrées" value={15} trend="Hausse ce mois" />
            <StatCard title="En Cours" value={19} trend="Hausse ce mois" />
            <StatCard title="En Attente" value={4} trend="En discussion" />
          </div>

          {/* Activité + Essayages */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3"><ActivityChart /></div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                <h3 className="font-bold text-lg text-[#1a1a1a] mb-4">Essayages</h3>
                <div className="rounded-xl bg-[#faf7ff] border border-[#ede9fe] p-4">
                  <p className="text-sm font-semibold text-[#1a1a1a]">Essayage avec Mme Karima</p>
                  <p className="text-xs text-gray-400 mt-1">10h00 — 11h30</p>
                  <button className="mt-4 w-full bg-[#1e0a3c] hover:bg-[#2a0f52] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    Rejoindre
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Équipe + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3"><TeamSection /></div>
            <div className="lg:col-span-2"><DonutChart /></div>
          </div>

          {/* Commandes + Coin Shooting + Minuterie */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-4"><OrderList /></div>
            <div className="lg:col-span-3"><CoinShootingCard /></div>
            <div className="lg:col-span-3"><TimeTracker /></div>
          </div>
        </main>
      </div>
    </div>
  );
}
