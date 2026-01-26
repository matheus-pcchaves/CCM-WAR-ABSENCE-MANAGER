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
  FileSpreadsheet
} from 'lucide-react';
import { User, Absence, AbsenceStatus, TeamMemberStatus } from './types';
import { n8nService } from './services/n8nService';
import { useColaboradores } from './services/handleUsers'; // Importando o hook

const INITIAL_ABSENCES: Absence[] = [
  { 
    id: 'a1', 
    userId: '1', 
    userName: 'João Silva', 
    type: 'Ausência Parcial', 
    startDate: new Date().toISOString(), 
    endDate: new Date(Date.now() + 3600000).toISOString(), 
    status: 'pending', 
    reason: 'Consulta Médica',
    requestedAt: new Date().toISOString()
  }
];

const App: React.FC = () => {
  type Tab = 'dashboard' | 'pending' | 'history' | 'status' | 'users' | 'monthly_report';
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Consumindo o Hook do n8n
  const externalData = useColaboradores();
  
  // Estado de usuários inicializado vazio, será preenchido pelo Hook
  const [users, setUsers] = useState<User[]>([]);
  const [absences, setAbsences] = useState<Absence[]>(INITIAL_ABSENCES);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '' });

  // Sincroniza os dados do n8n com o estado local 'users'
  useEffect(() => {
    if (externalData && externalData.length > 0) {
      const mappedUsers: User[] = externalData.map((colab, index) => ({
        id: (index + 1).toString(), // Gerando um ID simples se não houver
        name: colab.nome, // Mapeando 'nome' do handleUsers para 'name' do App
        email: colab.email,
        role: 'employee'
      }));
      setUsers(mappedUsers);
    }
  }, [externalData]);

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
        abs.userId === user.id && 
        abs.status === 'approved' &&
        now >= new Date(abs.startDate).getTime() && 
        now <= new Date(abs.endDate).getTime()
      );
      return { ...user, isOnline: !activeAbsence, currentAbsence: activeAbsence };
    });
  }, [users, absences, currentTime]);

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
        </header>

        <div className="space-y-8">
          {activeTab === 'dashboard' && <DashboardView absences={absences} teamStatus={teamStatus} setActiveTab={setActiveTab} />}
          {activeTab === 'status' && <StatusBoardView teamStatus={teamStatus} />}
          
          {activeTab === 'pending' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Decisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absences.filter(a => a.status === 'pending').map(abs => (
                    <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-800">{abs.userName}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleApprove(abs.id)} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-sm">
                            <Check size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-bold text-slate-800">{user.name}</td>
                        <td className="px-8 py-6 text-slate-600 font-medium">{user.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Registro */}
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
                  placeholder="Ex: João Silva"
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
                  placeholder="Ex: joao@ccm.com"
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
    </div>
  );
};

// --- Sub-componentes (SidebarLink, DashboardView, etc) permanecem os mesmos conforme fornecidos ---
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
      <div className={`p-4 rounded-3xl ${highlight ? 'bg-orange-500' : `bg-blue-50`}`}>
        {icon}
      </div>
    </div>
    <div className={`mt-6 pt-4 border-t text-[10px] font-bold uppercase tracking-widest ${highlight ? 'border-orange-500/50 text-orange-200' : 'border-slate-50 text-slate-400'}`}>
      {subValue}
    </div>
  </div>
);

const StatusBoardView: React.FC<{ teamStatus: TeamMemberStatus[] }> = ({ teamStatus }) => (
  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
          <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Disponibilidade</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {teamStatus.map(member => (
          <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
            <td className="px-10 py-8">
              <span className="font-extrabold text-slate-900 text-lg">{member.name}</span>
              <p className="text-xs text-slate-400 font-medium">{member.email}</p>
            </td>
            <td className="px-10 py-8 text-center">
               <div className={`w-4 h-4 rounded-full mx-auto ${member.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default App;