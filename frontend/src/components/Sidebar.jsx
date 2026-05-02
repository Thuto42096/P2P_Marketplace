import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Browse all", icon: "🛒", end: true },
  { to: "/sell", label: "Selling", icon: "🏷️" },
  { to: "/buy", label: "Buying", icon: "📦" },
  { to: "/sell/new", label: "Create new listing", icon: "➕", primary: true },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-fb-border bg-fb-surface overflow-y-auto">
      <div className="px-4 py-4 border-b border-fb-border">
        <h2 className="text-xl font-bold text-fb-text">ChainMart</h2>
        <p className="text-xs text-fb-subtle mt-1">Buy and sell with stablecoins</p>
      </div>

      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                item.primary
                  ? "bg-fb-accent text-white hover:bg-fb-accentHover"
                  : isActive
                  ? "bg-blue-50 text-fb-accent"
                  : "text-fb-text hover:bg-fb-bg",
              ].join(" ")
            }
          >
            <span className="text-lg w-6 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-fb-border text-xs text-fb-subtle">
        <p>Funds are held in escrow until the buyer confirms receipt.</p>
      </div>
    </aside>
  );
}
