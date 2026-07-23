
import React, { useMemo, useRef, useState } from 'react';
import { GlobalFileRow } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LabelList 
} from 'recharts';
import { ThreeDBarVertical, ThreeDBarHorizontal } from './ThreeDShapes';
import { 
  Briefcase, Camera, Calendar, 
  X, ListFilter, Activity, CheckCircle2, History, Layers, Timer,
  ArrowRight, Globe, Tag, MapPin, LayoutList, CheckSquare,
  FilePlus
} from 'lucide-react';
import { downloadChartAsJpg } from '../utils/chartHelpers';
import { parseDate } from '../utils/dateHelpers';

interface GMSheetProps {
  data: GlobalFileRow[];
  onFilterChange: (column: string, value: string) => void;
  onSwitchToData: () => void;
}

const COLORS = {
  created: '#3b82f6',
  closed: '#22c55e',
  backlog: '#8b5cf6',
  pending: '#f59e0b',
  internalProd: '#10b981',
  tvx: '#d1d5db',
  spa: '#3b82f6',
  atv: '#eab308',
  htc: '#f97316'
};

const PENDING_X_COLORS: Record<string, string> = {
  "STHIC TRAVAUX EN COURS": COLORS.tvx,
  "STHIC SPA": COLORS.spa,
  "STHIC ATTENTE VALIDATION HTC": COLORS.atv,
  "HTC DIVERS": COLORS.htc
};

export const GMSheet: React.FC<GMSheetProps> = ({ data, onFilterChange, onSwitchToData }) => {
  const flowChartRef = useRef<HTMLDivElement>(null);
  const efficiencyChartRef = useRef<HTMLDivElement>(null);
  const pendingChartRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<{start: string, end: string}>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Use local date string format YYYY-MM-DD
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return { start: formatDate(start), end: formatDate(end) };
  });

  const [drillDownData, setDrillDownData] = useState<GlobalFileRow[] | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState("");

  const stats = useMemo(() => {
    let totalCreatedInPeriod = 0; 
    let totalClosedInPeriod = 0; 
    
    // Nouveaux segments demandés
    let createdAndClosedInPeriod = 0; // Créés et Clos sur la période
    let backlogResolvedInPeriod = 0; // Créés AVANT et Clos PENDANT
    let remainingFromPeriod = 0;     // Créés PENDANT et NON CLOS à la fin
    
    const statusXCounts: Record<string, number> = { "STHIC TRAVAUX EN COURS": 0, "STHIC SPA": 0, "STHIC ATTENTE VALIDATION HTC": 0, "HTC DIVERS": 0 };
    const regionStockMap: Record<string, number> = {};
    
    const startDate = period.start ? new Date(period.start + 'T00:00:00') : null;
    const endDate = period.end ? new Date(period.end + 'T23:59:59.999') : null;
    
    data.forEach(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      
      // Normalize dates to remove time component for comparison if needed, 
      // but here we want to compare against the full day range of the period.
      
      const xStatus = String(row["X"] || "");
      const region = String(row["Region"] || "INCONNUE").trim().toUpperCase();
      
      const isCreatedDuring = creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
      const isClosedDuring = closingDate && startDate && endDate && closingDate >= startDate && closingDate <= endDate;
      const isCreatedBefore = creationDate && startDate && creationDate < startDate;
      const isNotClosedAtEnd = !closingDate || (endDate && closingDate > endDate);

      // 1. Volumes globaux
      if (isCreatedDuring) totalCreatedInPeriod++;
      if (isClosedDuring) totalClosedInPeriod++;

      // 2. Segmentation Efficacité
      
      // A. SWO Créés et Fermés sur la période
      if (isCreatedDuring && isClosedDuring) {
        createdAndClosedInPeriod++;
      }
      
      // B. Backlog fermé sur la période (Créé avant, fermé pendant)
      if (isCreatedBefore && isClosedDuring) {
        backlogResolvedInPeriod++;
      }
      
      // C. SWO Restants de la période (Créés pendant, pas encore fermés)
      if (isCreatedDuring && isNotClosedAtEnd) {
        remainingFromPeriod++;
        
        // Distribution du stock par type X
        if (xStatus.includes("TVX")) statusXCounts["STHIC TRAVAUX EN COURS"]++;
        else if (xStatus.includes("SPA")) statusXCounts["STHIC SPA"]++;
        else if (xStatus.includes("ATV") || xStatus.includes("VAL")) statusXCounts["STHIC ATTENTE VALIDATION HTC"]++;
        else if (xStatus.includes("HTC")) statusXCounts["HTC DIVERS"]++;
        
        regionStockMap[region] = (regionStockMap[region] || 0) + 1;
      }
    });

    const regionStats = Object.entries(regionStockMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { 
      flowData: [
        { name: 'Total Créés', value: totalCreatedInPeriod, fill: COLORS.created }, 
        { name: 'Total Fermés', value: totalClosedInPeriod, fill: COLORS.closed }
      ], 
      efficiencyData: [
        { name: 'Créés & Clos Période', value: createdAndClosedInPeriod, fill: COLORS.internalProd }, 
        { name: 'Backlog Résolu', value: backlogResolvedInPeriod, fill: COLORS.backlog }, 
        { name: 'Stock Restant Période', value: remainingFromPeriod, fill: COLORS.pending }
      ], 
      pendingXData: Object.entries(statusXCounts).filter(([, val]) => val > 0).map(([key, val]) => ({ name: key, value: val })), 
      totals: { totalCreatedInPeriod, totalClosedInPeriod, createdAndClosedInPeriod, backlogResolvedInPeriod, remainingFromPeriod },
      regionStats
    };
  }, [data, period]);

  const KPICard = ({ title, value, icon: Icon, colorClass, subtitle }: { title: string; value: string | number; icon: React.ElementType; colorClass: string; subtitle?: string; }) => (
    <div className={`relative bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-500`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className={`text-4xl font-black tracking-tighter ${colorClass}`}>{value}</h4>
          {subtitle && <span className="text-xs font-bold text-slate-400">{subtitle}</span>}
        </div>
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-500`}>
        <Icon className="w-32 h-32 rotate-12" />
      </div>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${colorClass.replace('text-', 'bg-')}`}></div>
    </div>
  );

  const handleDrillDown = (entry: { name: string }, chartType: string) => {
    if (!entry) return;
    const { name } = entry;
    const startDate = period.start ? new Date(period.start) : null;
    const endDate = period.end ? new Date(period.end) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);

    const filtered = data.filter(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      
      const isCreatedDuring = creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
      const isClosedDuring = closingDate && startDate && endDate && closingDate >= startDate && closingDate <= endDate;
      const isCreatedBefore = creationDate && startDate && creationDate < startDate;
      const isNotClosedAtEnd = !closingDate || (endDate && closingDate > endDate);

      if (chartType === 'FLOW') {
         if (name === 'Total Créés') return isCreatedDuring;
         if (name === 'Total Fermés') return isClosedDuring;
      }
      if (chartType === 'EFFICIENCY') {
         if (name === 'Créés & Clos Période') return isCreatedDuring && isClosedDuring;
         if (name === 'Backlog Résolu') return isCreatedBefore && isClosedDuring;
         if (name === 'Stock Restant Période') return isCreatedDuring && isNotClosedAtEnd;
      }
      return false;
    });
    setDrillDownData(filtered); 
    setDrillDownTitle(`${name}`);
  };

  const handleRegionDrillDown = (regionName: string) => {
    const startDate = period.start ? new Date(period.start) : null;
    const endDate = period.end ? new Date(period.end) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);

    const filtered = data.filter(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const region = String(row["Region"] || "INCONNUE").trim().toUpperCase();
      
      const isCreatedDuring = creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
      const isNotClosedAtEnd = !closingDate || (endDate && closingDate > endDate);
      
      return region === regionName && isCreatedDuring && isNotClosedAtEnd;
    });

    setDrillDownData(filtered);
    setDrillDownTitle(`Stock Période : ${regionName}`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Briefcase className="w-9 h-9 text-indigo-600" /> 
            GM Sheet Performance
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Analyse d'efficacité opérationnelle par segment de production.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-100">
           <Calendar className="w-5 h-5 text-indigo-500" />
           <input type="date" className="border-none bg-transparent text-sm font-black outline-none cursor-pointer text-slate-700" value={period.start} onChange={(e) => setPeriod(prev => ({ ...prev, start: e.target.value }))} />
           <span className="text-slate-300 font-black">/</span>
           <input type="date" className="border-none bg-transparent text-sm font-black text-indigo-600 outline-none cursor-pointer" value={period.end} onChange={(e) => setPeriod(prev => ({ ...prev, end: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total SWO Créés (Mois)" value={stats.totals.totalCreatedInPeriod} icon={FilePlus} colorClass="text-blue-600" subtitle="Total Entrants" />
        <KPICard title="Créés & Clos (Période)" value={stats.totals.createdAndClosedInPeriod} icon={CheckSquare} colorClass="text-emerald-600" subtitle="Internal Prod" />
        <KPICard title="Backlog Résolu" value={stats.totals.backlogResolvedInPeriod} icon={History} colorClass="text-purple-600" subtitle="Rattrapage" />
        <KPICard title="Stock Période Restant" value={stats.totals.remainingFromPeriod} icon={Layers} colorClass="text-amber-600" subtitle="En suspens" />
        <KPICard title="Total Fermés" value={stats.totals.totalClosedInPeriod} icon={CheckCircle2} colorClass="text-indigo-600" subtitle="Total Output" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[450px] flex flex-col group transition-all duration-300 hover:shadow-xl" ref={flowChartRef}>
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-500" /> 
              Flux Entrants / Sortants
            </h3>
            <button onClick={() => downloadChartAsJpg(flowChartRef, 'gm_flux')} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[320px] w-full relative">
            <ResponsiveContainer width="99%" height={320}>
              <BarChart 
                data={stats.flowData} 
                onClick={(data) => data?.activePayload && handleDrillDown(data.activePayload[0].payload, 'FLOW')}
                className="cursor-pointer"
                margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /> 
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} /> 
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} /> 
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}} 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" barSize={60} shape={<ThreeDBarVertical />}>
                   {stats.flowData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                   <LabelList dataKey="value" position="top" fill={document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'} fontSize={11} fontWeight={700} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[450px] flex flex-col group transition-all duration-300 hover:shadow-xl" ref={efficiencyChartRef}>
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Répartition & Efficacité Opérationnelle
            </h3>
            <button onClick={() => downloadChartAsJpg(efficiencyChartRef, 'gm_performance')} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[320px] w-full relative">
            <ResponsiveContainer width="99%" height={320}>
              <BarChart 
                data={stats.efficiencyData} 
                onClick={(data) => data?.activePayload && handleDrillDown(data.activePayload[0].payload, 'EFFICIENCY')}
                className="cursor-pointer"
                margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /> 
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} /> 
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} /> 
                <Tooltip 
                   cursor={{fill: '#F8FAFC'}} 
                   contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" barSize={50} shape={<ThreeDBarVertical />}>
                   {stats.efficiencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                   <LabelList dataKey="value" position="top" fill={document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'} fontSize={11} fontWeight={700} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col group transition-all duration-300 hover:shadow-xl" ref={pendingChartRef}>
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Analyse du Stock Période (X Status)</h3>
            <button onClick={() => downloadChartAsJpg(pendingChartRef, 'gm_stock_x')} className="p-2 text-slate-300 hover:text-indigo-600">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="99%" height={300}>
              <BarChart data={stats.pendingXData} layout="vertical" margin={{ left: 20, right: 35, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /> 
                <XAxis type="number" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} /> 
                <YAxis dataKey="name" type="category" width={200} fontSize={10} tick={{fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} /> 
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}} 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" barSize={35} shape={<ThreeDBarHorizontal />}>
                   {stats.pendingXData.map((entry, index) => <Cell key={`cell-${index}`} fill={PENDING_X_COLORS[entry.name] || COLORS.tvx} />)}
                   <LabelList dataKey="value" position="right" fill={document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'} fontSize={11} fontWeight={700} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-100 flex flex-col group transition-all duration-300 hover:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Globe className="w-24 h-24 text-indigo-600" />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 shrink-0 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 italic">
                <MapPin className="w-4 h-4 text-indigo-500" /> 
                Stock Période par Zone
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Répartition géographique des dossiers créés mais non clos.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full shadow-sm">
               <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{stats.totals.remainingFromPeriod} UNITÉS</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  <th className="px-4 py-2">Région / Zone</th>
                  <th className="px-4 py-2 text-center">Volume Stock</th>
                  <th className="px-4 py-2">Distribution</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stats.regionStats.length > 0 ? (
                  stats.regionStats.map((item, idx) => {
                    const percentage = Math.round((item.count / stats.totals.remainingFromPeriod) * 100);
                    return (
                      <tr key={idx} className="bg-slate-50/50 hover:bg-indigo-50 transition-colors group/row cursor-pointer" onClick={() => handleRegionDrillDown(item.name)}>
                        <td className="px-4 py-3 rounded-l-2xl">
                          <div className="flex items-center gap-3">
                            <Tag className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight group-hover/row:text-indigo-700 transition-colors">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-black text-slate-900">{item.count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 rounded-r-2xl text-right">
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover/row:text-indigo-500 group-hover/row:translate-x-1 transition-all" />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center opacity-20">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        <p className="text-xs font-black uppercase">Aucun stock résiduel sur cette période</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-tighter">
             <div className="flex items-center gap-2">
                <LayoutList className="w-3.5 h-3.5" />
                <span>Analyse Géo-Opérationnelle de Production</span>
             </div>
             <span className="text-indigo-600 font-black">Mise à jour dynamique</span>
          </div>
        </div>
      </div>

      {drillDownData && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-indigo-100 animate-in zoom-in-95">
             <div className="bg-indigo-700 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="bg-white/20 p-2 rounded-xl">
                      <ListFilter className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">{drillDownTitle}</h3>
                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">{drillDownData.length} Dossiers Identifiés</p>
                   </div>
                </div>
                <button onClick={() => setDrillDownData(null)} className="p-3 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                   {drillDownData.map((row, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between group">
                       <div>
                          <div className="flex justify-between items-start mb-4">
                             <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">{row["State SWO"]}</span>
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-400"># {row["N° SWO"]}</span>
                                <span className="text-[9px] font-mono font-bold text-indigo-500 mt-1 uppercase">{row["X"]}</span>
                             </div>
                          </div>
                          <h4 className="font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase truncate">{row["Nom du site"]}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {row["Region"]}</p>
                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4 italic line-clamp-2 leading-relaxed">
                             {row["Description"] || row["Short description"] || "Pas de description."}
                          </div>
                       </div>
                       <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                          <button 
                            onClick={() => { onFilterChange("N° SWO", String(row["N° SWO"])); onSwitchToData(); setDrillDownData(null); }}
                            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                             Inspecter le dossier
                          </button>
                       </div>
                    </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
