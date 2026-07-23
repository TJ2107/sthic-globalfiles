
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { GlobalFileRow } from './types';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { Dashboard } from './components/Dashboard';
import { DailyStatus } from './components/DailyStatus';
import { TTFAnalysis } from './components/TTFAnalysis';
import { GMSheet } from './components/GMSheet';
import { TASAnalysis } from './components/TASAnalysis';
import { PMTracker } from './components/PMTracker';
import { BatteryTracker } from './components/BatteryTracker';
import { BeltTracker } from './components/BeltTracker';
import { ExportManager } from './components/ExportManager';
import { FEModule } from './components/FEModule';
import { ActivityReport } from './components/ActivityReport';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsPanel } from './components/SettingsPanel';
import { MigrationAssistant } from './components/MigrationAssistant';
import { MobilePortal } from './components/MobilePortal';
import { 
  Layout, Database, PieChart, Calendar, Timer, 
  Briefcase, Battery, Settings2, Loader2, 
  Download, Settings, Menu, X, ChevronRight, ClipboardList,
  PanelLeftClose, PanelLeftOpen, ClipboardCheck,
  Bell, ArrowRight, ShieldAlert, LogOut, Users, BarChart3,
  ArrowLeft, Home, CheckCircle2
} from 'lucide-react';

import { parseDate } from './utils/dateHelpers';

import { useAuth } from './components/AuthProvider';
import { LoginView } from './components/LoginView';
import { logout } from './firebase';
import { saveToFirebase, fetchFromFirebase } from './firebaseData';

const App: React.FC = () => {
  const { user, role } = useAuth();

  const [data, setData] = useState<GlobalFileRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbQuotaError, setDbQuotaError] = useState<boolean>(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager' || role === 'Admin';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Effect to handle late-arriving admin status and empty data
  useEffect(() => {
    if (!isLoading && data.length === 0) {
      setActiveTab(isManager ? 'upload' : (isMobileOrTablet ? 'portal' : 'dashboard'));
    }
  }, [isManager, isLoading, data.length, isMobileOrTablet]);

  // State for alert thresholds
  const [batteryThreshold, setBatteryThreshold] = useState<number>(7);
  const [beltThreshold, setBeltThreshold] = useState<number>(180);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isNightMode]);
  const globalAlerts = useMemo(() => {
    const alerts: { id: string; type: 'CRITICAL' | 'WARNING'; category: string; title: string; desc: string; swo?: string }[] = [];
    const now = new Date();

    if (!data || !Array.isArray(data) || data.length === 0) return alerts;

    const batterySites: Record<string, { date: Date, swo: string }> = {};
    const beltSites: Record<string, { date: Date, swo: string }> = {};

    data.forEach(row => {
      if (!row) return;
      const desc = String(row["Description"] || "").toLowerCase();
      const site = String(row["Nom du site"] || "Unknown").trim().toUpperCase();
      const date = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const swo = String(row["N° SWO"]);
      const swoState = String(row["State SWO"] || "").toLowerCase();
      
      if (!date) return;

      // Strict search for battery replacements based on user request
      const batteryKeywords = [
        "swap battery ge", 
        "remplacement batterie ge", 
        "remplacement battery ge"
      ];
      const isBatteryTask = batteryKeywords.some(k => desc.includes(k));

      if (isBatteryTask && swoState === 'closed') {
        if (!batterySites[site] || date > batterySites[site].date) {
          batterySites[site] = { date, swo };
        }
      }
      
      if (desc.includes("courroie")) {
        if (!beltSites[site] || date > beltSites[site].date) beltSites[site] = { date, swo };
      }
    });

    // Alertes Batteries
    Object.entries(batterySites).forEach(([site, info]) => {
      const months = (now.getFullYear() - info.date.getFullYear()) * 12 + (now.getMonth() - info.date.getMonth());
      if (months >= batteryThreshold) {
        alerts.push({ id: `bat-${site}`, type: 'CRITICAL', category: 'Batterie', title: site, desc: `Expirée (${months} mois)`, swo: info.swo });
      }
    });

    // Alertes Courroies
    Object.entries(beltSites).forEach(([site, info]) => {
      const diffDays = Math.floor((now.getTime() - info.date.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= beltThreshold) {
        alerts.push({ id: `belt-${site}`, type: 'CRITICAL', category: 'Courroie', title: site, desc: `Seuil 1000h dépassé (${diffDays}j)`, swo: info.swo });
      }
    });

    return alerts;
  }, [data, batteryThreshold, beltThreshold]);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(row => {
      if (!row) return false;
      return Object.entries(filters).every(([key, filterValue]) => {
        const val = filterValue as string;
        if (!val) return true;
        if (val.startsWith('DATE_RANGE|')) return true; 

        const cellValue = row[key];
        const cellString = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
        return cellString.toLowerCase().includes(val.toLowerCase());
      });
    });
  }, [data, filters]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const dbData = await fetchFromFirebase();
        const isMobile = window.innerWidth < 1024;
        if (Array.isArray(dbData) && dbData.length > 0) {
          // Sort data by most recent date by default (Closing date or Date de Clôture)
          const sortedData = [...dbData].sort((a, b) => {
            const dateA = parseDate(a["Closing date"]) || parseDate(a["Date de Clôture"]) || new Date(0);
            const dateB = parseDate(b["Closing date"]) || parseDate(b["Date de Clôture"]) || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          setData(sortedData);
          setActiveTab(isMobile ? 'portal' : 'dashboard');
        } else {
          setActiveTab(isAdmin ? 'upload' : (isMobile ? 'portal' : 'dashboard'));
        }
      } catch (error) {
        console.error('Error fetching data from Firebase:', error);
        const isMobile = window.innerWidth < 1024;
        setActiveTab(isAdmin ? 'upload' : (isMobile ? 'portal' : 'dashboard'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, isAdmin]);



  useEffect(() => {
    const savedSettings = localStorage.getItem('globalFiles_settings');
    if (savedSettings) {
      try {
        const { batteryThreshold, beltThreshold } = JSON.parse(savedSettings);
        if (typeof batteryThreshold === 'number') setBatteryThreshold(batteryThreshold);
        if (typeof beltThreshold === 'number') setBeltThreshold(beltThreshold);
      } catch (e) { 
        console.error("Failed to parse settings from localStorage", e); 
      }
    }
  }, []);

  const handleDataLoaded = async (newData: GlobalFileRow[], append: boolean) => {
    setIsLoading(true);
    setDbQuotaError(false);
    try {
      console.log(`Starting Firebase save process. Total rows: ${newData.length}, Append: ${append}`);
      await saveToFirebase(newData, append);
      
      console.log('Firebase chunks saved. Re-fetching data...');
      
      const dbData = await fetchFromFirebase();
      console.log(`Data re-fetched from Firebase. Total rows: ${dbData.length}`);
      
      setData(dbData);
      alert('Données sauvegardées avec succès !');
    } catch (error) {
      console.error('CRITICAL: Error saving data:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded') || errMsg.includes('quota')) {
        setDbQuotaError(true);
      } else {
        alert('Erreur lors de la sauvegarde des données: ' + errMsg);
      }
    } finally {
      setIsLoading(false);
    }
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  const handleSaveFullDatabase = async () => {
    if (!window.confirm("Voulez-vous vraiment sauvegarder les modifications dans Row Data ?")) return;
    setIsLoading(true);
    setDbQuotaError(false);
    try {
      await saveToFirebase(data, false);
      alert('Row Data mis à jour avec succès !');
    } catch (error) {
      console.error('Error updating database:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded') || errMsg.includes('quota')) {
        setDbQuotaError(true);
      } else {
        alert('Erreur lors de la mise à jour: ' + errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertClick = (swo?: string) => {
    if (swo) {
      setFilters({ "N° SWO": swo });
      setActiveTab('data');
    }
    setIsNotifOpen(false);
  };

  const handleSaveSettings = (newBattery: number, newBelt: number) => {
    setBatteryThreshold(newBattery);
    setBeltThreshold(newBelt);
    localStorage.setItem('globalFiles_settings', JSON.stringify({ batteryThreshold: newBattery, beltThreshold: newBelt }));
    setActiveTab('dashboard');
  };

  const NavButton = ({ id, label, icon: Icon, colorClass, isNew }: { id: string, label: string, icon: React.ElementType, colorClass?: string, isNew?: boolean }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3.5 py-3 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 relative ${
          isActive 
            ? (colorClass || 'bg-slate-900 text-indigo-400 border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] translate-x-1') 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
        }`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative flex items-center justify-center">
            <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {isNew && !isActive && <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>}
          </div>
          {!isSidebarCollapsed && <span className="truncate">{label}</span>}
        </div>
        {!isSidebarCollapsed && isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
        {!isSidebarCollapsed && isActive && <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-indigo-500 rounded-full"></span>}
      </button>
    );
  };

  if (!user) {
    return <LoginView />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {needsMigration && <MigrationAssistant onMigrationComplete={() => window.location.reload()} />}
      {/* NOTIFICATION DRAWER */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-6 bg-indigo-700 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                   <Bell className="w-6 h-6" /> Alertes Critiques
                 </h3>
                 <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50/50">
                 {globalAlerts.length > 0 ? globalAlerts.map(alert => (
                   <div key={alert.id} onClick={() => handleAlertClick(alert.swo)} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-rose-500 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded-lg uppercase tracking-widest">{alert.category}</span>
                        <ShieldAlert className="w-4 h-4 text-rose-300 group-hover:text-rose-500 transition-colors" />
                      </div>
                      <h4 className="font-black text-slate-800 uppercase text-xs">{alert.title}</h4>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">{alert.desc}</p>
                      <div className="mt-3 pt-2 border-t border-dashed flex justify-between items-center">
                         <span className="text-[9px] font-mono text-slate-400">SWO: {alert.swo}</span>
                         <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                   </div>
                 )) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                      <p className="font-black uppercase tracking-widest text-xs">Aucune alerte active</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 bg-slate-950 border-r border-slate-900 z-[70] transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.3)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-slate-900 text-slate-300 p-1 rounded-full border border-slate-800 shadow-lg z-[80] hover:scale-110 active:scale-95 transition-all">
          {isSidebarCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>

        <div className={`pt-6 pb-4 px-4 flex flex-col items-center transition-all ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3 w-full px-2 py-3 border-b border-slate-900/80 mb-4 justify-start">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/15 flex items-center justify-center relative shadow-inner w-10 h-10 shrink-0">
              <Settings className="w-5 h-5 text-indigo-400 animate-[spin_20s_linear_infinite]" />
            </div>
            {!isSidebarCollapsed && (
              <div className="text-left">
                <h1 className="text-sm font-black tracking-wider text-slate-100 font-display leading-tight uppercase">
                  Global <span className="text-indigo-400">Files</span>
                </h1>
                <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Enterprise App</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {data.length > 0 && <NavButton id="portal" label="Portail d'Accueil" icon={Home} />}
          {isAdmin && <NavButton id="upload" label="Import Excel" icon={Database} />}
          {data.length > 0 && (
            <>
              {isAdmin && <div className="h-px bg-slate-900/80 my-2 mx-2"></div>}
              <NavButton id="dashboard" label="Analyses Globales" icon={PieChart} />
              <NavButton id="rapport" label="Rapport d'Activité" icon={BarChart3} colorClass="bg-slate-900 text-indigo-400 border border-slate-800/80" isNew={true} />
              <NavButton id="data" label="Row Data" icon={Layout} />
              <NavButton id="daily" label="Daily Status" icon={Calendar} />
              <NavButton id="ttf" label="Analyse TTF" icon={Timer} />
              {isAdmin && <NavButton id="gm" label="Feuille GM" icon={Briefcase} />}
              <NavButton id="tas" label="Analyse TAS" icon={ClipboardList} />
              <NavButton id="pm" label="PM Statut" icon={ClipboardCheck} />
              <NavButton id="fe_module" label="Module FE" icon={Users} />
              <NavButton id="battery" label="Parc Batteries" icon={Battery} />
              <NavButton id="belt" label="Audit Courroies" icon={Settings2} />
              <div className="h-px bg-slate-900/80 my-3 mx-2"></div>
              <NavButton id="export" label="Pôle d'Exportation" icon={Download} />
              <NavButton id="settings" label="Paramètres du Système" icon={Settings} colorClass="bg-red-500/10 text-red-300 border border-red-950" />
            </>
          )}
        </nav>

        {/* SIDEBAR NOTIFICATION CENTER BUTTON AND LOGOUT */}
        <div className="p-3 border-t border-slate-900/80 bg-slate-950/80 flex flex-col gap-2">
          {data.length > 0 && (
             <button 
                onClick={() => setIsNotifOpen(true)}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition-all group border border-slate-900`}
             >
                <div className="relative">
                   <Bell className="w-4.5 h-4.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                   {globalAlerts.length > 0 && (
                     <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold text-white shadow-lg">
                        {globalAlerts.length}
                     </span>
                   )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">Alertes Système</p>
                    <p className="text-[8px] font-semibold text-slate-500 uppercase">{globalAlerts.length} anomalies</p>
                  </div>
                )}
             </button>
          )}

          <button 
             onClick={logout}
             className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-xl bg-rose-950/20 hover:bg-rose-900/30 transition-all group border border-rose-950/50 hover:border-rose-900`}
          >
             <LogOut className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" />
             {!isSidebarCollapsed && (
               <span className="text-[10px] font-semibold text-rose-300 group-hover:text-rose-200 uppercase tracking-wider">
                 Déconnexion
               </span>
             )}
          </button>
          {!isSidebarCollapsed && (
            <div className="text-center mt-2">
              <p className="text-[9px] text-slate-500 font-medium">© 2026 Empreintes Tech.</p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f8fafc]">
        {/* Sleek top header for both mobile & desktop */}
        <header className="bg-white border-b border-slate-200/60 p-4 flex justify-between items-center z-50 transition-colors shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 transition-colors"><Menu className="w-5 h-5" /></button>
            {isMobileOrTablet && activeTab !== 'portal' && data.length > 0 && (
              <button 
                onClick={() => setActiveTab('portal')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase transition-all duration-200 active:scale-95 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modules</span>
              </button>
            )}
            <div className="hidden lg:flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Moteur Row Data Opérationnel</span>
            </div>
          </div>
          
          <h1 className="lg:hidden text-md font-bold text-slate-900 font-display uppercase tracking-wider">
            Global <span className="text-indigo-600">Files</span>
          </h1>

          <div className="flex items-center gap-4">
            {/* User credentials badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 font-black text-[9px] flex items-center justify-center uppercase">
                {user.email ? user.email[0] : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-black text-slate-800 leading-none truncate max-w-[120px]">{user.email}</p>
                <p className="text-[8px] font-bold text-indigo-500 leading-none uppercase mt-0.5">{role || 'Rôle'}</p>
              </div>
            </div>

            <button onClick={() => setIsNotifOpen(true)} className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors duration-200">
              <Bell className="w-5 h-5" />
              {globalAlerts.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-600 rounded-full"></span>}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
          <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>}>
            {isLoading ? (
              <div className="h-full flex flex-col gap-4 items-center justify-center text-indigo-400">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="font-bold animate-pulse">Chargement des données depuis Row Data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'upload' && isAdmin && <div className="h-full flex items-center justify-center p-6"><FileUpload existingDataCount={data.length} onDataLoaded={handleDataLoaded} /></div>}
                {data.length > 0 ? (
                  <div className="h-full">
                    {activeTab === 'portal' && (
                      <div className="overflow-auto h-full bg-slate-50 dark:bg-slate-950">
                        <MobilePortal 
                          role={role}
                          activeTab={activeTab}
                          onSelectTab={setActiveTab}
                          dataCount={data.length}
                          alertsCount={globalAlerts.length}
                          onOpenAlerts={() => setIsNotifOpen(true)}
                        />
                      </div>
                    )}
                    {activeTab === 'dashboard' && <div className="overflow-auto h-full"><Dashboard data={data} onFilterChange={(col, val) => setFilters(prev => ({ ...prev, [col]: val }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'rapport' && <div className="overflow-auto h-full"><ActivityReport data={data} /></div>}
                    {activeTab === 'data' && <div className="p-6 h-full"><DataTable data={data} setData={setData} onUpdateRow={(idx, f, v) => setData(prev => { const n = [...prev]; n[idx] = { ...n[idx], [f]: v }; return n; })} filters={filters} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onApplyFilters={setFilters} onSaveDatabase={handleSaveFullDatabase} canEdit={isAdmin || isManager} /></div>}
                    {activeTab === 'daily' && <div className="overflow-auto h-full"><DailyStatus data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'ttf' && <div className="overflow-auto h-full"><TTFAnalysis data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'gm' && isAdmin && <div className="overflow-auto h-full"><GMSheet data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'tas' && <div className="overflow-auto h-full"><TASAnalysis data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'pm' && <div className="overflow-auto h-full"><PMTracker data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'fe_module' && <div className="overflow-auto h-full"><FEModule data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                    {activeTab === 'battery' && <div className="overflow-auto h-full"><BatteryTracker data={data} thresholdMonths={batteryThreshold} /></div>}
                    {activeTab === 'belt' && <div className="overflow-auto h-full"><BeltTracker data={data} thresholdDays={beltThreshold} /></div>}
                    {activeTab === 'export' && <div className="overflow-auto h-full"><ExportManager allData={data} filteredData={filteredData} onImport={(data) => handleDataLoaded(data, false)} isAdmin={isAdmin} /></div>}
                    {activeTab === 'settings' && (
                      <div className="overflow-y-auto h-full custom-scrollbar">
                        <SettingsPanel 
                          initialBatteryThreshold={batteryThreshold}
                          initialBeltThreshold={beltThreshold}
                          onSave={handleSaveSettings}
                          data={data}
                          setData={setData}
                          onSetActiveTab={setActiveTab}
                          isNightMode={isNightMode}
                          setIsNightMode={setIsNightMode}
                          userRole={role}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  !isManager && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                      <Database className="w-16 h-16 opacity-20" />
                      <p className="font-bold text-lg">Aucune donnée n'est actuellement disponible.</p>
                      <p className="text-sm">Veuillez patienter qu'un administrateur importe des données.</p>
                    </div>
                  )
                )}
              </>
            )}
          </Suspense>
        </main>
      </div>
      
      {/* DATABASE QUOTA EXCEEDED ERROR MODAL */}
      {dbQuotaError && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDbQuotaError(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-slate-100 animate-in zoom-in-95 duration-300">
            <h4 className="text-2xl font-black text-rose-600 flex items-center gap-3 mb-4">
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              <span>Quota Firestore Dépassé</span>
            </h4>
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
              <p>
                L'application a épuisé son quota d'écriture gratuit quotidien Firestore (limité à 20 000 écritures par jour sous le forfait gratuit <strong>Firebase Spark</strong>).
              </p>
              <p>
                Pour éviter d'interrompre vos services, nous avons activé un algorithme de synchronisation intelligente qui réduit drastiquement les écritures à l'avenir. En attendant, pour débloquer votre instance aujourd'hui, vous pouvez :
              </p>
            </div>
            
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-900 font-bold space-y-2 my-5">
              <p>
                Pour réactiver l'import immédiatement, vous pouvez également changer de forfait :
              </p>
              <p className="pt-1">
                👉 <a 
                  href="https://console.firebase.google.com/project/project-79ae2089-3125-4bde-8b5/firestore/databases/ai-studio-e87dc6c2-35c4-4d15-8ac6-32dd9a0a01fa/data?openUpgradeDialog=true" 
                  target="_blank" 
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer" 
                  className="underline font-extrabold text-rose-950 hover:text-rose-800"
                >
                  Ouvrir la Console Firebase du projet (Option Upgrade)
                </a>
              </p>
              <p>
                🎨 <a href="https://firebase.google.com/pricing#cloud-firestore" target="_blank" rel="noopener noreferrer" className="underline font-extrabold text-rose-950 hover:text-rose-800">
                  Consulter les détails des tarifs Spark vs Blaze (Enterprise)
                </a>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDbQuotaError(false)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition text-sm shadow-md active:scale-95 duration-150"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;
