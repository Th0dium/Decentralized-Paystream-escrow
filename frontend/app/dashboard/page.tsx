"use client";

import { Card } from "@/components/Card";
import { useAuth } from "@/lib/hooks";
import Link from "next/link";

export default function DashboardPage() {
  const { isCompany, isEmployee, isAuditor, walletAddress } = useAuth();

  const role = isCompany
    ? "COMPANY"
    : isEmployee
    ? "EMPLOYEE"
    : isAuditor
    ? "AUDITOR"
    : "GUEST";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="text-sm text-slate-400 mb-2">Your Role</div>
          <div className="text-2xl font-bold text-blue-400">
            {role}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400 mb-2">Wallet Address</div>
          <div className="text-sm font-mono break-all text-slate-100">{walletAddress}</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400 mb-2">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-400">Connected</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {role === "EMPLOYEE" && (
          <>
            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Quick Actions</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dashboard/employee/deposit"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Deposit Tokens →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/employee/streams"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View My Streams →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/employee/withdraw"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Withdraw Funds →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/employee/milestones"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Milestones →
                  </Link>
                </li>
              </ul>
            </Card>

            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Information</h3>
              <p className="text-slate-400 text-sm">
                Monitor your streams, withdraw available funds, and submit
                milestones for escrow verification.
              </p>
            </Card>
          </>
        )}

        {(role === "COMPANY" || role === "GUEST") && (
          <>
            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Quick Actions</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dashboard/company/create-stream"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Create Stream →
                  </Link>
                </li>
                {role === "COMPANY" && (
                  <li>
                    <Link
                      href="/dashboard/company/streams"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Manage Streams →
                    </Link>
                  </li>
                )}
              </ul>
            </Card>

            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Information</h3>
              <p className="text-slate-400 text-sm">
                Create salary streams for employees, manage active streams, and
                control escrow settings.
              </p>
            </Card>
          </>
        )}

        {role === "AUDITOR" && (
          <>
            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Quick Actions</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dashboard/auditor/milestones"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Review Milestones →
                  </Link>
                </li>
              </ul>
            </Card>

            <Card>
              <h3 className="text-xl font-semibold mb-4 text-slate-100">Information</h3>
              <p className="text-slate-400 text-sm">
                Review milestone submissions with evidence and approve or reject
                claims.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
