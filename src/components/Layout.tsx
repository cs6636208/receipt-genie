import { Link, useLocation } from "react-router-dom";
import { Upload, History, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, lang, toggleLang } = useI18n();
  const location = useLocation();

  const navItems = [
    { to: "/", icon: Upload, label: t.upload },
    { to: "/history", icon: History, label: t.history },
    { to: "/dashboard", icon: BarChart3, label: t.dashboard },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <span className="font-bold text-lg tracking-tight">{t.appName}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}>
                <Button
                  variant={location.pathname === to ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            ))}
            <Button variant="outline" size="icon" onClick={toggleLang} className="ml-2 h-9 w-9">
              <Globe className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
