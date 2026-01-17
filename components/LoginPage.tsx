import React, { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, Loader2, Globe, Sun, Moon, Droplets } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Language, Theme } from '../types';

interface LoginPageProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: any; // Translation object
}

const LoginPage: React.FC<LoginPageProps> = ({ language, setLanguage, theme, setTheme, t }) => {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const user = await api.register({
          username: formData.username,
          password: formData.password,
          nickname: formData.nickname
        });
        if (user) {
          // If backend returns a user object but nickname is missing/empty,
          // manually inject the nickname from the form data to ensure UI displays it correctly.
          if (!user.nickname && formData.nickname) {
            user.nickname = formData.nickname;
          }
          login(user);
        } else {
          setError(t.login.regFailed);
        }
      } else {
        const user = await api.login({
          username: formData.username,
          password: formData.password
        });
        if (user) {
          if (!user.username) {
            user.username = formData.username;
          }
          login(user);
        } else {
          setError(t.login.loginFailed);
        }
      }
    } catch (err) {
      setError(t.login.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => setLanguage(language === 'en' ? 'zh' : 'en');

  const toggleTheme = () => {
    if (theme === 'default') setTheme('light');
    else if (theme === 'light') setTheme('ocean');
    else setTheme('default');
  };

  const getThemeIcon = () => {
    switch(theme) {
      case 'light': return <Sun size={20} />;
      case 'ocean': return <Droplets size={20} />;
      default: return <Moon size={20} />;
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center theme-bg-main p-4 font-sans relative transition-colors duration-300">
        {/* Top Right Controls */}
        <div className="absolute top-6 right-6 flex space-x-2 z-20">
          <button
              onClick={toggleLanguage}
              className="p-2 theme-text-muted hover:text-white transition-colors theme-bg-panel rounded-full border theme-border shadow-lg"
              title={language === 'en' ? 'Switch to Chinese' : '切换到英文'}
          >
            <Globe size={20} />
          </button>
          <button
              onClick={toggleTheme}
              className="p-2 theme-text-muted hover:text-white transition-colors theme-bg-panel rounded-full border theme-border shadow-lg"
              title="Switch Theme"
          >
            {getThemeIcon()}
          </button>
        </div>

        <div className="w-full max-w-md theme-bg-panel rounded-xl shadow-2xl overflow-hidden border theme-border transition-colors duration-300">
          {/* Header */}
          <div className="p-8 text-center border-b theme-border bg-slate-700/10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <User className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold theme-text-main mb-1">
              {isRegistering ? t.login.createAccount : t.login.welcome}
            </h2>
            <p className="theme-text-muted text-sm">
              {isRegistering ? t.login.joinSubtitle : t.login.subtitle}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium theme-text-muted mb-1.5">{t.login.username}</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 theme-text-muted w-5 h-5" />
                  <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full theme-bg-main border theme-border rounded-lg py-2.5 pl-10 pr-4 theme-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t.login.enterUser}
                  />
                </div>
              </div>

              {isRegistering && (
                  <div>
                    <label className="block text-sm font-medium theme-text-muted mb-1.5">{t.login.nickname}</label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-3 theme-text-muted w-5 h-5" />
                      <input
                          type="text"
                          required
                          value={formData.nickname}
                          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          className="w-full theme-bg-main border theme-border rounded-lg py-2.5 pl-10 pr-4 theme-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder={t.login.enterNick}
                      />
                    </div>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium theme-text-muted mb-1.5">{t.login.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 theme-text-muted w-5 h-5" />
                  <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full theme-bg-main border theme-border rounded-lg py-2.5 pl-10 pr-4 theme-text-main placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <>
                    {isRegistering ? t.login.signUp : t.login.signIn}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
              )}
            </button>

            <div className="text-center mt-6">
              <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setFormData({ username: '', password: '', nickname: '' });
                  }}
                  className="theme-text-muted hover:text-white text-sm font-medium transition-colors"
              >
                {isRegistering
                    ? t.login.haveAccount
                    : t.login.noAccount}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default LoginPage;