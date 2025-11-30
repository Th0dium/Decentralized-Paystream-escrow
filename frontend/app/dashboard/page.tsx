"use client";

import { useDashboardStore } from "@/lib/dashboard-store";
import OverviewContent from "@/components/dashboard/OverviewContent";
import EmployeeStreamsContent from "@/components/dashboard/EmployeeStreamsContent";
import CompanyCreatePaymentContent from "@/components/dashboard/company/CompanyCreatePaymentContent";
import AuditorPaymentsContent from "@/components/dashboard/AuditorPaymentsContent";
import AuditorMilestonesContent from "@/components/dashboard/AuditorMilestonesContent";
import AdminWhitelistTokenContent from "@/components/dashboard/admin/AdminWhitelistTokenContent";

// Import other sub-view components that might be rendered directly if they are
// not nested within their role's overview (e.g., if there were direct sidebar links)
import EmployeeWithdrawContent from "@/components/dashboard/employee/EmployeeWithdrawContent";
import EmployeeMilestonesContent from "@/components/dashboard/EmployeeMilestonesContent";
import CompanyStreamsContent from "@/components/dashboard/CompanyStreamsContent";


export default function DashboardPage() {
  const { activeDashboardView } = useDashboardStore();

  const renderContent = () => {
    switch (activeDashboardView) {
      case "overview":
        return <OverviewContent />;

      // Main role views, now directly mapping to their default sub-content
      case "employee-streams":
        return <EmployeeStreamsContent />;
      case "company-create-payment":
        return <CompanyCreatePaymentContent />;
      case "auditor-payments":
        return <AuditorPaymentsContent />;
      case "auditor-milestones":
        return <AuditorMilestonesContent />;

      // Other specific sub-views that might be navigated to internally (e.g., via buttons within EmployeeStreamsContent)
      // or if they had direct sidebar links (which is not the case currently, but keeping this structure for clarity)
      case "employee-withdraw":
        return <EmployeeWithdrawContent />;
      case "employee-milestones":
        return <EmployeeMilestonesContent />;
      case "company-streams":
        return <CompanyStreamsContent />;
      case "admin-whitelist-token":
        return <AdminWhitelistTokenContent />;

      default:
        // Fallback to overview for any unhandled or initial state
        return <OverviewContent />;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Dashboard</h1>
      {renderContent()}
    </div>
  );
}
