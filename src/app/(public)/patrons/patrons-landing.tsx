"use client";

/**
 * Landing PATRONS — port fidèle de la vitrine d'Arazzo OS (`patrons-arazzo`).
 * Carrousel coverflow 3D, 2 choix (existant / sur mesure), grille, modale
 * d'achat (format + tailles + preuve), formulaire sur mesure. Styles « pa- ».
 *
 * Différence : données via prop `data` (instantané poussé par l'OS, lu dans
 * Supabase) ; l'achat et la demande sur-mesure DÉPOSENT une commande dans
 * Supabase (server actions) que l'OS rapatrie au clic « Synchroniser ». Pas de
 * coupon (reporté), pas de section consultation (natif OS).
 */

import { useEffect, useRef, useState } from "react";
import { submitPatronOrder } from "@/app/actions/patron-order";
import { submitCustomPatronOrder } from "@/app/actions/patron-custom-order";

type Patron = Record<string, any>;

const FORMATS = [
  { id: "pdf", label: "PDF à imprimer", desc: "A4 + A0 · accès immédiat dans « Mes patrons »" },
  { id: "a0", label: "Imprimé A0 (livré)", desc: "Grand format papier · livraison à domicile" },
  { id: "placement", label: "Placement sur mesure", desc: "Optimisé selon votre table & tissu" },
];

function utmDeLURL(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = p.get(k); if (v) out[k] = v;
  }
  return out;
}

function plageTailles(sizes: any): string | null {
  if (!Array.isArray(sizes) || !sizes.length) return null;
  const nums = sizes.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  if (nums.length) return `${Math.min(...nums)}-${Math.max(...nums)}`;
  return sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : String(sizes[0]);
}
function specsDuPatron(p: Patron): [string, string][] {
  const out: [string, string][] = [];
  const plage = plageTailles(p.sizes);
  if (plage) out.push(["Tailles disponibles", plage]);
  if (p.tissu) out.push(["Tissus conseillés", p.tissu]);
  const fmt = p.format_fiche || (p.nb_pages ? `${p.nb_pages} pages` : null);
  if (fmt) out.push(["Format", p.format_fiche && p.nb_pages ? `${p.format_fiche} · ${p.nb_pages} p.` : fmt]);
  return out;
}
function totalLocal(unit: number, count: number, discountPercent: number, freeThreshold = 3): number {
  const u = Number(unit) || 0;
  const n = Math.max(0, count);
  const full = Math.min(n, freeThreshold);
  const extra = Math.max(0, n - freeThreshold);
  return Math.round(full * u + extra * u * (1 - (Number(discountPercent) || 0) / 100));
}

export default function PatronsLanding({ data }: { data: any }) {
  const hero: Patron[] = data?.hero ?? [];
  const grid: Patron[] = data?.grid ?? [];
  const settings = data?.settings ?? {};
  const paymentMethods = data?.payment_methods ?? [];
  const [achat, setAchat] = useState<Patron | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="pa" dir="ltr">
      <PatronsStyles />

      <header className="pa-hero">
        <div className="pa-hero-in">
          <div className="pa-marque">
            <a href="/offres" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pa-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
              <span className="pa-marque-nom">Arazzo <em>Patrons</em></span>
            </a>
          </div>
          <h1 className="pa-titre">Patrons <em>Arazzo</em></h1>
          <p className="pa-tagline">Des patrons prêts à coudre ou créés selon votre modèle.</p>
          {hero.length ? <HeroCarousel items={hero} onChoose={(p) => setAchat(p)} /> : null}
        </div>
      </header>

      <div className="pa-wrap">
        {data?.note ? <div className="pa-note">{data.note}</div> : null}

        <section className="pa-choix">
          <article className="pa-carte">
            <div className="pa-carte-ico" aria-hidden="true">🛍️</div>
            <h2>Je veux un patron existant</h2>
            <p>Choisissez un patron ci-dessous, réglez et recevez votre accès — sans quitter cette page.</p>
            <button type="button" className="pa-cta"
              onClick={() => document.getElementById("pa-modeles")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Voir les patrons
            </button>
          </article>
          <article className="pa-carte pa-carte-alt">
            <div className="pa-carte-ico" aria-hidden="true">✨</div>
            <h2>Je veux mon patron sur mesure</h2>
            <p>Vous avez une photo ou un modèle précis ? Envoyez-nous votre modèle et nous étudierons votre demande.</p>
            <button type="button" className="pa-cta pa-cta-orange"
              onClick={() => { setShowForm(true); setTimeout(() => document.getElementById("pa-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }}>
              Envoyer mon modèle
            </button>
          </article>
        </section>

        {showForm ? <SurMesureForm onClose={() => setShowForm(false)} /> : null}

        {grid.length ? (
          <section className="pa-modeles" id="pa-modeles">
            <h2 className="pa-h2">Quelques modèles</h2>
            <div className="pa-grid">
              {grid.map((p) => (
                <article key={p.id} className="pa-model">
                  <button type="button" className="pa-model-media" onClick={() => setAchat(p)} aria-label={`Choisir ${p.titre ?? "ce patron"}`}>
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.titre ?? "Patron"} loading="lazy" decoding="async" />
                    ) : <span aria-hidden="true" className="pa-model-vide" />}
                  </button>
                  <div className="pa-model-body">
                    <div className="pa-model-nom">{p.titre ?? "Patron"}</div>
                    {p.sizes?.length && p.unit_price_dzd != null
                      ? <div className="pa-model-prix">{p.unit_price_dzd} DA <span style={{ fontSize: ".72em", fontWeight: 600, color: "#8a80a0" }}>/ taille</span></div>
                      : (p.prix ? <div className="pa-model-prix">{p.prix}</div> : null)}
                    <button type="button" className="pa-cta" onClick={() => setAchat(p)}>Choisir ce patron</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="pa-placement">
          <div className="pa-placement-ico" aria-hidden="true">📐</div>
          <div>
            <h2>Vous voulez personnaliser un modèle ?</h2>
            <p>Besoin d’une modification ou d’une personnalisation ? Découvrez notre service dédié.</p>
          </div>
          <button type="button" className="pa-cta pa-cta-ghost"
            onClick={() => { setShowForm(true); setTimeout(() => document.getElementById("pa-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }}>
            Demander une personnalisation
          </button>
        </section>

        <p className="pa-pied">Arazzo · École de couture — vos patrons dans votre espace « Mes patrons ».</p>
      </div>

      {achat ? <PurchaseModal patron={achat} settings={settings} paymentMethods={paymentMethods} onClose={() => setAchat(null)} /> : null}
    </div>
  );
}

function HeroCarousel({ items, onChoose }: { items: Patron[]; onChoose: (p: Patron) => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pause = useRef(false);
  const [active, setActive] = useState(0);
  const [spacing, setSpacing] = useState(130);
  const n = items.length;

  useEffect(() => {
    const maj = () => {
      const w = stageRef.current?.offsetWidth ?? 340;
      setSpacing(Math.max(92, Math.min(175, w * 0.33)));
    };
    maj();
    window.addEventListener("resize", maj);
    return () => window.removeEventListener("resize", maj);
  }, []);

  useEffect(() => {
    if (n <= 1) return undefined;
    const id = setInterval(() => { if (!pause.current) setActive((a) => (a + 1) % n); }, 1000);
    return () => clearInterval(id);
  }, [n]);

  const allerA = (k: number) => setActive((((k % n) + n) % n));
  const tourner = (sens: "prev" | "next") => setActive((a) => (((a + (sens === "prev" ? -1 : 1)) % n) + n) % n);
  const offsetOf = (k: number) => { let d = (((k - active) % n) + n) % n; if (d > n / 2) d -= n; return d; };

  const p = items[active];
  if (!p) return null;

  return (
    <div className="pa-cf-wrap" onMouseEnter={() => { pause.current = true; }} onMouseLeave={() => { pause.current = false; }}>
      <div className="pa-cf-stage" ref={stageRef}>
        {items.map((it, k) => {
          const o = offsetOf(k); const abs = Math.abs(o); const cache = abs > 3;
          return (
            <button type="button" key={it.id} className="pa-cf-card" data-active={o === 0 ? "true" : undefined}
              style={{
                transform: `translate(-50%, -50%) translateX(${o * spacing}px) translateZ(${-abs * 70}px) rotateY(${-o * 42}deg) scale(${Math.max(0.6, 1 - abs * 0.16)})`,
                opacity: cache ? 0 : 1 - abs * 0.2, zIndex: 100 - abs, pointerEvents: cache ? "none" : "auto",
              }}
              onClick={() => (o === 0 ? onChoose(it) : allerA(k))} aria-label={it.titre ?? `Patron ${k + 1}`}>
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.titre ?? "Patron"} loading="lazy" decoding="async" />
              ) : <span aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="pa-slide-info">
        <div className="pa-slide-nom">{p.titre ?? "Patron"}</div>
        {p.sizes?.length && p.unit_price_dzd != null
          ? <div className="pa-slide-prix">{p.unit_price_dzd} DA <span style={{ fontSize: ".7em", fontWeight: 600 }}>/ taille</span></div>
          : (p.prix ? <div className="pa-slide-prix">{p.prix}</div> : null)}
        <button type="button" className="pa-cta pa-cta-orange" onClick={() => onChoose(p)}>Choisir ce patron</button>
      </div>
      {n > 1 ? (
        <>
          <button type="button" className="pa-nav pa-nav-prev" onClick={() => tourner("prev")} aria-label="Précédent">‹</button>
          <button type="button" className="pa-nav pa-nav-next" onClick={() => tourner("next")} aria-label="Suivant">›</button>
          <div className="pa-dots">
            {items.map((it, k) => (
              <button key={it.id} type="button" className="pa-dot" data-on={k === active ? "true" : undefined} onClick={() => allerA(k)} aria-label={`Patron ${k + 1}`} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PurchaseModal({ patron, settings, paymentMethods, onClose }: {
  patron: Patron; settings: any; paymentMethods: any[]; onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [format, setFormat] = useState("pdf");
  const [sizes, setSizes] = useState<string[]>([]);
  const [v, setV] = useState({ nom: "", whatsapp: "", email: "", address: "", city: "" });
  const [pl, setPl] = useState({ table_length: "", table_width: "", fabric_width: "", fabric: "", note: "" });
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const dispoSizes: string[] = patron.sizes ?? [];
  const unit = patron.unit_price_dzd ?? null;
  const remise = settings?.extra_size_discount_percent ?? 0;
  const seuil = settings?.free_size_threshold ?? 3;
  const total = unit != null ? totalLocal(unit, dispoSizes.length ? sizes.length : 1, remise, seuil) : null;

  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  const setP = (k: string, val: string) => setPl((s) => ({ ...s, [k]: val }));
  const basculerTaille = (t: string) => setSizes((cs) => (cs.includes(t) ? cs.filter((x) => x !== t) : [...cs, t]));

  function versPaiement(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (dispoSizes.length && sizes.length === 0) { setErreur("Choisissez au moins une taille."); return; }
    if (!v.nom.trim() || !v.whatsapp.trim() || !v.email.trim()) { setErreur("Merci d’indiquer votre nom, votre WhatsApp et votre e-mail."); return; }
    if (format === "a0" && !v.address.trim()) { setErreur("Une adresse de livraison est nécessaire pour l’imprimé A0."); return; }
    if (format === "placement" && (!pl.table_length.trim() || !pl.table_width.trim() || !pl.fabric_width.trim())) {
      setErreur("Indiquez la longueur et la largeur de votre table, et la laize de votre tissu."); return;
    }
    setStep("pay");
  }

  async function televerser(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErreur(null); setBusy(true);
    try {
      const r = await fetch("/api/patron-upload", { method: "POST", body: f });
      const j = await r.json();
      if (r.ok) setProofUrl(j.url); else setErreur("Envoi de la preuve impossible");
    } catch { setErreur("Envoi de la preuve impossible"); } finally { setBusy(false); }
  }

  async function confirmer() {
    if (!proofUrl) { setErreur("Merci de joindre la preuve de paiement."); return; }
    setErreur(null); setBusy(true);
    try {
      const res = await submitPatronOrder({
        patron_id: String(patron.id),
        patron_title: patron.titre ?? undefined,
        format,
        first_name: v.nom.trim(),
        phone: v.whatsapp.trim(),
        email: v.email.trim(),
        address: v.address.trim() || undefined,
        city: v.city.trim() || undefined,
        sizes,
        placement: format === "placement" ? {
          table_length_cm: pl.table_length.trim(),
          table_width_cm: pl.table_width.trim(),
          fabric_width_cm: pl.fabric_width.trim(),
          fabric: pl.fabric.trim(),
          note: pl.note.trim(),
        } : undefined,
        proof_url: proofUrl,
        amount: total ?? undefined,
        method: "transfer",
        lang: "fr",
        utm: utmDeLURL(),
      });
      if (!res.ok) { setErreur(res.error || "Envoi impossible."); return; }
      setStep("done");
    } catch { setErreur("Envoi impossible."); } finally { setBusy(false); }
  }

  const prixLabel = total != null ? `${total} DZD` : (patron.prix ?? null);

  return (
    <div className="pa-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pa-modal-box">
        <div className="pa-modal-tete">
          <div>
            <div className="pa-modal-titre">{patron.titre ?? "Patron"}</div>
            {prixLabel ? <div className="pa-slide-prix" style={{ fontSize: "1rem" }}>{prixLabel}</div> : null}
          </div>
          <button type="button" className="pa-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="pa-steps">
          <span data-on={step === "form" ? "true" : undefined}>1. Commande</span>
          <span data-on={step === "pay" ? "true" : undefined}>2. Paiement</span>
          <span data-on={step === "done" ? "true" : undefined}>3. Accès</span>
        </div>

        {step === "form" && (
          <form className="pa-form" onSubmit={versPaiement}>
            {specsDuPatron(patron).length ? (
              <dl className="pa-specs">
                {specsDuPatron(patron).map(([label, valeur]) => (
                  <div className="pa-spec" key={label}><dt>{label}</dt><dd>{valeur}</dd></div>
                ))}
              </dl>
            ) : null}
            {dispoSizes.length ? (
              <div className="pa-field">
                <span>Tailles {unit != null ? <em>({unit} DA / taille{remise > 0 ? `, -${remise}% dès la 4ᵉ` : ""})</em> : null}</span>
                <div className="pa-tailles">
                  {dispoSizes.map((t) => (
                    <button type="button" key={t} className="pa-taille" data-on={sizes.includes(t) ? "true" : undefined} onClick={() => basculerTaille(t)}>{t}</button>
                  ))}
                </div>
                {sizes.length ? (
                  <div className="pa-total"><span>{sizes.length} taille{sizes.length > 1 ? "s" : ""}</span><strong>{total} DZD</strong></div>
                ) : <em className="pa-aide">Choisissez une ou plusieurs tailles.</em>}
              </div>
            ) : null}
            <div className="pa-field">
              <span>Format</span>
              <div className="pa-formats">
                {FORMATS.map((f) => (
                  <button type="button" key={f.id} className="pa-format" data-on={format === f.id ? "true" : undefined} onClick={() => setFormat(f.id)}>
                    <strong>{f.label}</strong><small>{f.desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="pa-field"><span>Nom *</span>
              <input value={v.nom} required placeholder="Votre nom" onChange={(e) => set("nom", e.target.value)} />
            </label>
            <label className="pa-field"><span>WhatsApp *</span>
              <input type="tel" value={v.whatsapp} required placeholder="0X XX XX XX XX" onChange={(e) => set("whatsapp", e.target.value)} />
            </label>
            <label className="pa-field"><span>E-mail * <em>(pour votre accès « Mes patrons »)</em></span>
              <input type="email" value={v.email} required placeholder="vous@exemple.com" onChange={(e) => set("email", e.target.value)} />
            </label>
            {format === "a0" ? (
              <>
                <label className="pa-field"><span>Adresse de livraison *</span>
                  <input value={v.address} required placeholder="Rue, quartier…" onChange={(e) => set("address", e.target.value)} />
                </label>
                <label className="pa-field"><span>Ville / Wilaya</span>
                  <input value={v.city} placeholder="Sétif" onChange={(e) => set("city", e.target.value)} />
                </label>
              </>
            ) : null}
            {format === "placement" ? (
              <div className="pa-placement-box">
                <p className="pa-placement-lede">📐 Placement optimisé selon les dimensions de votre table de coupe et la laize de votre rouleau de tissu.</p>
                <div className="pa-placement-grid">
                  <label className="pa-field"><span>Longueur de la table (cm) *</span>
                    <input type="number" inputMode="numeric" min="1" value={pl.table_length} required placeholder="Ex. 200" onChange={(e) => setP("table_length", e.target.value)} />
                  </label>
                  <label className="pa-field"><span>Largeur de la table (cm) *</span>
                    <input type="number" inputMode="numeric" min="1" value={pl.table_width} required placeholder="Ex. 90" onChange={(e) => setP("table_width", e.target.value)} />
                  </label>
                </div>
                <label className="pa-field"><span>Laize du tissu / rouleau (cm) *</span>
                  <input type="number" inputMode="numeric" min="1" value={pl.fabric_width} required placeholder="Ex. 140" onChange={(e) => setP("fabric_width", e.target.value)} />
                </label>
                <label className="pa-field"><span>Tissu / matière</span>
                  <input value={pl.fabric} placeholder="Ex. crêpe, satin…" onChange={(e) => setP("fabric", e.target.value)} />
                </label>
                <label className="pa-field"><span>Note <em>(optionnel)</em></span>
                  <textarea value={pl.note} placeholder="Précisions…" onChange={(e) => setP("note", e.target.value)} />
                </label>
              </div>
            ) : null}
            {erreur ? <div className="pa-erreur">{erreur}</div> : null}
            <button type="submit" className="pa-cta pa-cta-orange">
              {format === "placement" ? "Continuer — demander mon placement" : (total != null ? `Continuer — ${total} DZD` : "Continuer vers le paiement")}
            </button>
          </form>
        )}

        {step === "pay" && (
          <div className="pa-form">
            <p className="pa-lede">Réglez <strong>{prixLabel ?? "le montant"}</strong> par l’un des moyens ci-dessous, puis envoyez la photo de votre reçu.</p>
            <div className="pa-pay">
              {paymentMethods.length ? paymentMethods.map((m: any, k: number) => (
                <div className="pa-pay-m" key={k}>
                  <div className="pa-pay-nom">{m.label || m.kind}</div>
                  {(m.fields ?? []).map((f: any, j: number) => (
                    <div className="pa-pay-l" key={j}><span>{f.label}</span><strong>{f.value}</strong></div>
                  ))}
                  {m.note ? <div className="pa-pay-note">{m.note}</div> : null}
                </div>
              )) : <p className="pa-aide">Les informations de paiement vous seront communiquées sur WhatsApp.</p>}
            </div>
            <label className="pa-field"><span>Preuve de paiement (photo ou PDF) *</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={televerser} disabled={busy} />
              {proofUrl ? <em className="pa-aide">✓ Preuve jointe.</em> : null}
            </label>
            {erreur ? <div className="pa-erreur">{erreur}</div> : null}
            <button type="button" className="pa-cta pa-cta-orange" onClick={confirmer} disabled={busy || !proofUrl}>
              {busy ? "Envoi…" : "J’ai payé — envoyer ma preuve"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="pa-merci">
            <div className="pa-check">✓</div>
            <h2>Preuve bien reçue 🌸</h2>
            <p>Dès que nous aurons vérifié votre paiement, votre patron s’ouvrira dans votre espace <strong>« Mes patrons »</strong> et vous recevrez un e-mail d’accès (identifiants inclus).</p>
            <button type="button" className="pa-cta" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SurMesureForm({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({ nom: "", whatsapp: "", email: "", message: "" });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fini, setFini] = useState(false);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function televerser(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErreur(null); setEnvoiPhoto(true);
    try {
      const r = await fetch("/api/patron-upload", { method: "POST", body: f });
      const j = await r.json();
      if (r.ok) setPhotoUrl(j.url); else setErreur("Envoi de la photo impossible");
    } catch { setErreur("Envoi de la photo impossible"); } finally { setEnvoiPhoto(false); }
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!v.nom.trim() || !v.whatsapp.trim() || !v.email.trim()) { setErreur("Merci d’indiquer votre nom, votre WhatsApp et votre e-mail."); return; }
    if (!photoUrl) { setErreur("Merci de joindre une photo du modèle."); return; }
    setEnvoi(true);
    try {
      const res = await submitCustomPatronOrder({
        first_name: v.nom.trim(), phone: v.whatsapp.trim(), email: v.email.trim(),
        photo_url: photoUrl, message: v.message.trim() || undefined, lang: "fr", utm: utmDeLURL(),
      });
      if (!res.ok) { setErreur(res.error || "Envoi impossible."); return; }
      setFini(true);
    } catch { setErreur("Envoi impossible."); } finally { setEnvoi(false); }
  }

  if (fini) {
    return (
      <section id="pa-form" className="pa-form-box pa-form-merci">
        <div className="pa-check">✓</div>
        <h2>Votre demande a bien été envoyée.</h2>
        <p>Vous allez recevoir un e-mail avec l’accès à votre espace, où vous suivrez la <strong>proposition de prix</strong> puis l’<strong>état</strong> de votre demande.</p>
      </section>
    );
  }

  return (
    <section id="pa-form" className="pa-form-box">
      <div className="pa-form-tete">
        <h2 className="pa-h2" style={{ margin: 0 }}>Mon patron sur mesure</h2>
        <button type="button" className="pa-x" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
      <form className="pa-form" onSubmit={envoyer}>
        <label className="pa-field"><span>Nom *</span>
          <input value={v.nom} required placeholder="Votre nom" onChange={(e) => set("nom", e.target.value)} />
        </label>
        <label className="pa-field"><span>WhatsApp *</span>
          <input type="tel" value={v.whatsapp} required placeholder="0X XX XX XX XX" onChange={(e) => set("whatsapp", e.target.value)} />
        </label>
        <label className="pa-field"><span>E-mail * <em>(pour votre espace de suivi)</em></span>
          <input type="email" value={v.email} required placeholder="vous@exemple.com" onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="pa-field"><span>Photo du modèle *</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={televerser} disabled={envoiPhoto} />
          {envoiPhoto ? <em className="pa-aide">Envoi de la photo…</em> : null}
          {photoUrl ? <em className="pa-aide">✓ Photo jointe.</em> : null}
        </label>
        <label className="pa-field"><span>Message <em>(facultatif)</em></span>
          <textarea value={v.message} placeholder="Expliquez-nous brièvement ce que vous souhaitez." onChange={(e) => set("message", e.target.value)} />
        </label>
        {erreur ? <div className="pa-erreur">{erreur}</div> : null}
        <button type="submit" className="pa-cta pa-cta-orange" disabled={envoi || envoiPhoto}>
          {envoi ? "Envoi…" : "Envoyer ma demande"}
        </button>
      </form>
    </section>
  );
}

function PatronsStyles() {
  return (
    <style>{`
.pa {
  position: fixed; inset: 0; z-index: 200; overflow-y: auto;
  --pa-violet: #2A0880; --pa-violet2: #5B16F9; --pa-orange: #FE7223;
  --pa-panel: #ffffff; --pa-ground: #faf8ff; --pa-ink: #1c1330;
  --pa-ink2: #4b4266; --pa-ink3: #8a80a0; --pa-hair: #e7e1f7; --pa-soft: #f1ecfe;
  --pa-radius: 18px; --pa-radius-xl: 24px; color: var(--pa-ink);
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--pa-orange) 8%, transparent), transparent 60%),
    radial-gradient(120% 90% at 0% 20%, var(--pa-soft), transparent 55%), var(--pa-ground);
  min-height: 100vh;
  font-family: var(--font-body, "DM Sans", system-ui, sans-serif); -webkit-font-smoothing: antialiased;
}
.pa * { box-sizing: border-box; }
.pa :where(button) { background: transparent; color: var(--pa-ink); box-shadow: none; border: none; }
.pa-hero {
  position: relative; overflow: hidden; color: #fff; text-align: center;
  background: radial-gradient(140% 120% at 12% -10%, #4a17c9 0%, #2A0880 52%, #22076b 100%);
  padding: clamp(28px, 6vw, 60px) 20px clamp(72px, 10vw, 116px); border-bottom: 3px solid var(--pa-orange);
}
.pa-hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: 26px; height: 0; border-top: 2px dashed color-mix(in srgb, var(--pa-orange) 75%, transparent); opacity: .5; }
.pa-hero::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .06; background-image: radial-gradient(#fff 1px, transparent 1.4px); background-size: 22px 22px; }
.pa-hero-in { max-width: 720px; margin: 0 auto; position: relative; z-index: 1; }
.pa-marque { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 12px; font-family: var(--font-heading, "Playfair Display", serif); font-weight: 700; font-size: 1.12rem; color: #fff; }
.pa-logo { width: 40px; height: 40px; border-radius: 11px; background: #fff; padding: 3px; box-shadow: 0 6px 16px -6px rgba(0,0,0,.4); }
.pa-marque-nom em { font-style: italic; color: var(--pa-orange); }
.pa-titre { font-family: var(--font-heading, "Playfair Display", Georgia, serif); font-size: clamp(2.1rem, 1.2rem + 4.4vw, 3.4rem); margin: 6px 0 0; font-weight: 600; line-height: 1.05; letter-spacing: -.01em; }
.pa-titre em { font-style: italic; color: var(--pa-orange); }
.pa-tagline { font-size: clamp(1rem, .95rem + .4vw, 1.18rem); color: rgba(255,255,255,.86); margin: 14px 0 18px; line-height: 1.6; }
.pa-cf-wrap { position: relative; margin-top: 10px; }
.pa-cf-stage { position: relative; width: min(440px, 94vw); height: min(300px, 70vw); margin: 0 auto; perspective: 1000px; contain: layout paint; }
.pa-cf-card { position: absolute; top: 50%; left: 50%; width: min(190px, 48vw); height: min(240px, 60vw); border: none; padding: 0; cursor: pointer; border-radius: 16px; overflow: hidden; background: #ffffff22; box-shadow: 0 8px 20px rgba(0,0,0,.3); transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .45s ease; will-change: transform, opacity; backface-visibility: hidden; }
.pa-cf-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pa-cf-card[data-active="true"] { box-shadow: 0 22px 54px rgba(0,0,0,.5); outline: 2px solid var(--pa-orange); }
.pa-slide-info { text-align: center; margin-top: 14px; position: relative; z-index: 5; color: #fff; }
.pa-slide-nom { font-family: var(--font-heading, "Playfair Display", serif); font-size: 1.35rem; font-weight: 700; color: #fff; }
.pa-slide-prix { color: var(--pa-orange); font-weight: 800; font-size: 1.2rem; margin: 4px 0 12px; }
.pa-nav { position: absolute; top: 42%; transform: translateY(-50%); background: #ffffffee; border: none; width: 40px; height: 40px; border-radius: 999px; font-size: 1.6rem; line-height: 1; color: var(--pa-violet); cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.2); z-index: 3; }
.pa-nav-prev { left: 0; } .pa-nav-next { right: 0; }
.pa-dots { display: flex; justify-content: center; gap: 7px; margin-top: 14px; }
.pa-dot { width: 9px; height: 9px; border-radius: 999px; border: none; background: #ffffff55; cursor: pointer; padding: 0; }
.pa-dot[data-on="true"] { background: var(--pa-orange); width: 22px; }
.pa-wrap { max-width: 720px; margin: 0 auto; padding: 0 20px 48px; position: relative; z-index: 1; margin-top: clamp(-56px, -7vw, -44px); }
.pa-note { background: color-mix(in srgb, var(--pa-orange) 8%, var(--pa-panel)); border: 1px solid color-mix(in srgb, var(--pa-orange) 30%, transparent); color: #8a2b12; padding: 12px 14px; border-radius: var(--pa-radius); }
.pa-cta { display: inline-block; text-align: center; text-decoration: none; border: none; cursor: pointer; font: inherit; font-weight: 700; color: #fff; padding: 13px 22px; border-radius: var(--pa-radius); background: linear-gradient(135deg, #FE7223, #f2520a); box-shadow: 0 16px 30px -14px color-mix(in srgb, var(--pa-orange) 75%, transparent); transition: transform .15s ease, box-shadow .2s ease, filter .2s ease; }
.pa-cta:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.04); }
.pa-cta:disabled { opacity: .6; cursor: default; box-shadow: none; }
.pa-cta-ghost { background: color-mix(in srgb, var(--pa-violet2) 6%, var(--pa-panel)); color: var(--pa-violet); border: 1.5px solid color-mix(in srgb, var(--pa-violet2) 30%, var(--pa-hair)); box-shadow: none; }
.pa-cta-ghost:hover { background: color-mix(in srgb, var(--pa-violet2) 12%, var(--pa-panel)); }
.pa-choix { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
.pa-carte, .pa-form-box, .pa-modeles-card { background: var(--pa-panel); border: 1px solid var(--pa-hair); border-radius: var(--pa-radius-xl); box-shadow: 0 24px 60px -28px color-mix(in srgb, var(--pa-violet) 45%, transparent); }
.pa-carte { padding: 24px 20px; text-align: center; }
.pa-carte-ico { font-size: 2.2rem; }
.pa-carte h2 { font-family: var(--font-heading, "Playfair Display", serif); font-size: 1.25rem; margin: 8px 0 6px; color: var(--pa-violet); }
.pa-carte p { color: var(--pa-ink2); font-size: .95rem; margin: 0 0 16px; line-height: 1.5; }
.pa-form-box { padding: 20px; margin-top: 18px; }
.pa-form-tete { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pa-x { background: var(--pa-soft); border: none; width: 34px; height: 34px; border-radius: 999px; font-size: 1.05rem; cursor: pointer; color: var(--pa-ink); flex: none; }
.pa-form { display: flex; flex-direction: column; gap: 14px; }
.pa-field { display: flex; flex-direction: column; gap: 6px; }
.pa-field > span { font-weight: 600; font-size: .86rem; color: var(--pa-ink2); }
.pa-field > span em { color: var(--pa-ink3); font-style: normal; font-weight: 400; }
.pa-field input, .pa-field textarea { border: 1.5px solid var(--pa-hair); border-radius: 12px; padding: 12px 14px; font: inherit; font-size: 16px; width: 100%; background: color-mix(in srgb, var(--pa-soft) 55%, var(--pa-panel)); color: var(--pa-ink); transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.pa-field input:focus, .pa-field textarea:focus { outline: none; border-color: var(--pa-violet2); background: var(--pa-panel); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pa-violet2) 18%, transparent); }
.pa-field textarea { min-height: 90px; resize: vertical; }
.pa-aide { font-size: .85rem; color: var(--pa-ink3); }
.pa-lede { font-size: .98rem; line-height: 1.6; margin: 0; color: var(--pa-ink2); }
.pa-erreur { background: color-mix(in srgb, #e0453a 10%, var(--pa-panel)); border: 1px solid color-mix(in srgb, #e0453a 35%, transparent); color: #b3271a; padding: 10px 12px; border-radius: 12px; font-size: .9rem; font-weight: 600; }
.pa-form-merci, .pa-merci { text-align: center; }
.pa-check { width: 64px; height: 64px; border-radius: 999px; display: grid; place-items: center; margin: 0 auto 12px; font-size: 1.9rem; color: #fff; background: linear-gradient(135deg, #16a34a, #0f7d3a); box-shadow: 0 16px 30px -14px rgba(22,163,74,.6); }
.pa-h2 { font-family: var(--font-heading, "Playfair Display", serif); font-size: 1.4rem; font-weight: 600; margin: 26px 0 14px; color: var(--pa-violet); display: flex; align-items: center; gap: 10px; line-height: 1.2; }
.pa-h2::before { content: ""; width: 10px; height: 10px; border-radius: 2px; background: var(--pa-orange); transform: rotate(45deg); flex: none; }
.pa-modeles { margin-top: 30px; }
.pa-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.pa-model { background: var(--pa-panel); border: 1px solid var(--pa-hair); border-radius: var(--pa-radius); overflow: hidden; display: flex; flex-direction: column; }
.pa-model-media { display: block; aspect-ratio: 4/5; background: var(--pa-soft); border: none; padding: 0; cursor: pointer; width: 100%; }
.pa-model-media img { width: 100%; height: 100%; object-fit: cover; }
.pa-model-vide { display: block; width: 100%; height: 100%; }
.pa-model-body { padding: 12px; text-align: center; display: flex; flex-direction: column; gap: 6px; }
.pa-model-nom { font-weight: 600; font-size: .95rem; }
.pa-model-prix { color: var(--pa-orange); font-weight: 800; }
.pa-model .pa-cta { padding: 9px 16px; font-size: .9rem; margin-top: 4px; }
.pa-placement { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 30px; padding: 20px; border-radius: var(--pa-radius-xl); background: color-mix(in srgb, var(--pa-orange) 7%, var(--pa-panel)); border: 1.5px solid color-mix(in srgb, var(--pa-orange) 30%, var(--pa-hair)); }
.pa-placement-ico { font-size: 2rem; }
.pa-placement h2 { font-family: var(--font-heading, "Playfair Display", serif); font-size: 1.2rem; margin: 0 0 4px; color: var(--pa-violet); }
.pa-placement p { margin: 0; color: var(--pa-ink2); font-size: .92rem; }
.pa-placement .pa-cta { margin-left: auto; }
.pa-pied { text-align: center; color: var(--pa-ink3); font-size: .82rem; margin-top: 34px; letter-spacing: .04em; }
.pa-modal { position: fixed; inset: 0; z-index: 300; background: rgba(20,8,60,.55); backdrop-filter: blur(3px); display: flex; align-items: flex-start; justify-content: center; padding: 4vh 14px; overflow-y: auto; }
.pa-modal-box { background: var(--pa-panel); border: 1px solid var(--pa-hair); border-radius: var(--pa-radius-xl); width: min(560px, 100%); padding: 22px; box-shadow: 0 30px 80px -30px rgba(0,0,0,.6); }
.pa-modal-tete { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.pa-modal-titre { font-family: var(--font-heading, "Playfair Display", serif); font-size: 1.35rem; font-weight: 700; color: var(--pa-violet); }
.pa-steps { display: flex; gap: 8px; margin-bottom: 16px; font-size: .78rem; }
.pa-steps span { flex: 1; text-align: center; padding: 6px 4px; border-radius: 999px; background: var(--pa-soft); color: var(--pa-ink3); font-weight: 600; }
.pa-steps span[data-on="true"] { background: var(--pa-violet2); color: #fff; }
.pa-specs { margin: 0 0 4px; display: flex; flex-direction: column; gap: 1px; border-radius: 12px; overflow: hidden; border: 1px solid var(--pa-hair); }
.pa-spec { display: flex; justify-content: space-between; gap: 10px; padding: 8px 12px; background: color-mix(in srgb, var(--pa-violet) 4%, var(--pa-panel)); }
.pa-spec dt { margin: 0; color: #8a80a0; font-size: .82rem; }
.pa-spec dd { margin: 0; font-weight: 700; font-size: .86rem; color: var(--pa-ink); text-align: right; }
.pa-placement-box { border: 1.5px solid color-mix(in srgb, var(--pa-orange) 35%, var(--pa-hair)); background: color-mix(in srgb, var(--pa-orange) 5%, var(--pa-panel)); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.pa-placement-lede { margin: 0; font-size: .88rem; line-height: 1.5; color: #8a4b12; font-weight: 600; }
.pa-placement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pa-formats { display: flex; flex-direction: column; gap: 8px; }
.pa-format { text-align: left; border: 1.5px solid var(--pa-hair); background: var(--pa-panel); border-radius: 12px; padding: 10px 12px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; color: var(--pa-ink); }
.pa-format[data-on="true"] { border-color: var(--pa-violet2); box-shadow: 0 0 0 2px color-mix(in srgb, var(--pa-violet2) 18%, transparent); }
.pa-format strong { font-size: .95rem; color: var(--pa-violet); } .pa-format small { color: var(--pa-ink3); font-size: .82rem; }
.pa-tailles { display: flex; flex-wrap: wrap; gap: 8px; }
.pa-taille { min-width: 44px; padding: 9px 12px; border: 1.5px solid var(--pa-hair); background: var(--pa-panel); border-radius: 10px; cursor: pointer; font: inherit; font-weight: 600; color: var(--pa-ink); }
.pa-taille[data-on="true"] { background: var(--pa-violet2); color: #fff; border-color: var(--pa-violet2); }
.pa-total { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--pa-orange) 10%, var(--pa-panel)); border-radius: 12px; }
.pa-total strong { color: var(--pa-orange); font-size: 1.15rem; }
.pa-pay { display: flex; flex-direction: column; gap: 10px; }
.pa-pay-m { background: color-mix(in srgb, var(--pa-soft) 55%, var(--pa-panel)); border-radius: 12px; padding: 12px 14px; }
.pa-pay-nom { font-weight: 700; color: var(--pa-violet); margin-bottom: 6px; }
.pa-pay-l { display: flex; justify-content: space-between; gap: 12px; font-size: .9rem; padding: 2px 0; }
.pa-pay-l strong { font-family: ui-monospace, monospace; color: var(--pa-violet); }
.pa-pay-note { font-size: .82rem; color: var(--pa-ink3); margin-top: 6px; }
@media (max-width: 560px) {
  .pa-hero { padding: 40px 16px 84px; }
  .pa-choix { grid-template-columns: 1fr; }
  .pa-placement-grid { grid-template-columns: 1fr; }
  .pa-grid { grid-template-columns: 1fr 1fr; }
  .pa-placement { flex-direction: column; align-items: flex-start; text-align: left; }
  .pa-placement .pa-cta { margin-left: 0; width: 100%; text-align: center; }
  .pa-nav { display: none; }
  .pa-modal { padding: 0; align-items: flex-end; }
  .pa-modal-box { width: 100%; border-radius: 22px 22px 0 0; max-height: 94vh; overflow-y: auto; padding: 18px 16px calc(20px + env(safe-area-inset-bottom, 0px)); }
  .pa-modal-titre { font-size: 1.25rem; }
  .pa-taille { min-width: 48px; padding: 11px 12px; }
  .pa-form > .pa-cta { width: 100%; padding: 15px 22px; font-size: 1rem; }
}
`}</style>
  );
}
