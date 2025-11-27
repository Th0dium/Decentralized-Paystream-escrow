"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";

export default function AuditorHubPage() {
  const { isAuditor } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Auditor Dashboard</h1>

      {!isAuditor && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 You don't have an auditor role, but you can still view this section.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2">Review Milestones</h2>
            <p className="text-gray-600 mb-4 flex-grow">
              Review and approve pending milestone submissions from employees.
            </p>
            <Link href="/dashboard/auditor/milestones" className="inline-block">
              <Button className="w-full">Review Milestones</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
