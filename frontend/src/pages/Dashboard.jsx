import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import ModuleTile from '../components/ModuleTile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  BookOpen,
  Banknote,
  Bell,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: t('communication'),
      icon: MessageSquare,
      description: 'Chat interne et annonces officielles',
      link: '/communication',
      color: 'primary',
      metric: stats?.unread_messages || 0,
      metricLabel: 'non lus',
      badge: stats?.unread_messages > 0 ? 'Nouveau' : null,
      badgeVariant: 'destructive'
    },
    {
      title: t('administration'),
      icon: Users,
      description: 'Gestion des dossiers et contrats',
      link: '/administration',
      color: 'secondary',
      metric: stats?.total_employees || 0,
      metricLabel: 'employés',
      adminOnly: true
    },
    {
      title: t('timeManagement'),
      icon: Clock,
      description: 'Présences, absences et congés',
      link: '/time-management',
      color: 'accent',
      metric: isAdmin() ? stats?.pending_leaves : stats?.my_leaves_pending,
      metricLabel: 'en attente'
    },
    {
      title: t('performance'),
      icon: TrendingUp,
      description: 'Objectifs et évaluations',
      link: '/performance',
      color: 'primary'
    },
    {
      title: t('rules'),
      icon: BookOpen,
      description: 'Règlement et conformité',
      link: '/rules',
      color: 'secondary'
    },
    {
      title: t('payroll'),
      icon: Banknote,
      description: 'Fiches de paie et rémunérations',
      link: '/payroll',
      color: 'accent',
      metric: stats?.my_payslips,
      metricLabel: 'fiches'
    }
  ];

  const quickActions = [
    { icon: Calendar, label: 'Demander un congé', link: '/time-management' },
    { icon: FileText, label: 'Voir mes fiches de paie', link: '/payroll' },
    { icon: Bell, label: 'Voir les annonces', link: '/communication' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('welcome')}, {user?.first_name} 
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de votre espace RH
          </p>
        </div>

        {/* Quick Stats for Admin */}
        {isAdmin() && (
          <div className="grid gap-4 md:grid-cols-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            ) : (
              <>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('totalEmployees')}</p>
                        <p className="text-2xl font-bold">{stats?.total_employees || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-primary/50" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-secondary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('pendingLeaves')}</p>
                        <p className="text-2xl font-bold">{stats?.pending_leaves || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-secondary/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-accent">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('announcements')}</p>
                        <p className="text-2xl font-bold">{stats?.total_announcements || 0}</p>
                      </div>
                      <Bell className="h-8 w-8 text-accent/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-destructive">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('unreadMessages')}</p>
                        <p className="text-2xl font-bold">{stats?.unread_messages || 0}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-destructive/50" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Module Tiles */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Modules</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {modules.map((module, index) => {
              if (module.adminOnly && !isAdmin()) return null;
              return (
                <ModuleTile
                  key={module.title}
                  {...module}
                />
              );
            })}
          </div>
        </div>

        {/* Quick Actions for Employees */}
        {!isAdmin() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {quickActions.map((action) => (
                  <a
                    key={action.label}
                    href={action.link}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <action.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Department Stats for Admin */}
        {isAdmin() && stats?.employees_by_department && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employés par département</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {Object.entries(stats.employees_by_department).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium capitalize">{t(dept) || dept.replace('_', ' ')}</span>
                    <span className="text-lg font-bold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
