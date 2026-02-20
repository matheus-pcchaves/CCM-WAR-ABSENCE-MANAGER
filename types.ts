export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  intervalo?: string; // Adding the new field
  local?: string; // Adding the new field
}

export interface Absence {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: AbsenceStatus;
  reason: string;
  requestedAt: string;
}

export interface TeamMemberStatus extends User {
  isOnline: boolean;
  currentAbsence: Absence | null;
}

export type Tab = 'dashboard' | 'status' | 'pending' | 'history' | 'calendar' | 'monthly_report' | 'users';
