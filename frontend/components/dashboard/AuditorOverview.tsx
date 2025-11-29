"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useDashboardStore } from "@/lib/dashboard-store";
import AuditorMilestonesContent from "./AuditorMilestonesContent";

export default function AuditorOverview() {
  const { isAuditor } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useDashboardStore();

  const handleNavigate = (view: 'auditor-milestones') => {
    setActiveDashboardView(view);
  };

  const renderAuditorContent = () => {
    switch (activeDashboardView) {
      case 'auditor-milestones':
        return <AuditorMilestonesContent />;
      default:
        return (
          <>
            <h1 className="text-3xl font-bold mb-8 text-slate-100">Auditor Dashboard</h1>

            {!isAuditor && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <p className="text-sm text-blue-300">
                  💡 You don&apos;t have an auditor role, but you can still view this section.
                </p>
              </div>
            )}

            <Card>
              <div className="flex flex-col h-full">
                <h2 className="text-xl font-semibold mb-2 text-slate-100">Review Milestones</h2>
                <p className="text-slate-400 mb-4 flex-grow">
                  Review and approve pending milestone submissions from employees.
                </p>
                <Button onClick={() => handleNavigate('auditor-milestones')} className="w-full">Review Milestones</Button>
              </div>
            </Card>
          </>
        );
    }
  };

  return (
    <div>
      {/* Back button visible only when a sub-view is active */}
      {activeDashboardView && activeDashboardView.startsWith('auditor-') && (
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setActiveDashboardView('auditor')}>
            &larr; Back to Auditor Overview
          </Button>
        </div>
      )}
      {renderAuditorContent()}
    </div>
  );
}