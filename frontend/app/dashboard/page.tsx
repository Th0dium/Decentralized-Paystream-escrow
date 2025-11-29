"use client";

import { useDashboardStore } from "@/lib/dashboard-store";
import OverviewContent from "@/components/dashboard/OverviewContent";
import EmployeeOverview from "@/components/dashboard/EmployeeOverview";
import CompanyOverview from "@/components/dashboard/CompanyOverview";
import AuditorOverview from "@/components/dashboard/AuditorOverview";
import AdminWhitelistTokenContent from "@/components/dashboard/admin/AdminWhitelistTokenContent";

export default function DashboardPage() {
  const { activeDashboardView } = useDashboardStore();

  const renderContent = () => {
    switch (activeDashboardView) {
      case "overview":
        return <OverviewContent />;
      case "employee":
        return <EmployeeOverview />;
      case "company":
        return <CompanyOverview />;
      case "auditor":
        return <AuditorOverview />;
      case "admin-whitelist-token": // New case for admin whitelist
        return <AdminWhitelistTokenContent />;
      default:
        // Default to rendering the main role overview if an employee/company/auditor sub-view is selected
        // but not directly rendered by this switch (e.g., 'employee-streams' is handled within EmployeeOverview)
        if (activeDashboardView?.startsWith('employee-')) return <EmployeeOverview />;
        if (activeDashboardView?.startsWith('company-')) return <CompanyOverview />;
        if (activeDashboardView?.startsWith('auditor-')) return <AuditorOverview />;
        return <OverviewContent />; // Fallback to overview if nothing matches
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Dashboard</h1>
      {renderContent()}
    </div>
  );
}
