/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
  Search,
  Menu,
  Lock,
  LogIn
} from 'lucide-react';
import { User, Absence, TeamMemberStatus, Tab } from './types';
import { n8nService } from './services/n8nService';

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Tacio Santos', email: 'tsantos@ccmtecnologia.com.br', role: 'employee', jornada: '08:00 - 18:00' },
  { id: '2', name: 'Luciano Martins', email: 'lmartins@ccmtecnologia.com.br', role: 'admin', jornada: '09:00 - 19:00' },
  { id: '3', name: 'Brenda Costa', email: 'bcosta@ccmtecnologia.com.br', role: 'employee', jornada: '08:00 - 18:00' },
];

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'P@$$ccmWar') {
      onLogin();
    } else {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Área administrativa</h2>
          <p className="text-sm text-slate-500 font-medium">Acesse para gerenciar sua squad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-xs text-rose-600 font-bold text-center">{error}</p>}
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
            Entrar no Painel
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => window.location.href = '/status'}
            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
          >
            Voltar para Status Público
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ccm_auth') === 'true';
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newMember, setNewMember] = useState({ name: '', email: '', jornada: '' });
  const [loading, setLoading] = useState(true);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('ccm_auth', 'true');
    navigate('/');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ccm_auth');
    navigate('/status');
  };

  // Sync activeTab with URL
  useEffect(() => {
    const path = location.pathname.substring(1);
    let tab: Tab = 'dashboard';
    if (path === 'status') tab = 'status';
    else if (path === 'pending') tab = 'pending';
    else if (path === 'history') tab = 'history';
    else if (path === 'calendar') tab = 'calendar';
    else if (path === 'reports') tab = 'monthly_report';
    else if (path === 'users') tab = 'users';
    
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    if (tab === 'dashboard') navigate('/');
    else if (tab === 'monthly_report') navigate('/reports');
    else navigate(`/${tab}`);
  };

  // Update clock every second for precision
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync data from n8n on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedAbsences] = await Promise.all([
          n8nService.fetchUsers(),
          n8nService.fetchAbsences()
        ]);
        
        if (fetchedUsers.length > 0) setUsers(fetchedUsers);
        setAbsences(fetchedAbsences);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // CRITICAL LOGIC: Calculate real-time online status including 1h12m lunch break
  const teamStatus: TeamMemberStatus[] = useMemo(() => {
    const now = currentTime.getTime();
    
    return users.map(user => {
      // 1. Check for official absences (vacation, medical, etc.)
      const activeAbsence = absences.find(abs => {
        const isSameUser = (abs.userId === user.id || abs.userId === user.email);
        const isApproved = abs.status === 'approved';
        const start = new Date(abs.startDate).getTime();
        const end = new Date(abs.endDate).getTime();
        return isSameUser && isApproved && now >= start && now <= end;
      });

      // 2. Logic for 1:12h interval (72 minutes)
      let isOnInterval = false;
      if (user.intervalo) {
        const [hours, minutes] = user.intervalo.split(':').map(Number);
        const intervalStart = new Date(currentTime);
        intervalStart.setHours(hours, minutes, 0, 0);
        const intervalEnd = new Date(intervalStart.getTime() + 72 * 60000);

        if (now >= intervalStart.getTime() && now <= intervalEnd.getTime()) {
          isOnInterval = true;
        }
      }

      const isOffline = !!activeAbsence || isOnInterval;

      return {
        ...user,
        isOnline: !isOffline,
        currentAbsence: isOnInterval 
          ? { type: 'Intervalo (1:12h)', startDate: '', endDate: '', status: 'approved', userId: user.id, userName: user.name, requestedAt: '' } as Absence
          : activeAbsence || null
      };
    });
  }, [users, absences, currentTime]);

  const checkCollaboratorStatus = useCallback((identifier: string) => {
    if (!identifier) return null;
    
    const searchKey = identifier.toLowerCase();
    const collaborator = teamStatus.find(m => 
      m.name.toLowerCase().includes(searchKey) || 
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
  }, [teamStatus]);

  const handleApprove = (id: string) => {
    const absence = absences.find(a => a.id === id);
    if (!absence) return;
    
    const updatedAbsence: Absence = { ...absence, status: 'approved' };
    setAbsences(prev => prev.map(a => a.id === id ? updatedAbsence : a));
    n8nService.updateAbsenceStatus(updatedAbsence);
  };

  const handleReject = (id: string) => {
    const absence = absences.find(a => a.id === id);
    if (!absence) return;

    const updatedAbsence: Absence = { ...absence, status: 'rejected' };
    setAbsences(prev => prev.map(a => a.id === id ? updatedAbsence : a));
    n8nService.updateAbsenceStatus(updatedAbsence);
  };

  const deleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      n8nService.deleteUser(id);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;
  
    const newUser: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: newMember.name, 
      email: newMember.email, 
      role: 'employee',
      jornada: newMember.jornada
    };
  
    setUsers([...users, newUser]);
    n8nService.saveUser(newUser);
    setNewMember({ name: '', email: '', jornada: '' });
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

  const brTimeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const brDateStr = currentTime.toLocaleDateString('pt-BR');

  if (location.pathname === '/login' && !isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-[#111827] text-white flex flex-col overflow-y-auto z-50 lg:z-40 transition-all duration-300 ${
        isSidebarOpen 
          ? 'w-64 translate-x-0' 
          : 'w-0 lg:w-0 -translate-x-full lg:translate-x-0 lg:hidden'
      }`}>
        <div className="p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-3xl font-black tracking-tighter">CCM</span>
            <div className="bg-blue-600 p-1 rounded-lg shadow-lg shadow-blue-500/20">
               <Activity size={20} className="text-white" />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Squad Warriors</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 py-2">
          {isAuthenticated ? (
            <>
              <SidebarLink active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={18}/>} label="Visão Geral" />
              <SidebarLink active={activeTab === 'status'} onClick={() => handleTabChange('status')} icon={<Activity size={18}/>} label="Tempo Real" />
              <SidebarLink active={activeTab === 'pending'} onClick={() => handleTabChange('pending')} icon={<Clock size={18}/>} label="Solicitações" badge={absences.filter(a => a.status === 'pending').length} />
              <SidebarLink active={activeTab === 'history'} onClick={() => handleTabChange('history')} icon={<CheckCircle size={18}/>} label="Histórico" />
              <SidebarLink active={activeTab === 'calendar'} onClick={() => handleTabChange('calendar')} icon={<Calendar size={18}/>} label="Calendário" />
              <SidebarLink active={activeTab === 'monthly_report'} onClick={() => handleTabChange('monthly_report')} icon={<FileSpreadsheet size={18}/>} label="Relatórios" />
              <div className="pt-2 pb-1">
                 <div className="h-px bg-slate-800 mx-3" />
              </div>
              <SidebarLink active={activeTab === 'users'} onClick={() => handleTabChange('users')} icon={<Users size={18}/>} label="Equipe" />
            </>
          ) : (
            <>
              <SidebarLink active={activeTab === 'status'} onClick={() => handleTabChange('status')} icon={<Activity size={18}/>} label="Tempo Real" />
              <SidebarLink active={false} onClick={() => navigate('/login')} icon={<LogIn size={18}/>} label="Login" />
            </>
          )}
        </nav>

        <div className="p-4 m-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Horário Local</div>
            <div className="text-xs font-medium text-slate-300">{brDateStr}</div>
            <div className="text-xl font-black text-white font-mono">{brTimeStr}</div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 min-w-0 p-3 md:p-6 relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Painel de Controle'}
              {activeTab === 'status' && 'Status da Squad'}
              {activeTab === 'pending' && 'Pendências'}
              {activeTab === 'history' && 'Histórico'}
              {activeTab === 'calendar' && 'Consulta por Data'}
              {activeTab === 'monthly_report' && 'Exportação'}
              {activeTab === 'users' && 'Time'}
            </h2>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
              Gerenciamento em tempo real
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </div>
          <div className="flex items-center gap-3">
             {isAuthenticated ? (
               <>
                 <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hidden md:flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">AG</div>
                    <div className="text-right">
                       <p className="text-[11px] font-bold text-slate-800 leading-none">Admin Gestor</p>
                    </div>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                   title="Sair"
                 >
                   <LogOut size={18} />
                 </button>
               </>
             ) : (
               <button 
                 onClick={() => navigate('/login')}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
               >
                 <LogIn size={16} /> Entrar
               </button>
             )}
          </div>
        </header>

        {loading && (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="font-bold text-slate-600 animate-pulse uppercase tracking-widest text-[10px]">Sincronizando...</p>
          </div>
        )}

        <div className="space-y-4 max-w-7xl mx-auto">
          <Routes>
            <Route path="/status" element={<StatusBoardView teamStatus={teamStatus} checkStatus={checkCollaboratorStatus} />} />
            
            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Squad Online" 
                    value={teamStatus.filter(s => s.isOnline).length.toString()} 
                    icon={<Activity size={20} />} 
                    color="emerald" 
                    subValue={`Ativos`}
                    onClick={() => handleTabChange('status')}
                  />
                  <StatCard 
                    title="Pendentes" 
                    value={absences.filter(a => a.status === 'pending').length.toString()} 
                    icon={<Clock size={20} />} 
                    color="orange" 
                    subValue="Aguardando"
                    onClick={() => handleTabChange('pending')}
                    highlight={absences.filter(a => a.status === 'pending').length > 0}
                  />
                  <StatCard 
                    title="Aprovados" 
                    value={absences.filter(a => a.status === 'approved').length.toString()} 
                    icon={<CheckCircle size={20} />} 
                    color="blue" 
                    subValue="Este mês"
                    onClick={() => handleTabChange('history')}
                  />
                  <StatCard 
                    title="Equipe" 
                    value={users.length.toString()} 
                    icon={<Users size={20} />} 
                    color="indigo" 
                    subValue="Integrantes"
                    onClick={() => handleTabChange('users')}
                  />
                </div>

                <div className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <div className="w-1 h-5 bg-blue-600 rounded-full"/>
                      Resumo Squad
                    </h3>
                    <button onClick={() => handleTabChange('status')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all uppercase tracking-widest">Ver Tudo</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {teamStatus.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 group">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${member.isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {member.name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                {member.isOnline && <div className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[120px] leading-tight text-sm" title={member.name}>{member.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{member.isOnline ? 'Ativo' : (member.currentAbsence?.type || 'Offline')}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.isOnline ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                          {member.isOnline ? 'On' : 'Off'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <Navigate to="/status" />} />
            
            <Route path="/calendar" element={isAuthenticated ? <CalendarView absences={absences} /> : <Navigate to="/status" />} />
            <Route path="/pending" element={isAuthenticated ? (
              <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Motivo</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Período</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absences
                        .filter(a => a.status === 'pending')
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        .map(abs => (
                        <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="font-bold text-slate-900 text-base leading-tight">{abs.userName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{new Date(abs.requestedAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                              {abs.type}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col text-[11px]">
                                <div className="font-bold text-slate-700">
                                  {new Date(abs.startDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-bold text-slate-400">
                                  {new Date(abs.endDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleApprove(abs.id)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100" title="Aprovar">
                                <Check size={16} />
                              </button>
                              <button onClick={() => handleReject(abs.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-100" title="Reprovar">
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {absences.filter(a => a.status === 'pending').length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center opacity-40">
                                <CheckCircle size={32} className="text-emerald-400 mb-2" />
                                <p className="text-sm font-bold text-slate-400">Sem pendências</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <Navigate to="/status" />} />
            <Route path="/history" element={isAuthenticated ? (
              <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Motivo</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Duração</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absences
                        .filter(a => a.status === 'approved' || a.status === 'rejected')
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        .map(abs => (
                        <tr key={abs.id} className="hover:bg-slate-50/30">
                          <td className="px-6 py-3 font-bold text-slate-900 text-sm">{abs.userName}</td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] text-slate-600 font-medium px-2 py-0.5 bg-slate-100 rounded-lg">{abs.type}</span>
                          </td>
                          <td className="px-6 py-3 text-[11px] text-slate-500 font-medium">
                            {new Date(abs.startDate).toLocaleDateString()} — {new Date(abs.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                              abs.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${abs.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {abs.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {absences.filter(a => a.status === 'approved' || a.status === 'rejected').length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                            Nenhum registro no histórico.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <Navigate to="/status" />} />
            <Route path="/reports" element={isAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                      <Download size={24} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Relatório Mensal</h4>
                      <p className="text-xs text-slate-500 font-medium">Extrair atividades consolidadas.</p>
                    </div>
                  </div>
                  <button onClick={downloadXLSX} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-emerald-200 active:scale-95 text-sm">
                    <Download size={18} /> Baixar CSV
                  </button>
                </div>
              </div>
            ) : <Navigate to="/status" />} />
            <Route path="/users" element={isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-blue-200 text-sm">
                    <Plus size={20} /> Novo Integrante
                  </button>
                </div>
                
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Membro</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">E-mail</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs">{user.name.charAt(0)}</div>
                                <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-500 font-medium text-xs">{user.email}</td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-300 hover:text-rose-600 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <Navigate to="/status" />} />
            
            {/* Catch-all redirect to status if not authenticated */}
            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/status"} />} />
          </Routes>
        </div>
      </main>

      {/* Modal User Registration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Novo Integrante</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="Ex: Jhon Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">E-mail Corporativo</label>
                <input 
                  type="email" 
                  value={newMember.email}
                  onChange={e => setNewMember({...newMember, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="Ex: jhondoe@ccm..."
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jornada</label>
                <input 
                  type="text" 
                  value={newMember.jornada}
                  onChange={e => setNewMember({...newMember, jornada: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="Ex: 08:00 - 18:00"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20">
                Efetivar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

const CalendarView: React.FC<{ absences: Absence[] }> = ({ absences }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const setRange = (type: 'today' | 'week' | 'month') => {
    const start = new Date();
    const end = new Date();
    
    if (type === 'today') {
      // Já está configurado como hoje
    } else if (type === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para segunda-feira
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else if (type === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const filteredAbsences = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const rangeStart = new Date(startDate + 'T00:00:00').getTime();
    const rangeEnd = new Date(endDate + 'T23:59:59').getTime();

    return absences
      .filter(abs => {
        if (abs.status !== 'approved') return false;
        
        const absStart = new Date(abs.startDate).getTime();
        const absEnd = new Date(abs.endDate).getTime();
        
        return absStart <= rangeEnd && absEnd >= rangeStart;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [absences, startDate, endDate]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Filtrar Período</h3>
              <p className="text-xs text-slate-500 font-medium">Consulte ausências aprovadas por data.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setRange('today')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 transition-all"
            >
              Hoje
            </button>
            <button 
              onClick={() => setRange('week')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 transition-all"
            >
              Esta Semana
            </button>
            <button 
              onClick={() => setRange('month')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 transition-all"
            >
              Este Mês
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
            <div className="relative">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total Encontrado</p>
              <p className="text-2xl font-black text-blue-600">{filteredAbsences.length}</p>
            </div>
            <div className="text-blue-200">
              <FileSpreadsheet size={32} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Motivo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Horário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAbsences.map(abs => (
                <tr key={abs.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs">
                        {abs.userName.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{abs.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] text-slate-600 font-medium px-2 py-0.5 bg-slate-100 rounded-lg">{abs.type}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-[11px] font-bold text-slate-700">
                      {new Date(abs.startDate).toLocaleDateString('pt-BR')} {new Date(abs.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      até {new Date(abs.endDate).toLocaleDateString('pt-BR')} {new Date(abs.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Aprovado
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAbsences.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Calendar size={32} className="text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-400">Nenhuma ausência aprovada para este período</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SidebarLink: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  badge?: number;
}> = ({ active, onClick, icon, label, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
      active ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}>
    <div className="flex items-center gap-3">
      <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}>{icon}</span>
      <span className="text-xs tracking-tight">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black">
        {badge}
      </span>
    )}
  </button>
);

const StatCard: React.FC<{ 
  title: string, value: string, icon: React.ReactNode, color: string, subValue: string, onClick: () => void, highlight?: boolean
}> = ({ title, value, icon, color, subValue, onClick, highlight }) => (
  <div onClick={onClick} className={`p-5 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group hover:scale-[1.02] ${
      highlight ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-200' : 'bg-white border-slate-200 shadow-sm'
    }`}>
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{title}</p>
        <p className={`text-3xl font-black mt-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-2xl ${highlight ? 'bg-blue-500' : `bg-slate-50`}`}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
          size: 20, className: highlight ? 'text-white' : (icon as any).props?.className 
        })}
      </div>
    </div>
    <div className={`mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest ${highlight ? 'border-blue-500/50 text-blue-200' : 'border-slate-50 text-slate-400'}`}>
      {subValue}
    </div>
  </div>
);

const StatusBoardView: React.FC<{ 
  teamStatus: TeamMemberStatus[], checkStatus: (id: string) => any 
}> = ({ teamStatus, checkStatus }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = () => {
    const res = checkStatus(searchValue);
    setSearchResult(res);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Validar por nome ou e-mail..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium transition-all"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="w-full md:w-auto bg-[#111827] text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-black transition-all">
          Validar
        </button>
      </div>

      {searchResult && (
        <div className={`p-6 rounded-[1.5rem] border shadow-xl animate-in slide-in-from-top-4 duration-300 relative overflow-hidden ${searchResult.success ? 'bg-white border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
           <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado Validação</p>
                <h4 className="text-xl font-black text-slate-900 leading-tight">{searchResult.success ? searchResult.name : 'Não encontrado'}</h4>
                <p className={`text-sm font-medium mt-1 ${searchResult.success ? 'text-slate-600' : 'text-rose-600'}`}>
                  {searchResult.message}
                </p>
              </div>
              {searchResult.success && (
                <div className="flex flex-col items-end">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase shadow-sm ${searchResult.isOnline ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                     <div className={`w-2 h-2 rounded-full ${searchResult.isOnline ? 'bg-emerald-500 status-pulse' : 'bg-rose-500'}`} />
                     {searchResult.isOnline ? 'On' : 'Off'}
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Membro</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Motivo</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Jornada</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Intervalo</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Local</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Retorno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamStatus.map(member => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${member.isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {member.name.charAt(0)}
                       </div>
                       <div>
                          <span className="font-black text-slate-900 text-base block leading-none">{member.name}</span>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{member.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${member.isOnline ? 'bg-emerald-500 status-pulse' : 'bg-rose-500'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${member.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {member.isOnline ? 'On' : 'Off'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {member.isOnline ? (
                      <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">Livre</span>
                    ) : (
                      <span className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[100px] block">{member.currentAbsence?.type}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">
                    {member.jornada ? (
                      <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                        {member.jornada}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">
                    {member.intervalo ? (
                      <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
                        {member.intervalo}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">
                    {member.local ? (
                      <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
                        {member.local}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">
                    {!member.isOnline && member.currentAbsence?.endDate ? (
                      <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg">
                        {new Date(member.currentAbsence.endDate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
