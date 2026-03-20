import { User, Absence, AbsenceStatus } from '../types';

const BASE_URL = 'http://163.176.230.146:5678/webhook';

export const n8nService = {
  async fetchUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/get-users`);
      if (!res.ok) return [];
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data ? [data] : []);
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
//http://163.176.230.146:5678/webhook/buscaSolicitacoes
  async fetchAbsences(): Promise<Absence[]> {
    try {
      const res = await fetch(`http://163.176.230.146:5678/webhook/buscaSolicitacoes`);
      if (!res.ok) return [];
      const data = await res.json();
      const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
      
      return dataArray.map((item: any, index: number) => {
        // Função corrigida para lidar com "YYYY-MM-DD HH:mm:ss" ou formatos antigos
        const parseDate = (d: string) => {
          if (!d || d === 'null' || d === '') return null;
      
          // Se a string já contém a data e hora (formato do seu n8n: 2026-03-20 15:30:00)
          if (d.includes('-') && d.includes(' ')) {
            return d.replace(' ', 'T'); // Transforma em 2026-03-20T15:30:00
          }
      
          // Caso o n8n envie apenas a data em formato DD/MM/YYYY (fallback)
          if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              return `${year}-${month}-${day}T00:00:00`;
            }
          }
      
          return d; // Retorna o valor original se já estiver em formato ISO
        };
      
        // Na sua imagem, os campos que trazem Data+Hora são 'horaIni' e 'horaFim'
        const start = parseDate(item.horaIni || item.dataIni);
        const end = parseDate(item.horaFim || item.dataFim);
      
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
          // O new Date(start) agora reconhecerá a hora correta (ex: 15:30)
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
