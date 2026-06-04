"use client";

const items = [
  "Caftan",
  "✂️",
  "Djellaba",
  "🧵",
  "Tarz",
  "🪡",
  "Broderie",
  "✨",
  "Modélisme",
  "📐",
  "Patronage",
  "🎨",
  "Haïk",
  "✂️",
  "Burnous",
  "🧵",
  "Gandoura",
  "🪡",
  "Haute Couture",
  "✨",
  "Takchita",
  "📐",
];

export function MarqueeSection() {
  return (
    <section className="bg-orange-DEFAULT py-5 overflow-hidden">
      <div className="relative flex">
        <div
          className="flex gap-8 items-center animate-marquee whitespace-nowrap"
          style={{ animation: "marquee 25s linear infinite" }}
        >
          {[...items, ...items].map((item, i) => (
            <span
              key={i}
              className="text-white font-playfair text-lg font-medium opacity-90"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
