import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  t: any;
}

export default function AdminLogin({ onLogin, onGoogleLogin, t }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const success = await onLogin(email, password);
    setIsLoading(false);
    if (!success) {
      setError(t.adminLogin.error);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setError(null);
    const result = await onGoogleLogin();
    setIsLoading(false);
    if (!result.success && result.error) {
      setError(result.error);
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-10 border border-black/5 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="serif text-3xl font-bold mb-2">{t.adminLogin.title}</h2>
          <p className="text-zinc-500 text-sm">{t.adminLogin.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">{t.adminLogin.email}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                required 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">{t.adminLogin.password}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                required 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all group"
          >
            {isLoading ? t.adminLogin.loading : t.adminLogin.login} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-400">{t.adminLogin.or}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-zinc-200 rounded-2xl bg-white hover:bg-zinc-50 transition-colors font-medium text-zinc-700 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {t.adminLogin.googleAdmin}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
          <p className="text-xs text-zinc-400">
            {t.adminLogin.forgot}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
