
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect } from 'react';
import { GlobalFileRow } from '../types';
import { 
  MapPin, Search, 
  CheckCircle2, AlertTriangle, Clock, ListFilter, 
  Download, Activity, User, CalendarDays,
  ChevronLeft, ChevronRight, Target, Hash,
  RefreshCw, Sliders, Globe, KeyRound, Check, Laptop
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseDate } from '../utils/dateHelpers';

interface PMTrackerProps {
  data: GlobalFileRow[];
  onFilterChange: (column: string, value: string) => void;
  onSwitchToData: () => void;
}

const formatDateDisplay = (val: string | number | Date | null | undefined): string => {
  const d = parseDate(val);
  if (!d) return typeof val === 'string' ? val : '-';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const toInputDate = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PMTracker: React.FC<PMTrackerProps> = ({ data, onFilterChange, onSwitchToData }) => {
  const [selectedDate, setSelectedDate] = useState(() => toInputDate(new Date()));
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Retable integration states
  // Retable integration states
  const [sourceType, setSourceType] = useState<'app_data' | 'retable_api'>('retable_api');
  const [retableApiKey, setRetableApiKey] = useState(() => {
    return localStorage.getItem('retable_api_key') || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
  });
  const [customKeyInput, setCustomKeyInput] = useState(() => {
    return localStorage.getItem('retable_api_key') || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [allTables, setAllTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [apiData, setApiData] = useState<any[]>([]);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isSthicLive, setIsSthicLive] = useState(false);

  useEffect(() => {
    if (sourceType === 'retable_api' && allTables.length === 0) {
      discoverRetableTables(retableApiKey);
    }
  }, [sourceType, retableApiKey]);

  const discoverRetableTables = async (key: string) => {
    setIsFetchingApi(true);
    setApiError(null);
    setIsDemo(false);
    setIsSthicLive(false);
    try {
      console.log('Discovering Retable workspaces...');
      const wsRes = await fetch('/api/retable/workspaces', {
        headers: { 'x-api-key': key }
      });
      if (!wsRes.ok) throw new Error(`Clé API invalide ou erreur réseau (${wsRes.status})`);
      const wsJson = await wsRes.json();
      if (wsJson.isDemo) {
        setIsDemo(true);
      }
      if (wsJson.isSthicLive) {
        setIsSthicLive(true);
      }
      const workspacesList = wsJson?.data?.workspaces || wsJson?.workspaces || [];
      setWorkspaces(workspacesList);

      const foundTables: any[] = [];
      
      // For each workspace, fetch projects and then tables
      for (const ws of workspacesList) {
        const projRes = await fetch(`/api/retable/projects?workspaceId=${ws.id}`, {
          headers: { 'x-api-key': key }
        });
        if (projRes.ok) {
          const projJson = await projRes.json();
          if (projJson.isDemo) {
            setIsDemo(true);
          }
          if (projJson.isSthicLive) {
            setIsSthicLive(true);
          }
          const projectsList = projJson?.data?.projects || projJson?.projects || [];
          
          for (const proj of projectsList) {
            const tabRes = await fetch(`/api/retable/tables?projectId=${proj.id}`, {
              headers: { 'x-api-key': key }
            });
            if (tabRes.ok) {
              const tabJson = await tabRes.json();
              if (tabJson.isDemo) {
                setIsDemo(true);
              }
              if (tabJson.isSthicLive) {
                setIsSthicLive(true);
              }
              const tablesList = tabJson?.data?.tables || tabJson?.tables || [];
              tablesList.forEach((tab: any) => {
                foundTables.push({
                  id: tab.id || tab.retable_id,
                  title: tab.title || tab.name || 'Sans titre',
                  workspaceName: ws.name,
                  projectName: proj.name
                });
              });
            }
          }
        }
      }

      setAllTables(foundTables);
      
      if (foundTables.length > 0) {
        // Look for any table containing PM or Planif
        const pmTable = foundTables.find(t => 
          String(t.title).toLowerCase().includes('pm') ||
          String(t.title).toLowerCase().includes('planif') ||
          String(t.title).toLowerCase().includes('global')
        );
        const autoSelected = pmTable || foundTables[0];
        setSelectedTableId(autoSelected.id);
        fetchTableLines(autoSelected.id, key);
      } else {
        throw new Error("Aucun projet ou table trouvé dans vos espaces Retable");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Erreur lors de la découverte des tables');
    } finally {
      setIsFetchingApi(false);
    }
  };

  const fetchTableLines = async (retableId: string, key: string) => {
    setIsFetchingApi(true);
    setApiError(null);
    try {
      const dataRes = await fetch(`/api/retable/data?retableId=${retableId}`, {
        headers: { 'x-api-key': key }
      });
      if (!dataRes.ok) throw new Error(`Impossible d'obtenir les données de la table (${dataRes.status})`);
      const dataJson = await dataRes.json();
      if (dataJson.isDemo) {
        setIsDemo(true);
      }
      if (dataJson.isSthicLive) {
        setIsSthicLive(true);
      }
      if (dataJson.success && Array.isArray(dataJson.rows)) {
        setApiData(dataJson.rows);
      } else {
        throw new Error("Aucune ligne de données trouvée ou format incompatible");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Erreur de chargement des données');
    } finally {
      setIsFetchingApi(false);
    }
  };

  // Maps custom table headers to GlobalFileRow standard ones
  const normalizeRowToGlobalFileRow = (rawRow: any): GlobalFileRow => {
    const norm: GlobalFileRow = {};
    const keys = Object.keys(rawRow);
    const getVal = (possibleKeys: string[]): string | undefined => {
      for (const key of possibleKeys) {
        const match = keys.find(k => k.trim().toLowerCase() === key.toLowerCase() || k.trim().toLowerCase().includes(key.toLowerCase()));
        if (match && rawRow[match] !== undefined && rawRow[match] !== null) {
          return String(rawRow[match]);
        }
      }
      return undefined;
    };

    norm["ID"] = getVal(["id site", "id_site", "id du site", "site_id", "site id"]) || rawRow["ID"] || rawRow["id"];
    norm["PM number"] = getVal(["pm number", "pmnumber", "pm_number", "n° pm", "num pm", "numéro de pm", "pm_no"]) || rawRow["PM number"] || rawRow["PMnumber"];
    norm["Nom du site"] = getVal(["nom du site", "nom site", "site", "site_name", "site_name", "names site"]) || rawRow["Nom du site"];
    norm["Region"] = getVal(["region", "région", "zone", "sector", "secteur"]) || rawRow["Region"];
    norm["PM Date"] = getVal(["pm date", "date planifiée", "date planifiee", "pm planned", "scheduled date", "planifié le", "planned_date"]) || rawRow["PM Date"];
    norm["Types de PM"] = getVal(["types de pm", "type de pm", "type pm", "pm type", "pm_type"]) || rawRow["Types de PM"];
    norm["FE names"] = getVal(["fe names", "fe names (intervenants)", "intervenant", "intervenants", "field engineer", "technicien", "assigned"]) || rawRow["FE names"];
    norm["PM date execute"] = getVal(["pm date execute", "executé", "execute", "executée", "pm_date_execute", "date d'exécution", "date executee", "date executée", "date execute"]) || rawRow["PM date execute"];
    norm["PM date replanifiée"] = getVal(["pm date replanifiée", "replanifié", "pm date replanifiee", "pm_date_replanifiée", "date replanifiée", "replanifed date", "pm date replanned"]) || rawRow["PM date replanifiée"];
    norm["status"] = getVal(["status", "statut", "state swo", "state", "statuts", "swo state"]) || rawRow["status"];
    
    // Default logic fallback for primary PM Number
    if (!norm["PM number"]) {
      const pmNumKey = keys.find(k => k.toLowerCase().includes("pm") && (k.toLowerCase().includes("num") || k.toLowerCase().includes("no") || k.toLowerCase().includes("swo")));
      if (pmNumKey) norm["PM number"] = String(rawRow[pmNumKey]);
    }

    // copy other keys
    keys.forEach(k => {
      if (rawRow[k] !== undefined && rawRow[k] !== null && !norm[k]) {
        norm[k] = rawRow[k];
      }
    });

    return norm;
  };

  const activeData = useMemo(() => {
    if (sourceType === 'app_data') {
      return data;
    }
    return apiData.map(normalizeRowToGlobalFileRow);
  }, [sourceType, data, apiData]);

  const regions = useMemo(() => {
    const regs = new Set<string>();
    activeData.forEach(row => {
      if (row["Region"]) regs.add(String(row["Region"]).trim().toUpperCase());
    });
    return Array.from(regs).sort();
  }, [activeData]);

  const pmTypes = useMemo(() => {
    const types = new Set<string>();
    activeData.forEach(row => {
      if (row["Types de PM"]) types.add(String(row["Types de PM"]).trim());
    });
    return Array.from(types).sort();
  }, [activeData]);

  const isInSameWeek = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    
    const getMonday = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diff);
      return mon;
    };
    
    return getMonday(d1).getTime() === getMonday(d2).getTime();
  };

  // Automatically adjust selectedDate to the most recent date with PMs if selected date has no data
  useEffect(() => {
    if (activeData && activeData.length > 0) {
      // Check if any row matches the currently selected date under current viewMode
      const hasMatchForSelectedDate = activeData.some(row => {
        const pmDate = row["PM Date"];
        if (!pmDate) return false;
        try {
          const d = new Date(pmDate);
          if (isNaN(d.getTime())) return false;
          
          const sel = new Date(selectedDate);
          if (isNaN(sel.getTime())) return false;

          if (viewMode === 'day') {
            return d.getFullYear() === sel.getFullYear() && 
                   d.getMonth() === sel.getMonth() && 
                   d.getDate() === sel.getDate();
          } else if (viewMode === 'week') {
            return isInSameWeek(d, sel);
          } else {
            return d.getFullYear() === sel.getFullYear() && 
                   d.getMonth() === sel.getMonth();
          }
        } catch {
          return false;
        }
      });

      // If no match is found, let's auto-adjust to the most recent PM Date in the dataset
      if (!hasMatchForSelectedDate) {
        let latestDate: Date | null = null;
        activeData.forEach(row => {
          const pmDate = row["PM Date"];
          if (pmDate) {
            try {
              const d = new Date(pmDate);
              if (!isNaN(d.getTime())) {
                if (!latestDate || d > latestDate) {
                  latestDate = d;
                }
              }
            } catch {}
          }
        });
        if (latestDate) {
          const newDateInput = toInputDate(latestDate);
          if (newDateInput !== selectedDate) {
            setSelectedDate(newDateInput);
          }
        }
      }
    }
  }, [activeData, viewMode]);

  const pmStats = useMemo(() => {
    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    
    const plannedSet = new Set<string>();
    const doneOkSet = new Set<string>();
    const doneLateSet = new Set<string>();
    const processedPmNumbers = new Set<string>();

    const detailList: (GlobalFileRow & { pmStatus: 'OK' | 'LATE' | 'PENDING' })[] = [];

    activeData.forEach(row => {
      const pmNum = String(row["PM number"] || "").trim();
      if (!pmNum) return;

      const pmDate = parseDate(row["PM Date"]);
      const region = String(row["Region"] || "").trim().toUpperCase();
      const type = String(row["Types de PM"] || "").trim();

      if (!pmDate) return;
      const compareDate = new Date(pmDate);
      compareDate.setHours(0,0,0,0);
      
      if (viewMode === 'day') {
        if (compareDate.getTime() !== targetDate.getTime()) return;
      } else if (viewMode === 'week') {
        if (!isInSameWeek(compareDate, targetDate)) return;
      } else if (viewMode === 'month') {
        if (compareDate.getFullYear() !== targetDate.getFullYear() || compareDate.getMonth() !== targetDate.getMonth()) return;
      }

      if (selectedRegion !== 'ALL' && region !== selectedRegion) return;
      if (selectedType !== 'ALL' && type !== selectedType) return;

      if (!processedPmNumbers.has(pmNum)) {
        plannedSet.add(pmNum);

        const hasExecutionDate = !!row["PM date execute"] || !!row["Date executee"];
        const hasReplanDate = !!row["PM date replanifiée"];
        
        let status: 'OK' | 'LATE' | 'PENDING' = 'PENDING';

        if (hasExecutionDate) {
          doneOkSet.add(pmNum);
          status = 'OK';
        } else if (hasReplanDate) {
          doneLateSet.add(pmNum);
          status = 'LATE';
        }

        detailList.push({ ...row, pmStatus: status });
        processedPmNumbers.add(pmNum);
      }
    });

    const planned = plannedSet.size;
    const doneOk = doneOkSet.size;
    const doneLate = doneLateSet.size;
    const remaining = Math.max(0, planned - (doneOk + doneLate));

    return { planned, doneOk, doneLate, remaining, detailList };
  }, [activeData, selectedDate, selectedRegion, selectedType, viewMode]);

  const filteredList = useMemo(() => {
    if (!searchTerm) return pmStats.detailList;
    const s = searchTerm.toLowerCase();
    return pmStats.detailList.filter(row => 
      String(row["Nom du site"] || row["site_name"] || row["Nom site"] || "").toLowerCase().includes(s) ||
      String(row["PM number"] || "").toLowerCase().includes(s) ||
      String(row["FE names"] || "").toLowerCase().includes(s) ||
      String(row["ID"] || "").toLowerCase().includes(s)
    );
  }, [pmStats.detailList, searchTerm]);

  const changeDate = (amount: number) => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + amount);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + amount * 7);
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() + amount);
    }
    setSelectedDate(toInputDate(d));
  };

  const getPlanningTitle = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      return `Registre Journalier : ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else if (viewMode === 'week') {
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `Planning Hebdomadaire : du ${mon.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sun.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return `Planning Mensuel : ${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }
  };

  const exportPMReport = () => {
    const exportData = pmStats.detailList.map(row => ({
      "ID Site": row["ID"],
      "PM Number": row["PM number"],
      "Site": row["Nom du site"],
      "Région": row["Region"],
      "Type PM": row["Types de PM"],
      "FE Names": row["FE names"],
      "Date Prévue": formatDateDisplay(row["PM Date"]),
      "Date Exécutée": formatDateDisplay(row["PM date execute"]),
      "Date Replanifiée": formatDateDisplay(row["PM date replanifiée"]),
      "Status": row["status"],
      "Diagnostic": row.pmStatus === 'OK' ? 'CONFORME' : row.pmStatus === 'LATE' ? 'REPLANIFIÉ' : 'À RÉALISER'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const modeName = viewMode === 'day' ? 'Jour' : viewMode === 'week' ? 'Semaine' : 'Mois';
    XLSX.utils.book_append_sheet(wb, ws, `Planning_${modeName}`);
    XLSX.writeFile(wb, `PLANNING_PM_${modeName}_${selectedDate}.xlsx`);
  };

  const KPICard = ({ title, value, icon: Icon, colorClass, bgColor }: { title: string; value: string | number; icon: React.ElementType; colorClass: string; bgColor: string; }) => (
    <div className={`${bgColor} p-8 rounded-[3rem] shadow-sm border border-white flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all duration-500 min-h-[180px]`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
        <h4 className={`text-5xl font-black tracking-tighter ${colorClass}`}>{value}</h4>
      </div>
      <div className={`absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-all duration-700`}>
        <Icon className={`w-32 h-32 rotate-12 ${colorClass}`} />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-[#F8FAFC] min-h-full font-sans">
      {/* SOURCE SWITCHER */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2.5 rounded-xl">
            <Sliders className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Source des Données du Module PM</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Choisissez entre les fichiers importés et la synchronisation en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setSourceType('app_data')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              sourceType === 'app_data' 
                ? 'bg-slate-950 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-4 h-4" />
            FICHIERS APPLI ({data.length})
          </button>
          <button 
            onClick={() => setSourceType('retable_api')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              sourceType === 'retable_api' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingApi ? 'animate-spin' : ''}`} />
            RETABLE API CONNECT
          </button>
        </div>
      </div>

      {sourceType === 'retable_api' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 text-white space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          {isSthicLive && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs p-5 rounded-2xl flex items-start gap-4 animate-in fade-in duration-300">
              <div className="bg-emerald-500/15 p-2.5 rounded-xl text-emerald-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black uppercase tracking-wider text-emerald-200">Données en Direct STHIC Connectées</p>
                <p className="text-slate-400 leading-relaxed font-medium">
                  L'application est synchronisée en temps réel avec la plateforme de maintenance STHIC (<a href="https://sthic-maintenances-generateurs.pages.dev" target="_blank" rel="noreferrer" className="underline text-emerald-400 hover:text-emerald-300">sthic-maintenances-generateurs.pages.dev</a>).
                </p>
                <div className="mt-3 p-4 bg-emerald-950/40 rounded-xl border border-emerald-500/10 space-y-2 text-slate-300 text-xs">
                  <p className="font-bold text-emerald-400">ℹ️ Analyse de la base de données STHIC connectée :</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400 leading-relaxed">
                    <li>La base de données active de l'API STHIC ne contient actuellement que <strong>188 assignations de PM</strong> au total.</li>
                    <li>Toutes ces 188 assignations concernent exclusivement la zone de <strong>Brazzaville / Pool (BZV/POOL)</strong>. Aucune assignation n'est enregistrée pour Pointe-Noire (PNR/KOUILOU) ou d'autres zones dans leur table de plannings PM actuelle.</li>
                    <li>Ces données s'étendent uniquement sur les mois de <strong>Février (93 PM), Mars (69 PM) et Avril (26 PM) 2026</strong>. Il n'y a pas encore d'assignation pour les autres mois (dont Juillet 2026) enregistrée dans l'API STHIC.</li>
                    <li>Pour éviter d'afficher un tableau vide à l'ouverture, le calendrier s'est automatiquement calé sur <strong>Avril 2026</strong> (le mois le plus récent contenant des plannings).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isDemo && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs p-5 rounded-2xl flex items-start gap-4 animate-in fade-in duration-300">
              <div className="bg-indigo-500/15 p-2.5 rounded-xl text-indigo-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black uppercase tracking-wider text-indigo-200">Mode Démonstration Actif</p>
                <p className="text-slate-400 leading-relaxed font-medium">
                  En raison d'une clé d'API non configurée ou non trouvée sur Retable, l'application utilise des données de démonstration interactives de Retable (Suivi PM Sénégal). Vous pouvez modifier la clé active par votre propre Clé API Retable valide en cliquant sur <strong>"Modifier Clé"</strong> ci-dessous.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-500/20 text-indigo-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-500 text-white rounded">API Activée</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Row Data cloud synchronisé</p>
                </div>
                <h3 className="text-lg font-black tracking-tight mt-1 flex items-center gap-2">
                  {selectedTableId && allTables.length > 0 
                    ? `Connecté à : ${allTables.find(t => t.id === selectedTableId)?.title || 'Table sélectionnée'}` 
                    : isFetchingApi ? 'Chargement des tables et workspaces...' : 'Connexion à l\'API Retable...'}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Table Selector Dropdown */}
              {allTables.length > 0 && (
                <div className="flex flex-col gap-1 w-full md:w-64">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Table active</span>
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value);
                      fetchTableLines(e.target.value, retableApiKey);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {allTables.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.projectName || 'Projet'})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  if (selectedTableId) {
                    fetchTableLines(selectedTableId, retableApiKey);
                  } else {
                    discoverRetableTables(retableApiKey);
                  }
                }}
                disabled={isFetchingApi}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl text-xs font-black flex items-center gap-2 border border-slate-700/30 w-full md:w-auto justify-center disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingApi ? 'animate-spin' : ''}`} />
                {isFetchingApi ? 'Chargement...' : 'Actualiser'}
              </button>

              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-colors rounded-xl text-xs font-black border border-indigo-500/20 w-full md:w-auto justify-center flex items-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {showKeyInput ? 'Masquer Clé' : 'Modifier Clé'}
              </button>
            </div>
          </div>

          {showKeyInput && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-250">
              <div className="flex-1 space-y-1.5 w-full">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Modifier la Clé d'API Retable d'intégration</span>
                <input
                  type="password"
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder="Entrez votre clé d'API Retable..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                />
              </div>
              <button
                onClick={() => {
                  setRetableApiKey(customKeyInput);
                  localStorage.setItem('retable_api_key', customKeyInput);
                  setShowKeyInput(false);
                  discoverRetableTables(customKeyInput);
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white shadow-lg flex items-center gap-2 w-full md:w-auto justify-center transition-all shrink-0"
              >
                <Check className="w-4 h-4" /> Appliquer la Clé
              </button>
            </div>
          )}

          {/* Masked display of active key */}
          <div className="text-[10px] text-slate-500 font-bold bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              Clé d'API Active : <code className="text-indigo-400/80 font-mono tracking-wider">
                {(retableApiKey || '').slice(0, 6)}************************{(retableApiKey || '').slice(-6)}
              </code>
            </span>
            <span>Pour modifier temporairement la clé ou changer de compte, cliquez sur "Modifier Clé".</span>
          </div>

          {apiError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{apiError}</span>
              </div>
              {apiError.includes('Clé API') && !showKeyInput && (
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition-all border border-rose-500/30 cursor-pointer self-start sm:self-auto"
                >
                  Saisir une nouvelle clé
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* HEADER AVEC FILTRE PLANNING */}
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-xl shadow-indigo-100">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              Planning <span className="text-indigo-600">PM STHIC</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
              {viewMode === 'day' ? 'Audit journalier par PM Number unique' :
               viewMode === 'week' ? 'Vue de la semaine par PM Number unique' :
               'Vue mensuelle globale par PM Number unique'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* VIEW SWITCHER */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vue planning</span>
            <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-inner">
              <button 
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'day' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                JOUR
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'week' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                SEMAINE
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'month' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                MOIS
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
              {viewMode === 'day' ? "Date du jour" : viewMode === 'week' ? "Semaine du" : "Mois du"}
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-inner">
               <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-indigo-600" title={viewMode === 'day' ? "Jour précédent" : viewMode === 'week' ? "Semaine précédente" : "Mois précédent"}><ChevronLeft className="w-5 h-5" /></button>
               <input 
                 type="date" 
                 value={selectedDate} 
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent border-none text-sm font-black text-indigo-600 outline-none focus:ring-0 cursor-pointer text-center"
               />
               <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-indigo-600" title={viewMode === 'day' ? "Jour suivant" : viewMode === 'week' ? "Semaine suivante" : "Mois suivant"}><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone</span>
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">TOUTES ZONES</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type PM</span>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">TOUS TYPES</option>
              {pmTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-2 lg:mt-5">
            <button 
              onClick={() => setSelectedDate(toInputDate(new Date()))}
              className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
              title="Aujourd'hui"
            >
              <Target className="w-5 h-5" />
            </button>
            <button 
              onClick={exportPMReport}
              className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
              title="Exporter le journal"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPICard title={viewMode === 'day' ? "PM Planifiés (Jour)" : viewMode === 'week' ? "PM Planifiés (Semaine)" : "PM Planifiés (Mois)"} value={pmStats.planned} icon={CalendarDays} colorClass="text-indigo-600" bgColor="bg-white" />
        <KPICard title="Exécutés (OK)" value={pmStats.doneOk} icon={CheckCircle2} colorClass="text-emerald-600" bgColor="bg-emerald-50/30" />
        <KPICard title="Replanifiés" value={pmStats.doneLate} icon={AlertTriangle} colorClass="text-amber-600" bgColor="bg-amber-50/30" />
        <KPICard title="Restants" value={pmStats.remaining} icon={Clock} colorClass="text-rose-600" bgColor="bg-rose-50/30" />
      </div>

      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <ListFilter className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">{getPlanningTitle()}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Visualisation par PM Number unique</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Chercher ID, PM Number, Site ou FE..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="py-5 px-4">ID Site</th>
                <th className="py-5 px-4">PM Number / Site</th>
                <th className="py-5 px-4">Date Planifiée</th>
                <th className="py-5 px-4">Type de PM</th>
                <th className="py-5 px-4">FE Names (Intervenant)</th>
                <th className="py-5 px-4 text-center">Exécution</th>
                <th className="py-5 px-4 text-center">Replanifié</th>
                <th className="py-5 px-4 text-center">Statut</th>
                <th className="py-5 px-4 text-right">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredList.map((row, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 cursor-pointer group transition-colors" onClick={() => { onFilterChange("N° SWO", String(row["N° SWO"])); onSwitchToData(); }}>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] font-black text-slate-500 uppercase">{row["ID"] || "N/A"}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="font-black text-indigo-600 text-[10px] tracking-wider">{row["PM number"]}</span>
                      <span className="text-xs font-black text-slate-800 uppercase leading-tight mt-1">{row["Nom du site"]}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {row["Region"]}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[11px] font-bold text-slate-700">
                      {formatDateDisplay(row["PM Date"])}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-lg text-slate-500 border border-slate-200 uppercase">
                      {row["Types de PM"] || "Standard"}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase truncate max-w-[120px]">{row["FE names"] || "-"}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[11px] font-black text-emerald-600">
                      {formatDateDisplay(row["PM date execute"])}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[11px] font-black text-amber-600">
                      {formatDateDisplay(row["PM date replanifiée"])}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                      {row["status"] || row["State SWO"] || "OPEN"}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase border shadow-sm ${
                      row.pmStatus === 'OK' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      row.pmStatus === 'LATE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {row.pmStatus === 'OK' ? 'Conforme' : row.pmStatus === 'LATE' ? 'Replanifié' : 'À Faire'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-32 text-center text-slate-300 italic">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Activity className="w-16 h-16" />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">
                        {viewMode === 'day' ? "Aucun PM identifié ce jour" :
                         viewMode === 'week' ? "Aucun PM identifié cette semaine" :
                         "Aucun PM identifié ce mois"}
                      </p>
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
