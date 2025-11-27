"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface MenuItem {
  href: string;
  label: string;
  show: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCompany, isEmployee, isAuditor, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const menuSections: MenuSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Overview", show: true },
        { href: "/dashboard/employee", label: "Employee Hub", show: true },
        { href: "/dashboard/company", label: "Company Hub", show: true },
        { href: "/dashboard/auditor", label: "Auditor Hub", show: true },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white shadow-md overflow-y-auto flex flex-col">
      <nav className="p-4 flex-1">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className={section.title ? "mb-6" : "mb-2"}>
              {section.title && (
                <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2 rounded-lg transition-colors ${
                      pathname === item.href
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
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
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}