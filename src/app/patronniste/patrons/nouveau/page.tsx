import { PatronForm } from "../patron-form";

export const metadata = { title: "Nouveau patron — Patronniste" };

export default function NouveauPatronPage() {
  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Nouveau patron</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Renseignez les informations, attributs et fichiers.</p>
      <PatronForm />
    </div>
  );
}
