
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';
export type AbsenceType = 'Folga' | 'Ausência Parcial' | 'Férias' | 'Licença';

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
  type: AbsenceType;
  startDate: string; // ISO String
  endDate: string;   // ISO String
  status: AbsenceStatus;
  reason?: string;
  requestedAt: string;
}

export interface TeamMemberStatus extends User {
  isOnline: boolean;
  currentAbsence?: Absence;
}
