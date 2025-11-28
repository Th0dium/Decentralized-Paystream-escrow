"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth(); // Removed walletAddress from destructuring

  const handleLogout = () => {
    disconnect();
    router.push("/");
  };

  return (
    <header className="bg-slate-800 shadow-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Paystream
          </Link>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
