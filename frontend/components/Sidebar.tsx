"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";
import { useDashboardStore, DashboardView } from "@/lib/dashboard-store"; // Import DashboardView type

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface MenuItem {
  href: string;
  label: string;
  show: boolean;
  view: DashboardView; // Now using the imported DashboardView type
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useDashboardStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleDashboardLinkClick = (e: React.MouseEvent, href: string, view: DashboardView) => {
    e.preventDefault(); // Prevent default Link behavior
    setActiveDashboardView(view);
    router.push(href);
  };

  const isLinkActive = (item: MenuItem) => {
    // Check if we're on dashboard path AND the dashboard's active view matches this link's view
    return pathname === "/dashboard" && activeDashboardView === item.view;
  }

  const menuSections: MenuSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Overview", show: true, view: "overview" },
        { href: "/dashboard", label: "Employee", show: true, view: "employee-streams" }, // Direct to streams
        { href: "/dashboard", label: "Company", show: true, view: "company-streams" }, // Direct to streams list
        { href: "/dashboard", label: "Auditor", show: true, view: "auditor-milestones" }, // Direct to milestones
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-800 shadow-md overflow-y-auto flex flex-col border-r border-slate-700">
      <nav className="p-4 flex-1">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className={section.title ? "mb-6" : "mb-2"}>
              {section.title && (
                <h3 className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <Link
                    key={item.label} // Use label as key
                    href={item.href}
                    onClick={(e) => handleDashboardLinkClick(e, item.href, item.view)}
                    className={`block px-4 py-2 rounded-lg transition-colors ${
                      isLinkActive(item)
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 font-medium rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}