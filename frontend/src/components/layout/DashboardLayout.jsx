import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  BookOpen,
  Banknote,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Globe,
  User
} from 'lucide-react';
import VoiceAssistant from '../VoiceAssistant';
import NotificationCenter from '../NotificationCenter';
import Logo from '../Logo';

const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'dashboard' },
    { path: '/communication', icon: MessageSquare, label: 'communication' },
    { path: '/administration', icon: Users, label: 'administration', adminOnly: true },
    { path: '/time-management', icon: Clock, label: 'timeManagement' },
    { path: '/performance', icon: TrendingUp, label: 'performance' },
    { path: '/rules', icon: BookOpen, label: 'rules' },
    { path: '/payroll', icon: Banknote, label: 'payroll' },
    { path: '/my-profile', icon: User, label: 'Mon Dossier', employeeOnly: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-2 p-4">
      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin()) return null;
        if (item.employeeOnly && isAdmin()) return null;
        const isActive = location.pathname.startsWith(item.path);
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'hover:bg-muted text-foreground/70 hover:text-foreground'
              }
            `}
            data-testid={`nav-${item.label}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{typeof item.label === 'string' && item.label.includes(' ') ? item.label : t(item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-4">
          <Logo size="default" showText={true} />
        </div>
        
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 overflow-y-auto py-4">
            <NavContent />
          </div>
          
          <div className="border-t p-4">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground/70 hover:bg-muted hover:text-foreground transition-all"
              data-testid="nav-settings"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">{t('settings')}</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b px-4">
            <Logo size="default" showText={true} />
          </div>
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="hidden sm:block">
                <h2 className="text-lg font-semibold">{t('welcome')}, {user?.first_name}</h2>
                <p className="text-sm text-muted-foreground">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="language-selector">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{availableLanguages.find(l => l.code === language)?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? 'bg-muted' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <NotificationCenter />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2" data-testid="user-menu-btn">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Voice Assistant FAB */}
      <VoiceAssistant />
    </div>
  );
};

export default DashboardLayout;
