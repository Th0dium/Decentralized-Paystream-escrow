"use client";

import { Card } from "@/components/Card";

export default function OverviewContent() {
  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
      <p className="text-slate-300">
        Welcome to your decentralized paystream dashboard. Use the sidebar to navigate through your roles and manage streams.
      </p>
      {/* Add more general overview content here */}
    </Card>
  );
}