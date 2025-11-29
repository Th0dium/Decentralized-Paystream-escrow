import { create } from 'zustand';

export type DashboardView = 'overview' | 'employee' | 'company' | 'auditor' | 'employee-streams' | 'employee-withdraw' | 'employee-milestones' | 'company-create-payment' | 'company-streams' | 'auditor-milestones' | 'admin-whitelist-token' | null;

interface DashboardStore {
  activeDashboardView: DashboardView;
  setActiveDashboardView: (view: DashboardView) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeDashboardView: 'overview', // Initial state, default to overview
  setActiveDashboardView: (view) => set({ activeDashboardView: view }),
}));
