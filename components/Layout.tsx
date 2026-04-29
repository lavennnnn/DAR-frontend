import React, { ReactNode } from 'react';
import {
  LayoutDashboard,
  Radio,
  ListTodo,
  Settings,
  Menu,
  Bell,
  LogOut,
  Globe,
  Sun,
  Moon,
  Droplets
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language, Theme } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: any; // Translation object
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  pushNotifications: boolean;
  hasNotifications: boolean;
  onClearNotifications: () => void;
}

const Layout: React.FC<LayoutProps> = ({
                                         children,
                                         activeTab,
                                         setActiveTab,
                                         t,
                                         language,
                                         setLanguage,
                                         theme,
                                         setTheme,
                                         pushNotifications,
                                         hasNotifications,
                                         onClearNotifications
                                       }) => {
  const { user, logout } = useAuth();
  const showNotificationDot = pushNotifications && hasNotifications;

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'resources', label: t.nav.resources, icon: Radio },
    { id: 'tasks', label: t.nav.tasks, icon: ListTodo },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

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

  // Logic to determine display name and initials
  // Prioritize nickname, then username.
  const displayName = user?.nickname || user?.username || t.common?.user || 'User';
  const initials = (user?.nickname || user?.username || 'US').substring(0, 2).toUpperCase();

  return (
      <div className="flex h-screen theme-bg-main overflow-hidden font-sans">
        {/* Sidebar */}
        <aside className="w-60 theme-bg-panel border-r theme-border flex flex-col z-10 hidden md:flex">
          <div className="p-5 border-b theme-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Radio className="text-white h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold theme-text-main tracking-tight">
                {t.appTitle === 'ArraySys' ? <>Array<span className="text-blue-500">Sys</span></> : t.appTitle}
              </h1>
            </div>
            <p className="text-xs theme-text-muted mt-2">{t.nav?.tasks || 'Resource Scheduling System'}</p>
          </div>

          <nav className="flex-1 py-5 px-3 space-y-1">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-md transition-all duration-200 group ${
                        activeTab === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                            : 'theme-text-muted hover:bg-slate-700/50 hover:text-white'
                    }`}
                >
                  <item.icon
                      size={20}
                      className={`mr-3 ${activeTab === item.id ? 'text-white' : 'theme-text-muted group-hover:text-white'}`}
                  />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
            ))}
          </nav>

          <div className="p-4 border-t theme-border">
            <div className="flex items-center justify-between p-2 rounded-lg theme-surface-panel">
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 rounded-full theme-avatar-surface flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase">
                  {initials}
                </div>
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium theme-text-main truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs theme-text-muted">{t.common?.operator || 'Operator'}</p>
                </div>
              </div>
              <button
                  onClick={logout}
                  className="ml-2 p-1.5 theme-text-muted rounded-md transition-colors theme-surface-hover"
                  title={t.common?.logout || 'Logout'}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 theme-bg-panel backdrop-blur-md border-b theme-border flex items-center justify-between px-6 z-10">
            <div className="md:hidden">
              <Menu className="theme-text-muted" />
            </div>
            <h2 className="text-lg font-semibold theme-text-main ml-2 md:ml-0">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="flex items-center space-x-3">
              <button
                  onClick={toggleLanguage}
                  className="p-2 theme-text-muted hover:text-white transition-colors rounded-full hover:bg-slate-700/50"
                  title={language === 'en' ? 'Switch to Chinese' : '切换到英文'}
              >
                <Globe size={20} />
              </button>

              <button
                  onClick={toggleTheme}
                  className="p-2 theme-text-muted hover:text-white transition-colors rounded-full hover:bg-slate-700/50"
                  title={t.common?.switchTheme || 'Switch Theme'}
              >
                {getThemeIcon()}
              </button>

              <div className="h-6 w-px bg-slate-700 mx-2"></div>

              <button
                className="relative p-2 theme-text-muted hover:text-white transition-colors"
                onClick={onClearNotifications}
                title={t.common?.notifications || 'Notifications'}
              >
                <Bell size={20} />
                {showNotificationDot && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </header>

          {/* Content Scroll Area */}
          <main className="flex-1 overflow-y-auto theme-bg-main p-5">
            <div className="max-w-6xl mx-auto h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
};

export default Layout;
