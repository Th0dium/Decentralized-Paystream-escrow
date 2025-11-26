"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { Web3Button } from "@web3modal/wagmi/react";

export default function Header() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth(); // Removed walletAddress from destructuring

  const handleLogout = () => {
    logout(); // This now handles both disconnect and store cleanup
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Paystream
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Web3Button />
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Web3Button />
          )}
        </div>
      </div>
    </header>
  );
}
