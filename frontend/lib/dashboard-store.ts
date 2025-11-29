import { create } from 'zustand';

interface DashboardStore {
  activeDashboardView: 'overview' | 'employee' | 'company' | 'auditor' | 'employee-streams' | 'employee-withdraw' | 'employee-milestones' | 'company-create-payment' | 'company-streams' | 'auditor-milestones' | 'admin-whitelist-token' | null;
  setActiveDashboardView: (view: 'overview' | 'employee' | 'company' | 'auditor' | 'employee-streams' | 'employee-withdraw' | 'employee-milestones' | 'company-create-payment' | 'company-streams' | 'auditor-milestones' | 'admin-whitelist-token' | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeDashboardView: 'overview', // Initial state, default to overview
  setActiveDashboardView: (view) => set({ activeDashboardView: view }),
}));
