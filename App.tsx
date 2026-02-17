
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Activity,
  LogOut,
  LayoutDashboard,
  Download,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { User, Absence, TeamMemberStatus } from './types';
import { n8nService } from './services/n8nService';

// --- MOCK DATA ---
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Tacio Santos', email: 'tsantos@ccmtecnologia.com.br', role: 'employee' },
  { id: '2', name: 'Luciano Martins', email: 'lmartins@ccmtecnologia.com.br', role: 'admin' },
  { id: '3', name: 'Brenda Costa', email: 'bcosta@ccmtecnologia.com.br', role: 'employee' },
];

const INITIAL_ABSENCES: Absence[] = [];

const App: React.FC = () => {
  type Tab = 'dashboard' | 'pending' | 'history' | 'status' | 'users' | 'monthly_report';
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [absences, setAbsences] = useState<Absence[]>(INITIAL_ABSENCES);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const brTimeStr = useMemo(() => {
    return currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const brDateStr = useMemo(() => {
    return currentTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }, [currentTime]);

  const teamStatus: TeamMemberStatus[] = useMemo(() => {
    const now = currentTime.getTime();
    return users.map(user => {
      const activeAbsence = absences.find(abs => 
        (abs.userId === user.id || abs.id === user.email) && 
        abs.status === 'approved' &&
        now >= new Date(abs.startDate).getTime() && 
        now <= new Date(abs.endDate).getTime()
      );
      return { ...user, isOnline: !activeAbsence, currentAbsence: activeAbsence };
    });
  }, [users, absences, currentTime]);

  /**
   * FUNÇÃO SOLICITADA: Valida se o colaborador teve ou não uma ausência aprovada 
   * e se está online ou não no momento por meio do nome do colaborador ou e-mail.
   */
  const checkCollaboratorStatus = (identifier: string) => {
    if (!identifier) return null;
    
    const searchKey = identifier.toLowerCase();
    const collaborator = teamStatus.find(m => 
      m.name.toLowerCase() === searchKey || 
      m.email.toLowerCase() === searchKey
    );

    if (!collaborator) {
      return {
        success: false,
        message: 'Colaborador não encontrado na base de dados.'
      };
    }

    return {
      success: true,
      name: collaborator.name,
      email: collaborator.email,
      isOnline: collaborator.isOnline,
      hasApprovedAbsenceNow: !!collaborator.currentAbsence,
      currentAbsenceDetails: collaborator.currentAbsence || null,
      message: collaborator.isOnline 
        ? `${collaborator.name} está online no momento.` 
        : `${collaborator.name} está ausente (${collaborator.currentAbsence?.type}).`
    };
  };

  const handleApprove = (id: string) => {
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    n8nService.updateAbsenceStatus(id, 'approved');
  };

  const handleReject = (id: string) => {
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    n8nService.updateAbsenceStatus(id, 'rejected');
  };

  const deleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      n8nService.deleteUser(id);
    }
  };

  const addUser = () => {
    setIsModalOpen(true);
  };

  const parseWebhookDateTime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr || dateStr === 'null') return null;
    const [day, month, year] = dateStr.split('/');
    const time = timeStr && timeStr !== 'null' ? timeStr : '00:00:00';
    try {
      return new Date(`${year}-${month}-${day}T${time}`).toISOString();
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchColaboradores = async () => {
      const N8N_WEBHOOK_URL = 'http://137.131.223.126:5678/webhook/get-users';
      try {
        const res = await fetch(N8N_WEBHOOK_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data ? [data] : []);
        
        const formattedUsers = items.map((item: any) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          name: item.name || item.email,
          email: item.email,
          role: item.role || 'employee'
        }));
        if (formattedUsers.length > 0) setUsers(formattedUsers);
      } catch (err) {
        console.error("Erro ao buscar dados do n8n:", err);
      }
    };
  
    fetchColaboradores();
  }, []);

  useEffect(() => {
    const fetchSolicitacoes = async () => {
      const URL_SOLICITACOES = 'http://137.131.223.126:5678/webhook/buscaSolicitacoes';
      
      try {
        console.log('🔄 Buscando solicitações...', URL_SOLICITACOES);
        
        const res = await fetch(URL_SOLICITACOES, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Status da resposta:', res.status);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        console.log('✅ Dados brutos recebidos:', data);
        
        const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
        console.log('📦 Array de dados:', dataArray);
        
        const mappedAbsences: Absence[] = dataArray.map((item: any, index: number) => {
          console.log(`🔍 Processando item ${index}:`, item);
          
          const startDate = parseWebhookDateTime(item.dataIni, item.horaIni);
          const endDate = parseWebhookDateTime(item.dataFim, item.horaFim);
          
          console.log('📅 Start Date:', startDate, '| End Date:', endDate);
          
          return {
            id: item.id || `abs-${index}`,
            userId: item.email || item.userId,
            userName: item.nome || item.userName || item.email || 'Sem nome',
            type: item.motivo || item.type || 'Ausência',
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || startDate || new Date().toISOString(),
            status: item.status || 'pendente',
            reason: item.motivo || item.reason || '',
            requestedAt: item.requestedAt || new Date().toISOString()
          };
        });
        
        console.log('✅ Ausências mapeadas:', mappedAbsences);
        setAbsences(mappedAbsences);
        
      } catch (err) {
        console.error("❌ Erro ao buscar solicitações:", err);
        console.error("Detalhes:", err.message);
      }
    };
  
    fetchSolicitacoes();
  }, []);
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;
  
    const newUser: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: newMember.name, 
      email: newMember.email, 
      role: 'employee' 
    };
  
    setUsers([...users, newUser]);
    n8nService.saveUser(newUser);
    
    setNewMember({ name: '', email: '' });
    setIsModalOpen(false);
  };

  const downloadXLSX = () => {
    const headers = "Colaborador;Tipo;Inicio;Fim;Status;Solicitado Em\n";
    const rows = absences.map(a => `${a.userName};${a.type};${new Date(a.startDate).toLocaleString()};${new Date(a.endDate).toLocaleString()};${a.status};${new Date(a.requestedAt).toLocaleDateString()}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `historico_mensal_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-[#1e1e1e] text-white flex flex-col shadow-2xl">
        <div className="p-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white text-4xl font-black tracking-tighter">CCM</span>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M6 4l15 8-15 8z" />
            </svg>
          </div>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Squad Management</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" dark />
          <SidebarLink active={activeTab === 'status'} onClick={() => setActiveTab('status')} icon={<Activity size={18}/>} label="Status em Tempo Real" dark />
          <SidebarLink active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} icon={<Clock size={18}/>} label="Solicitações" badge={absences.filter(a => a.status === 'pending').length} dark />
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<CheckCircle size={18}/>} label="Histórico Geral" dark />
          <SidebarLink active={activeTab === 'monthly_report'} onClick={() => setActiveTab('monthly_report')} icon={<FileSpreadsheet size={18}/>} label="Relatório Mensal" dark />
          <SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18}/>} label="Colaboradores" dark />
        </nav>

        <div className="p-4 bg-black/20 text-center">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Brasília (GMT-3)</div>
            <div className="text-sm font-medium text-slate-300">{brDateStr}</div>
            <div className="text-xl font-black text-white">{brTimeStr}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'status' && 'Quem está Online?'}
              {activeTab === 'pending' && 'Aprovar Ausências'}
              {activeTab === 'history' && 'Log de Atividades'}
              {activeTab === 'monthly_report' && 'Histórico Mensal'}
              {activeTab === 'users' && 'Gestão de Equipe'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium">Controle de presença e fluxo de trabalho.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-800">Admin Gestor</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Acesso Master</p>
            </div>
            <button className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="space-y-8">
          {activeTab === 'dashboard' && <DashboardView absences={absences} teamStatus={teamStatus} setActiveTab={setActiveTab} />}
          {activeTab === 'status' && <StatusBoardView teamStatus={teamStatus} checkStatus={checkCollaboratorStatus} />}
          
          {activeTab === 'pending' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo / Motivo</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Período</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Decisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absences.filter(a => a.status === 'pending').map(abs => (
                    <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 truncate max-w-[200px]" title={abs.userName}>{abs.userName}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                          {abs.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                        {new Date(abs.startDate).toLocaleString('pt-BR')} — <br/>
                        {new Date(abs.endDate).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleApprove(abs.id)} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-sm" title="Aprovar">
                            <Check size={20} />
                          </button>
                          <button onClick={() => handleReject(abs.id)} className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm" title="Reprovar">
                            <X size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {absences.filter(a => a.status === 'pending').length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-medium">Nada para aprovar agora. Bom trabalho!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Período</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absences.filter(a => a.status !== 'pending').map(abs => (
                    <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-800">{abs.userName}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          abs.type === 'Folga' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {abs.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                        {new Date(abs.startDate).toLocaleString()} às {new Date(abs.endDate).toLocaleString()}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          abs.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {abs.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'monthly_report' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Dados do Mês Corrente</h3>
                <button onClick={downloadXLSX} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-emerald-100">
                  <Download size={20} /> Baixar XLSX (.csv)
                </button>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100">
                   <p className="text-slate-500 font-medium italic">O arquivo será exportado com codificação UTF-8 compatível com Excel.</p>
                 </div>
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Data Solicitada</th>
                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Membro</th>
                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absences.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/30">
                          <td className="px-8 py-4 text-sm font-medium text-slate-600">{new Date(a.requestedAt).toLocaleDateString()}</td>
                          <td className="px-8 py-4 font-bold text-slate-800">{a.userName}</td>
                          <td className="px-8 py-4 text-sm text-slate-500">{a.type}</td>
                          <td className="px-8 py-4">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${a.status === 'approved' ? 'text-emerald-600' : a.status === 'pending' ? 'text-orange-500' : 'text-rose-600'}`}>
                               {a.status}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-bold text-[#0f172a]">Novo Colaborador</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleRegister} className="p-8 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newMember.name}
                      onChange={e => setNewMember({...newMember, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                      placeholder="Ex: Jhon Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                    <input 
                      type="email" 
                      value={newMember.email}
                      onChange={e => setNewMember({...newMember, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                      placeholder="Ex: jhondoe@ccmtecnologia.com.br"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                  >
                    Concluir Cadastro
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={addUser} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-xl shadow-blue-100">
                  <Plus size={20} /> Cadastrar Membro
                </button>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Nome Completo</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">E-mail Corporativo</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Papel</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-bold text-slate-800">{user.name}</span>
                        </td>
                        <td className="px-8 py-6 text-slate-600 font-medium">{user.email}</td>
                        <td className="px-8 py-6">
                          <span className="capitalize text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{user.role}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => deleteUser(user.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Remover">
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Helper Components ---

const SidebarLink: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  badge?: number;
  dark?: boolean;
}> = ({ active, onClick, icon, label, badge, dark }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      active 
        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-4">
      <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}>{icon}</span>
      <span className="text-sm tracking-tight">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-lg font-black shadow-lg shadow-rose-900/20">
        {badge}
      </span>
    )}
  </button>
);

const DashboardView: React.FC<{ 
  absences: Absence[], 
  teamStatus: TeamMemberStatus[],
  setActiveTab: (tab: any) => void
}> = ({ absences, teamStatus, setActiveTab }) => {
  const pendingCount = absences.filter(a => a.status === 'pending').length;
  const approvedCount = absences.filter(a => a.status === 'approved').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard 
        title="Squad Online" 
        value={teamStatus.filter(s => s.isOnline).length.toString()} 
        icon={<Activity className="text-emerald-500"/>} 
        color="emerald" 
        subValue={`De ${teamStatus.length} totais`}
        onClick={() => setActiveTab('status')}
      />
      <StatCard 
        title="Pendentes" 
        value={pendingCount.toString()} 
        icon={<Clock className="text-orange-500"/>} 
        color="orange" 
        subValue="Aguardando você"
        onClick={() => setActiveTab('pending')}
        highlight={pendingCount > 0}
      />
      <StatCard 
        title="Histórico" 
        value={approvedCount.toString()} 
        icon={<CheckCircle className="text-blue-500"/>} 
        color="blue" 
        subValue="Visualizar aprovados"
        onClick={() => setActiveTab('history')}
      />
      <StatCard 
        title="Membros" 
        value={teamStatus.length.toString()} 
        icon={<Users className="text-indigo-500"/>} 
        color="indigo" 
        subValue="Configurações de time"
        onClick={() => setActiveTab('users')}
      />
      
      <div className="col-span-1 md:col-span-4 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"/>
            Presença de Hoje
          </h3>
          <button onClick={() => setActiveTab('status')} className="text-sm font-bold text-blue-600 hover:underline">Ver tudo</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamStatus.map(member => (
             <div key={member.id} className="flex items-center justify-between p-5 rounded-3xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${member.isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-rose-500 shadow-lg shadow-rose-200'}`} />
                  <div>
                    <p className="font-bold text-slate-800 leading-none truncate max-w-[120px]" title={member.name}>{member.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{member.isOnline ? 'Online agora' : 'Indisponível'}</p>
                  </div>
                </div>
                {member.isOnline ? (
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-xl">Ativo</span>
                ) : (
                   <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-xl truncate max-w-[80px]" title={member.currentAbsence?.type || 'Offline'}>{member.currentAbsence?.type || 'Offline'}</span>
                )}
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  color: string, 
  subValue: string,
  onClick: () => void,
  highlight?: boolean
}> = ({ title, value, icon, color, subValue, onClick, highlight }) => (
  <div 
    onClick={onClick}
    className={`p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer group hover:scale-[1.03] ${
      highlight 
        ? 'bg-orange-600 border-orange-500 shadow-2xl shadow-orange-200' 
        : 'bg-white border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-slate-200'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-xs font-black uppercase tracking-widest ${highlight ? 'text-orange-100' : 'text-slate-400'}`}>{title}</p>
        <p className={`text-4xl font-black mt-2 ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
      <div className={`p-4 rounded-3xl ${highlight ? 'bg-orange-500' : `bg-${color}-50`}`}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
          className: highlight ? 'text-white' : (icon as any).props?.className 
        })}
      </div>
    </div>
    <div className={`mt-6 pt-4 border-t text-[10px] font-bold uppercase tracking-widest ${highlight ? 'border-orange-500/50 text-orange-200' : 'border-slate-50 text-slate-400'}`}>
      {subValue}
    </div>
  </div>
);

const StatusBoardView: React.FC<{ teamStatus: TeamMemberStatus[], checkStatus: (id: string) => any }> = ({ teamStatus, checkStatus }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = () => {
    const res = checkStatus(searchValue);
    setSearchResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Validar por nome ou e-mail..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button 
          onClick={handleSearch}
          className="bg-[#1e1e1e] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all"
        >
          Validar Agora
        </button>
      </div>

      {searchResult && (
        <div className={`p-6 rounded-[2rem] border shadow-xl animate-in slide-in-from-top-4 duration-300 ${searchResult.success ? 'bg-white border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
           <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado da Validação</p>
                <h4 className="text-xl font-black text-slate-900">{searchResult.success ? searchResult.name : 'Não Localizado'}</h4>
                <p className={`text-sm font-medium mt-2 ${searchResult.success ? 'text-slate-600' : 'text-rose-600'}`}>
                  {searchResult.message}
                </p>
              </div>
              {searchResult.success && (
                <div className="text-right">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest ${searchResult.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                     <div className={`w-2 h-2 rounded-full ${searchResult.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                     {searchResult.isOnline ? 'Disponível' : 'Ausente (Aprovado)'}
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Disponibilidade</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Atividade / Ausência</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Retorno Estimado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamStatus.map(member => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-8">
                  <span className="font-extrabold text-slate-900 text-lg">{member.name}</span>
                  <p className="text-xs text-slate-400 font-medium">{member.email}</p>
                </td>
                <td className="px-10 py-8">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full mb-1 ${member.isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-rose-500 shadow-lg shadow-rose-200'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${member.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {member.isOnline ? 'Disponível' : 'Ausente'}
                    </span>
                  </div>
                </td>
                <td className="px-10 py-8">
                  {member.isOnline ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-2xl text-sm">Produzindo</span>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{member.currentAbsence?.type}</span>
                      <span className="text-xs text-slate-500 italic mt-1">"{member.currentAbsence?.reason}"</span>
                    </div>
                  )}
                </td>
                <td className="px-10 py-8 text-sm font-bold text-slate-800">
                  {member.isOnline ? '-' : (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-300" />
                      {new Date(member.currentAbsence?.endDate || '').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
