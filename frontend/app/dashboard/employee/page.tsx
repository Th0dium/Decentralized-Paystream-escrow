"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";

export default function EmployeeHubPage() {
  const { isEmployee } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Employee Dashboard</h1>

      {!isEmployee && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don't have an employee role, but you can still view this section.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2 text-slate-100">My Streams</h2>
            <p className="text-slate-400 mb-4 flex-grow">
              View all salary streams assigned to you and track your payments.
            </p>
            <Link href="/dashboard/employee/streams" className="inline-block">
              <Button className="w-full">View Streams</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2 text-slate-100">Withdraw Funds</h2>
            <p className="text-slate-400 mb-4 flex-grow">
              Withdraw your accrued salary and escrowed amounts.
            </p>
            <Link href="/dashboard/employee/withdraw" className="inline-block">
              <Button className="w-full">Withdraw</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2 text-slate-100">My Milestones</h2>
            <p className="text-slate-400 mb-4 flex-grow">
              Track and manage your performance milestones.
            </p>
            <Link href="/dashboard/employee/milestones" className="inline-block">
              <Button className="w-full">View Milestones</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
