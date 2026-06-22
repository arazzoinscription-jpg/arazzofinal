"use client";

import { useEffect, useState } from "react";
import { ChevronsRight } from "lucide-react";

/**
 * Bouton « replier / déployer » la sidebar desktop.
 * État partagé via l'attribut `data-sidebar` sur <html> (lu par le CSS) + localStorage.
 * Tout le reste (largeur, marge, masquage des libellés) est géré en CSS.
 */
export function SidebarToggle({ labelHide = "Replier", labelShow = "Déployer" }: { labelHide?: string; labelShow?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
    try { localStorage.setItem("arazzo-sidebar", next ? "collapsed" : "expanded"); } catch { /* ignore */ }
  }

  return (
    <div className="p-3 border-t border-white/10">
      <button
        onClick={toggle}
        aria-label={collapsed ? labelShow : labelHide}
        aria-expanded={!collapsed}
        className="nav-center w-full flex items-center gap-3 px-1.5 py-2 rounded-xl text-white/55 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
      >
        <span className="grid w-6 place-content-center flex-shrink-0">
          <ChevronsRight size={18} className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`} />
        </span>
        <span className="nav-label">{collapsed ? labelShow : labelHide}</span>
      </button>
    </div>
  );
}
