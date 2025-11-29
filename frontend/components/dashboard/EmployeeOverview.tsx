"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useDashboardStore } from "@/lib/dashboard-store";
import EmployeeStreamsContent from "./EmployeeStreamsContent";
import EmployeeWithdrawContent from "./employee/EmployeeWithdrawContent";
import EmployeeMilestonesContent from "./EmployeeMilestonesContent";

export default function EmployeeOverview() {
  const { isEmployee } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useDashboardStore();

  const handleNavigate = (view: 'employee-streams' | 'employee-withdraw' | 'employee-milestones') => {
    setActiveDashboardView(view);
  };

  const renderEmployeeContent = () => {
    switch (activeDashboardView) {
      case 'employee-streams':
        return <EmployeeStreamsContent />;
      case 'employee-withdraw':
        return <EmployeeWithdrawContent />;
      case 'employee-milestones':
        return <EmployeeMilestonesContent />;
      default:
        return (
          <>
            <h1 className="text-3xl font-bold mb-8 text-slate-100">Employee Dashboard</h1>

            {!isEmployee && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <p className="text-sm text-blue-300">
                  💡 You don&apos;t have an employee role, but you can still view this section.
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
                  <Button onClick={() => handleNavigate('employee-streams')} className="w-full">View Streams</Button>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 text-slate-100">Withdraw Funds</h2>
                  <p className="text-slate-400 mb-4 flex-grow">
                    Withdraw your accrued salary and escrowed amounts.
                  </p>
                  <Button onClick={() => handleNavigate('employee-withdraw')} className="w-full">Withdraw</Button>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 text-slate-100">My Milestones</h2>
                  <p className="text-slate-400 mb-4 flex-grow">
                    Track and manage your performance milestones.
                  </p>
                  <Button onClick={() => handleNavigate('employee-milestones')} className="w-full">View Milestones</Button>
                </div>
              </Card>
            </div>
          </>
        );
    }
  };

  return (
    <div>
      {/* Back button visible only when a sub-view is active */}
      {activeDashboardView && activeDashboardView.startsWith('employee-') && (
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setActiveDashboardView('employee')}>
            &larr; Back to Employee Overview
          </Button>
        </div>
      )}
      {renderEmployeeContent()}
    </div>
  );
}