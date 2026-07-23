import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, UserPlus, AlertTriangle, Trash2, Sun, Moon, Loader2,
  Sliders, Shield, Users, Database, Battery, Settings2, CheckCircle, Key, Mail, User, Info, AlertCircle
} from 'lucide-react';
import { GlobalFileRow } from '../types';
import { registerUserWithoutLoggingIn } from '../firebase';
import { clearFirebaseData } from '../firebaseData';

interface SettingsPanelProps {
  initialBatteryThreshold: number;
  initialBeltThreshold: number;
  onSave: (batteryThreshold: number, beltThreshold: number) => void;
  data: GlobalFileRow[];
  setData: (data: GlobalFileRow[]) => void;
  onSetActiveTab: (tab: string) => void;
  isNightMode: boolean;
  setIsNightMode: (value: boolean) => void;
  userRole?: string | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  initialBatteryThreshold,
  initialBeltThreshold,
  onSave,
  data,
  setData,
  onSetActiveTab,
  isNightMode,
  setIsNightMode,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'users' | 'danger'>('config');
  const [battery, setBattery] = useState(initialBatteryThreshold);
  const [belt, setBelt] = useState(initialBeltThreshold);
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  // User form states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'User'|'Manager'|'Admin'>('User');
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Danger/Reset states
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-hide alert notifications
  useEffect(() => {
    if (showSaveMessage) {
      const timer = setTimeout(() => setShowSaveMessage(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [showSaveMessage]);

  useEffect(() => {
    if (addUserSuccess) {
      const timer = setTimeout(() => setAddUserSuccess(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [addUserSuccess]);

  const handleSaveConfig = () => {
    onSave(battery, belt);
    setShowSaveMessage(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');
    setIsSubmittingUser(true);

    try {
      await registerUserWithoutLoggingIn(newUserEmail, newUserPass, newUserName, newUserRole);

      setAddUserSuccess(`L'utilisateur "${newUserName}" a été enregistré avec succès et a reçu le rôle d'accès "${newUserRole}".`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRole('User');
      setIsAddingUser(false);
    } catch (err: unknown) {
      console.error(err);
      const error = err as { code?: string };
      if (error.code === 'auth/email-already-in-use') {
        setAddUserError('Cet identifiant email existe déjà dans la base locale.');
      } else if (error.code === 'auth/weak-password') {
        setAddUserError('Le mot de passe doit contenir un minimum de 6 caractères.');
      } else {
        setAddUserError('Une erreur inattendue est survenue.');
      }
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleReset = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await clearFirebaseData();
      setData([]); 
      setShowConfirmModal(false);
      onSetActiveTab('upload'); 
    } catch (e: unknown) {
      console.error("Failed to clear data", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded') || errMsg.includes('quota')) {
        setDeleteError("Quota d'écriture Firestore dépassé. Veuillez réessayer demain à la réinitialisation du quota ou activer la facturation Spark/Blaze.");
      } else {
        setDeleteError("Erreur d'exécution : " + errMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin = userRole === 'Admin';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Top Welcome & Context Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 flex items-center justify-center shadow-inner shrink-0">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 animate-[spin_30s_linear_infinite]" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              Paramètres <span className="text-indigo-600">Système</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Configurez les variables d'analyse, gérez les autorisations d'équipe et purgez les jeux de données.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 p-2 rounded-xl self-start md:self-auto shrink-0">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Row Data:</span>
          <span className="font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-lg font-bold">{data.length} lignes</span>
        </div>
      </div>

      {/* Admin Panel Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* Navigation panel adaptive layout */}
        <div className="lg:col-span-1">
          {isAdmin ? (
            <div className="w-full">
              {/* Desktop view sidebar */}
              <div className="hidden lg:block space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2.5 mb-2">Sections Disponibles</p>
                <div className="space-y-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-2 rounded-xl shadow-sm">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeTab === 'config'
                        ? 'bg-slate-950 text-indigo-400 dark:bg-slate-800 border-l-[3px] border-indigo-500 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Configuration générale</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeTab === 'users'
                        ? 'bg-slate-950 text-indigo-400 dark:bg-slate-800 border-l-[3px] border-indigo-500 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Comptes d'Équipe</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('danger')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeTab === 'danger'
                        ? 'bg-rose-500/10 text-rose-500 border-l-[3px] border-rose-500'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/5'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Maintenance & Danger Zone</span>
                  </button>
                </div>
              </div>

              {/* Mobile and Tablet view horizontal tab strip */}
              <div className="lg:hidden w-full overflow-x-auto no-scrollbar pb-1 mb-2">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/55 dark:border-slate-900 rounded-xl space-x-1 min-w-[340px]">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'config'
                        ? 'bg-white dark:bg-slate-900 text-indigo-500 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/60'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Seuils</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'users'
                        ? 'bg-white dark:bg-slate-900 text-indigo-500 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/60'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Utilisateurs</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('danger')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'danger'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Maintenance</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center">
              <Shield className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mode Collaborateur</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Les options d'administration critique exigent des droits administrateurs.</p>
            </div>
          )}
        </div>

        {/* Content Panel Area */}
        <div className="lg:col-span-3">
          
          {/* Subheader Title */}
          <div className="mb-4 sm:mb-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              {activeTab === 'config' && (
                <>
                  <Sliders className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Seuils Analytiques & Préférences visuelles</span>
                </>
              )}
              {activeTab === 'users' && (
                <>
                  <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Comptes & Droits d'Accès d'Équipe</span>
                </>
              )}
              {activeTab === 'danger' && (
                <>
                  <Shield className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                  <span>Zone d'Administration Critique</span>
                </>
              )}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm min-h-[380px] flex flex-col justify-between">
            
            {/* TAB 1: GENERAL CONFIGURATION */}
            {(activeTab === 'config' || !isAdmin) && (
              <div className="space-y-6 w-full">
                
                {/* Save Success Banner */}
                {showSaveMessage && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 duration-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Seuils analytiques et préférences modifiés avec succès.</span>
                  </div>
                )}

                {/* Theme Section */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ajuster le Thème Visuel</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Permutez instantanément entre l'interface claire classique et le mode nuit sombre.</p>
                    </div>
                    <button 
                      onClick={() => setIsNightMode(!isNightMode)}
                      className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm cursor-pointer self-start sm:self-auto bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    >
                      {isNightMode ? (
                        <>
                          <Moon className="w-3.5 h-3.5" />
                          <span>Mode Sombre</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Mode Clair</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Threshold Configuration (Only Admin) */}
                {isAdmin ? (
                  <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                      
                      {/* Battery Card */}
                      <div className="p-4 sm:p-5 border border-slate-200/65 dark:border-slate-800/80 rounded-xl space-y-3 hover:border-indigo-500/10 dark:hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-500/10 p-1.5 rounded-lg shrink-0">
                              <Battery className="w-4 h-4 text-indigo-500" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Alerte Seuil Batterie</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">Fixe le seuil en mois à partir duquel la batterie du site sera mise en exergue pour remplacement.</p>
                        </div>
                        
                        <div className="relative pt-2">
                          <span className="absolute right-3.5 top-[19px] text-[10px] font-black text-slate-400 dark:text-slate-400">MOIS</span>
                          <input 
                            type="number" 
                            value={battery} 
                            min={1}
                            max={120}
                            onChange={(e) => setBattery(Math.max(1, parseInt(e.target.value) || 0))} 
                            className="w-full pl-3.5 pr-14 py-2 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-colors" 
                          />
                        </div>
                      </div>

                      {/* Belt Card */}
                      <div className="p-4 sm:p-5 border border-slate-200/65 dark:border-slate-800/80 rounded-xl space-y-3 hover:border-indigo-500/10 dark:hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-500/10 p-1.5 rounded-lg shrink-0">
                              <Settings2 className="w-4 h-4 text-indigo-500" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Alerte Seuil Courroie</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">Fixe l'intervalle d'échéance critique (en jours) recommandé pour planifier l'audit des courroies.</p>
                        </div>
                        
                        <div className="relative pt-2">
                          <span className="absolute right-3.5 top-[19px] text-[10px] font-black text-slate-400 dark:text-slate-400">JOURS</span>
                          <input 
                            type="number" 
                            value={belt} 
                            min={1}
                            max={3650}
                            onChange={(e) => setBelt(Math.max(1, parseInt(e.target.value) || 0))} 
                            className="w-full pl-3.5 pr-16 py-2 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-colors" 
                          />
                        </div>
                      </div>

                    </div>

                    <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-800 mt-4">
                      <button 
                        onClick={handleSaveConfig} 
                        className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/15 duration-200 active:scale-95 transition-transform"
                      >
                         <Save className="w-4 h-4" /> 
                         <span>Mettre à jour la Configuration</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-xl mt-4">
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed italic">
                      💡 Vous êtes actuellement connecté en mode collaborateur. Les détails critiques de calibrage des seuils batteries et courroies sont modifiables exclusivement par les administrateurs systèmes.
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: USER MANAGEMENT */}
            {isAdmin && activeTab === 'users' && (
              <div className="space-y-6 w-full">
                
                {addUserSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 animate-pulse">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{addUserSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left guide explaining Roles & Access tiers */}
                  <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Rôles disponibles
                    </h4>
                    
                    <div className="space-y-4 text-[11px] leading-relaxed">
                      <div className="border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                        <span className="font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">Utilisateur (Lecteur)</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Accède en lecture seule aux analyses globales, modules prédictifs, batteries et courroies.</p>
                      </div>
                      
                      <div className="border-l-2 border-teal-500 dark:border-teal-400 pl-3">
                        <span className="font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Manager (Superviseur)</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">Autorise l'importation de fichiers XLS/CSV, la mise en cache des alertes locales et l'édition manuelle de la base.</p>
                      </div>

                      <div className="border-l-2 border-indigo-600 pl-3">
                        <span className="font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Administrateur</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">Privilèges totaux incluant la gestion d'équipe et la purge irréversible des données de production.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-indigo-500 leading-normal font-medium">Les utilisateurs créés seront enregistrés en local pour cette instance.</p>
                    </div>
                  </div>

                  {/* Form section */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Créer un nouveau compte</h4>
                      <button 
                        onClick={() => setIsAddingUser(!isAddingUser)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border transition-colors shrink-0 ${
                          isAddingUser 
                            ? 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20 text-rose-500' 
                            : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isAddingUser ? 'Annuler' : 'Ajouter'}</span>
                      </button>
                    </div>

                    {isAddingUser ? (
                      <form onSubmit={handleAddUser} className="space-y-4 border border-indigo-500/10 dark:border-indigo-500/15 bg-indigo-500/5 p-4 sm:p-5 rounded-xl">
                        {addUserError && (
                          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950 text-[11px] font-bold rounded-lg flex items-center gap-2 animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{addUserError}</span>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nom complet</label>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                                placeholder="Jean Dupont"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Adresse Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                              <input 
                                type="email" 
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                                placeholder="jean.dupont@email.com"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mot de passe</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                              <input 
                                type="password" 
                                value={newUserPass}
                                onChange={(e) => setNewUserPass(e.target.value)}
                                required
                                minLength={6}
                                className="w-full pl-9 pr-3 py-2 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                                placeholder="Minim. 6 carac."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Rôle d'Accès</label>
                            <select 
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as 'User' | 'Manager' | 'Admin')}
                              className="w-full px-3 py-2 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                            >
                              <option value="User">Utilisateur (Lecture)</option>
                              <option value="Manager">Manager (Superviseur)</option>
                              <option value="Admin">Administrateur (Complet)</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button 
                            type="submit"
                            disabled={isSubmittingUser}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 flex items-center justify-center cursor-pointer duration-200 active:scale-95"
                          >
                            {isSubmittingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Créer l\'utilisateur'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="border border-dashed border-slate-250 dark:border-slate-800 p-8 rounded-xl text-center flex flex-col items-center justify-center h-48">
                        <Users className="w-8 h-8 text-indigo-400/40 mb-2 shrink-0" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Aucun compte actif généré</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Cliquez sur ajouter pour associer un nouvel agent d'analyse.</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: DANGER ZONE */}
            {isAdmin && activeTab === 'danger' && (
              <div className="space-y-6 w-full">
                
                <div className="p-4 sm:p-5 bg-rose-500/5 border border-rose-500/10 dark:border-rose-950/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-rose-500/10 p-1.5 rounded-lg shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                    </div>
                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Attention: Actions Irréversibles</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Les fonctions ci-dessous écrasent ou vident l'ensemble des données d'importation Excel actuelles. Assurez-vous d'avoir téléchargé une sauvegarde locale des feuilles .xlsx depuis le pôle d'exportation avant toute action radicale.
                  </p>
                </div>

                <div className="p-4 sm:p-5 border border-rose-200 dark:border-rose-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Purger le Système</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Efface toutes les données de la base Firestore et remet l'application à zéro.</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setDeleteError('');
                      setShowConfirmModal(true);
                    }} 
                    className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/15 duration-150 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> 
                    <span>Réinitialiser la base</span>
                  </button>
                </div>

                {deleteError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-950 font-semibold text-xs space-y-2">
                    <p>{deleteError}</p>
                    {deleteError.includes('Quota') && (
                      <p className="text-[10px] text-slate-500 leading-normal">
                        ℹ️ Plus d'informations sur les limites de comptage d'écritures gratuites Spark dans la{' '}
                        <a href="https://console.firebase.google.com/project/project-79ae2089-3125-4bde-8b5/firestore/databases/ai-studio-e87dc6c2-35c4-4d15-8ac6-32dd9a0a01fa/data" target="_blank" rel="noopener noreferrer" className="underline font-bold text-rose-800 hover:text-rose-900">
                          Console Firebase
                        </a>.
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isDeleting && setShowConfirmModal(false)}></div>
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full border border-slate-200/50 dark:border-slate-800/80 animate-in zoom-in-95 duration-200 z-10">
            <h4 className="text-sm sm:text-md font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>Confirmer la suppression</span>
            </h4>
            
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-6">
              Êtes-vous absolument sûr de vouloir purger définitivement <strong className="text-slate-800 dark:text-slate-100">l'ensemble des données d'importation</strong>? Toute modification est immédiate et se propage sur vos dashboards d'équipe.
            </p>
            
            {deleteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition text-xs cursor-pointer"
              >
                Annuler
              </button>
              
              <button
                disabled={isDeleting}
                onClick={handleReset}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-md shadow-rose-600/15"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purge en cours...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Oui, purger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
