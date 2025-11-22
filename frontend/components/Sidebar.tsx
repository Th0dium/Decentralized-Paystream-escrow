"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks";

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const menuItems = [
    { href: "/dashboard", label: "Overview", show: true },
    {
      href: "/dashboard/employee/streams",
      label: "My Streams",
      show: role === "EMPLOYEE",
    },
    {
      href: "/dashboard/employee/withdraw",
      label: "Withdraw",
      show: role === "EMPLOYEE",
    },
    {
      href: "/dashboard/employee/milestones",
      label: "My Milestones",
      show: role === "EMPLOYEE",
    },
    {
      href: "/dashboard/company/create-stream",
      label: "Create Stream",
      show: role === "COMPANY" || !role,
    },
    {
      href: "/dashboard/company/streams",
      label: "Manage Streams",
      show: role === "COMPANY",
    },
    {
      href: "/dashboard/auditor/milestones",
      label: "Review Milestones",
      show: role === "AUDITOR",
    },
  ];

  return (
    <aside className="w-64 bg-white shadow-md overflow-y-auto">
      <nav className="p-4 space-y-2">
        {menuItems.map(
          (item) =>
            item.show && (
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
            )
        )}
      </nav>
    </aside>
  );
}
