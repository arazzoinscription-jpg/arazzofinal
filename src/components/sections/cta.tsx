import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

export function CtaSection() {
  return (
    <section className="py-20 bg-blush-mesh">
      <div className="max-w-5xl mx-auto px-4">
        <Reveal animation="zoom">
        <div className="relative bg-gradient-to-br from-violet-DEFAULT via-violet-600 to-violet-800 rounded-3xl p-10 md:p-16 overflow-hidden text-center shadow-glow">
          {/* Décor */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-DEFAULT/15 -translate-y-1/3 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

          <div className="relative">
            <div className="text-5xl mb-5">✂️</div>
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Prête à passer du fil au design ?
            </h2>
            <p className="text-violet-200 text-lg mb-3 font-dm" dir="rtl">
              هل أنتِ مستعدّة للانتقال من الخيط إلى التصميم؟
            </p>

            {/* Garantie */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-9 mt-6">
              <span className="inline-flex items-center gap-2 text-white font-dm">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
                30 jours satisfaite ou remboursée
              </span>
              <span className="inline-flex items-center gap-2 text-white font-dm">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
                Première leçon offerte
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register"
                className="bg-orange-DEFAULT text-white px-9 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all hover:shadow-2xl hover:-translate-y-0.5 font-dm"
              >
                Créer mon compte
              </Link>
              <Link href="/devenir-formateur"
                className="bg-white/10 border-2 border-white/40 text-white px-9 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-violet-DEFAULT transition-all font-dm"
              >
                Contacter l'équipe
              </Link>
            </div>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
