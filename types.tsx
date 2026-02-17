
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
    startDate: string;
    endDate: string;
    // Fix: Added 'pendente' to the status union to allow valid comparisons in App.tsx 
    // and handle values arriving from the n8n webhook.
    status: 'pending' | 'approved' | 'rejected' | 'aprovado' | 'rejeitado' | 'pendente';
    reason: string;
    requestedAt: string;
  }
  
  export interface TeamMemberStatus extends User {
    isOnline: boolean;
    currentAbsence?: Absence;
  }
  