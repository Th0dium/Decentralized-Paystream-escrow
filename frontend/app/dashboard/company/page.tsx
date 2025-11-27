"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";

export default function CompanyHubPage() {
  const { isCompany } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Company Dashboard</h1>

      {!isCompany && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 You don't have a company role, but you can still view this section.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2">Create Stream</h2>
            <p className="text-gray-600 mb-4 flex-grow">
              Create a new salary stream for an employee with milestones and payment schedule.
            </p>
            <Link href="/dashboard/company/create-stream" className="inline-block">
              <Button className="w-full">Create New Stream</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-2">Manage Streams</h2>
            <p className="text-gray-600 mb-4 flex-grow">
              View, pause, resume, or cancel your existing salary streams.
            </p>
            <Link href="/dashboard/company/streams" className="inline-block">
              <Button className="w-full">Manage Streams</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
