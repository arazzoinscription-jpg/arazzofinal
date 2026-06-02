export function SocialBar() {
  const networks = [
    { name: "Telegram", icon: "✈️", color: "#0088CC", href: "#" },
    { name: "WhatsApp", icon: "💬", color: "#25D366", href: "#" },
    { name: "YouTube", icon: "▶️", color: "#FF0000", href: "#" },
    { name: "TikTok", icon: "🎵", color: "#000000", href: "#" },
    { name: "Instagram", icon: "📷", color: "#E4405F", href: "#" },
    { name: "Facebook", icon: "f", color: "#1877F2", href: "#" },
  ];

  return (
    <div className="bg-white border-y border-cream-200 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <span className="text-sm text-gray-400 font-medium">
            Rejoignez la communauté :
          </span>
          {networks.map((n) => (
            <a
              key={n.name}
              href={n.href}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-100 hover:border-orange-300 hover:shadow-sm transition-all text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <span>{n.icon}</span>
              <span>{n.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
