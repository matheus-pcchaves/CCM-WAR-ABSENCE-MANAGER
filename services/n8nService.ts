import { User, Absence, AbsenceStatus } from '../types';

const BASE_URL = 'http://137.131.223.126:5678/webhook';

export const n8nService = {
  async fetchUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/get-users`);
      if (!res.ok) return [];
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data ? [data] : []);
      console.log(items)
      return items.map((item: any) => ({
        id: item.id || item.email || Math.random().toString(36).substr(2, 9),
        name: item.name || item.email || 'Usuário',
        email: item.email,
        role: item.role || 'employee',
        intervalo: item.intervalo,
        local: item.local
      }));
      
    } catch (err) {
      console.error("Error fetching users:", err);
      return [];
    }
  },

  async fetchAbsences(): Promise<Absence[]> {
    try {
      const res = await fetch(`${BASE_URL}/buscaSolicitacoes`);
      if (!res.ok) return [];
      const data = await res.json();
      const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
      
      return dataArray.map((item: any, index: number) => {
        // Handle n8n specific date formats like DD/MM/YYYY
        const parseDate = (d: string, t: string) => {
          if (!d || d === 'null' || d === '') return null;
          const parts = d.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const time = t && t !== 'null' && t !== '' ? t : '00:00:00';
            return `${year}-${month}-${day}T${time}`;
          }
          return d;
        };

        const start = parseDate(item.dataIni, item.horaIni);
        const end = parseDate(item.dataFim, item.horaFim);

        // Normalize status to handle potential typos like 'aproved'
        let status: AbsenceStatus = 'pending';
        const rawStatus = item.status?.toLowerCase();
        if (rawStatus === 'approved' || rawStatus === 'aproved' || rawStatus === 'aprovado') {
          status = 'approved';
        } else if (rawStatus === 'rejected' || rawStatus === 'rejeitado') {
          status = 'rejected';
        }

        return {
          id: item.id || `abs-${index}`,
          userId: item.email || item.userId,
          userName: item.nome || item.userName || item.email || 'Sem nome',
          type: item.motivo || item.type || 'Ausência',
          startDate: start ? new Date(start).toISOString() : new Date().toISOString(),
          endDate: end ? new Date(end).toISOString() : new Date().toISOString(),
          status: status,
          reason: item.motivo || item.reason || '',
          requestedAt: item.requestedAt || new Date().toISOString()
        };
      });
    } catch (err) {
      console.error("Error fetching absences:", err);
      return [];
    }
  },

  async updateAbsenceStatus(absence: Absence) {
    const WEBHOOK_URL = `${BASE_URL}/validaAusencia`;
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(absence),
      });
      return res.ok;
    } catch (err) {
      console.error("Error sending status update to webhook:", err);
      return false;
    }
  },

  async saveUser(user: User) {
    console.log("Saving user to n8n", user);
  },

  async deleteUser(id: string) {
    console.log("Deleting user from n8n", id);
  }
};
