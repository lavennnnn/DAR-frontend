import React, { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  ListTodo, 
  Settings, 
  Wand2,
  Menu,
  Bell
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: any; // Translation object
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, t }) => {
  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'resources', label: t.nav.resources, icon: Radio },
    { id: 'tasks', label: t.nav.tasks, icon: ListTodo },
    { id: 'ai-lab', label: t.nav.aiLab, icon: Wand2 },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="flex h-screen theme-bg-main overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 theme-bg-panel border-r theme-border flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b theme-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
               <Radio className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold theme-text-main tracking-tight">
              {t.appTitle === 'ArraySys' ? <>Array<span className="text-blue-500">Sys</span></> : t.appTitle}
            </h1>
          </div>
          <p className="text-xs theme-text-muted mt-2">Resource Scheduling System</p>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
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
          <div className="flex items-center p-2 rounded-lg bg-slate-700/30">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium theme-text-main">Admin User</p>
              <p className="text-xs theme-text-muted">System Operator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 theme-bg-panel backdrop-blur-md border-b theme-border flex items-center justify-between px-6 z-10">
          <div className="md:hidden">
            <Menu className="theme-text-muted" />
          </div>
          <h2 className="text-lg font-semibold theme-text-main ml-2 md:ml-0">
            {navItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center space-x-4">
             <button className="relative p-2 theme-text-muted hover:text-white transition-colors">
               <Bell size={20} />
               <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
             </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto theme-bg-main p-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
