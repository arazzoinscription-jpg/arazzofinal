"use client";

import { useState } from "react";
import type { CarteEleve, FiltresClasse } from "@/lib/classe/vue";
import type { CodeNiveau } from "@/lib/student-care/levels";
import { EspaceCommande, type GroupeCommande, type NiveauCommande } from "./espace-commande";
import { GrilleClasse } from "./grille";

/** Le niveau choisi est PARTAGÉ : il filtre la grille et cible les actions collectives de l'Espace de commande. */
export function ClasseInteractive({ base, cartes, initiaux, niveaux, groupes, groupeCourant, direct, serviceEmail, milieu, vide }: {
  base: string;
  cartes: CarteEleve[];
  initiaux: FiltresClasse;
  niveaux: NiveauCommande[];
  groupes: GroupeCommande[];
  groupeCourant: string | null;
  direct: { titre: string } | null;
  serviceEmail: boolean;
  /** Contenu serveur placé entre l'Espace de commande et la grille (groupes, avertissements). */
  milieu?: React.ReactNode;
  /** Affiché à la place de la grille quand la classe est vide. */
  vide?: React.ReactNode;
}) {
  const [niveau, setNiveau] = useState<CodeNiveau | null>(initiaux.niveau);
  const eleves = cartes.map((c) => ({ id: c.id, nom: c.nom, niveaux: c.niveaux })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return (
    <>
      <EspaceCommande
        base={base} niveaux={niveaux} niveau={niveau} changerNiveau={setNiveau}
        eleves={eleves} groupes={groupes} groupeCourant={groupeCourant} direct={direct} serviceEmail={serviceEmail}
      />
      {milieu}
      {cartes.length === 0 ? vide : <GrilleClasse base={base} cartes={cartes} initiaux={initiaux} niveauPartage={{ valeur: niveau, changer: setNiveau }} />}
    </>
  );
}
