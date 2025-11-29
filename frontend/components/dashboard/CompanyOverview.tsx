"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useDashboardStore } from "@/lib/dashboard-store";
import CompanyCreatePaymentContent from "./company/CompanyCreatePaymentContent";
import CompanyStreamsContent from "./CompanyStreamsContent";

export default function CompanyOverview() {
  const { isCompany } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useDashboardStore();

  const handleNavigate = (view: 'company-create-payment' | 'company-streams') => {
    setActiveDashboardView(view);
  };

  const renderCompanyContent = () => {
    switch (activeDashboardView) {
      case 'company-create-payment':
        return <CompanyCreatePaymentContent />;
      case 'company-streams':
        return <CompanyStreamsContent />;
      default:
        return (
          <>
            <h1 className="text-3xl font-bold mb-8 text-slate-100">Company Dashboard</h1>

            {!isCompany && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <p className="text-sm text-blue-300">
                  💡 You don&apos;t have a company role, but you can still view this section.
                </p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 text-slate-100">Create Payment</h2>
                  <p className="text-slate-400 mb-4 flex-grow">
                    Create a new payment stream for an employee with optional escrow for milestones.
                  </p>
                  <Button onClick={() => handleNavigate('company-create-payment')} className="w-full">Create New Payment</Button>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 text-slate-100">Manage Streams</h2>
                  <p className="text-slate-400 mb-4 flex-grow">
                    View, pause, resume, or cancel your existing salary streams.
                  </p>
                  <Button onClick={() => handleNavigate('company-streams')} className="w-full">Manage Streams</Button>
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
      {activeDashboardView && activeDashboardView.startsWith('company-') && (
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setActiveDashboardView('company')}>
            &larr; Back to Company Overview
          </Button>
        </div>
      )}
      {renderCompanyContent()}
    </div>
  );
}
