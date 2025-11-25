"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";

export default function Header() {
  const router = useRouter();
  const { isAuthenticated, walletAddress, logout } = useAuth();
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    disconnect();
    logout();
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Paystream
          </Link>

          {isAuthenticated && walletAddress && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
