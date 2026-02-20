
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface Absence {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  status: 'pending' | 'aproved' | 'rejected';
  reason: string;
  requestedAt: string;
}

export interface TeamMemberStatus extends User {
  isOnline: boolean;
  currentAbsence?: Absence;
}

export type Tab = 'dashboard' | 'status' | 'pending' | 'history' | 'monthly_report' | 'users';
