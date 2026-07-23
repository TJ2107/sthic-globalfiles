import React, { useState } from 'react';
import { loginWithEmail } from '../firebase';
import { Mail, Lock, Loader2, Cpu } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      console.error('Login error', err);
      setError('Identifiants incorrects ou erreur de connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative bg-[#070a13] overflow-hidden px-4">
      {/* Abstract sleek background glow pieces */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[130px]" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[130px]" />
      
      <div className="p-8 md:p-10 backdrop-blur-2xl bg-slate-900/60 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/80 w-full max-w-md relative z-10 transition-all duration-500">
        
        {/* App Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 flex items-center justify-center relative shadow-inner mb-4 w-16 h-16">
            <Cpu className="w-8 h-8 text-indigo-400 animate-[pulse_2s_infinite]" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white font-display uppercase">
            Global <span className="text-indigo-400 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Files</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1">Plateforme de Gestion Industrielle & Télécom</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6 text-left">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-slate-600"
                placeholder="nom@email.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-••••••••"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold text-sm py-3 px-6 rounded-xl hover:bg-indigo-500 active:scale-[0.98] cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accéder au tableau de bord'}
          </button>
        </form>

        <div className="text-center text-slate-500 text-xs font-medium mt-6 pt-4 border-t border-slate-800/40">
          © Empreintes Technologies 2026
        </div>
      </div>
    </div>
  );
};

