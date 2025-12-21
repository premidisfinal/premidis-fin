import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TrendingUp, Target, Award, Star, Loader2, Building2, User, Users } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Performance = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('individual');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Mock data for company and department performance
  const companyObjectives = [
    { id: 1, title: 'Croissance du chiffre d\'affaires', progress: 78, target: '20%', current: '15.6%' },
    { id: 2, title: 'Satisfaction client', progress: 92, target: '90%', current: '92%' },
    { id: 3, title: 'Réduction des coûts', progress: 65, target: '10%', current: '6.5%' },
    { id: 4, title: 'Formation des employés', progress: 85, target: '100%', current: '85%' }
  ];

  const departmentPerformance = [
    { department: 'Marketing', score: 88, employees: 45, trend: '+5%' },
    { department: 'Comptabilité', score: 92, employees: 30, trend: '+3%' },
    { department: 'Ressources Humaines', score: 85, employees: 25, trend: '+8%' },
    { department: 'Administration', score: 90, employees: 50, trend: '+2%' },
    { department: 'Juridique', score: 87, employees: 15, trend: '+4%' },
    { department: 'Sécurité', score: 94, employees: 60, trend: '+1%' }
  ];

  const departments = [
    { value: 'all', label: 'Tous les départements' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'comptabilite', label: 'Comptabilité' },
    { value: 'ressources_humaines', label: 'Ressources Humaines' },
    { value: 'administration', label: 'Administration' },
    { value: 'juridique', label: 'Juridique' },
    { value: 'securite', label: 'Sécurité' }
  ];

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/performance`);
      setEvaluations(response.data.evaluations || []);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingLabel = (rating) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4) return 'Très bien';
    if (rating >= 3) return 'Satisfaisant';
    if (rating >= 2) return 'À améliorer';
    return 'Insuffisant';
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="performance-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('performance')}</h1>
          <p className="text-muted-foreground">Suivi des performances de l'entreprise</p>
        </div>

        {/* Tabs - Employees do NOT see Company tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-3' : 'grid-cols-2'} max-w-lg`}>
            {isAdmin() && (
              <TabsTrigger value="company" className="flex items-center gap-2" data-testid="tab-company">
                <Building2 className="h-4 w-4" />
                Entreprise
              </TabsTrigger>
            )}
            <TabsTrigger value="department" className="flex items-center gap-2" data-testid="tab-department">
              <Users className="h-4 w-4" />
              Département
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2" data-testid="tab-individual">
              <User className="h-4 w-4" />
              Individuelle
            </TabsTrigger>
          </TabsList>

          {/* COMPANY PERFORMANCE TAB - ADMIN ONLY */}
          {isAdmin() && (
          <TabsContent value="company" className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Score global</p>
                      <p className="text-2xl font-bold">85%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Objectifs atteints</p>
                      <p className="text-2xl font-bold">3/4</p>
                    </div>
                    <Target className="h-8 w-8 text-secondary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tendance</p>
                      <p className="text-2xl font-bold text-green-600">+4%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-accent/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Évaluations</p>
                      <p className="text-2xl font-bold">{evaluations.length}</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Company Objectives */}
            <Card>
              <CardHeader>
                <CardTitle>Objectifs de l'entreprise</CardTitle>
                <CardDescription>Progression vers les objectifs annuels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {companyObjectives.map((obj) => (
                    <div key={obj.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{obj.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Objectif: {obj.target} • Actuel: {obj.current}
                          </p>
                        </div>
                        <Badge variant={obj.progress >= 80 ? 'default' : obj.progress >= 60 ? 'secondary' : 'destructive'}>
                          {obj.progress}%
                        </Badge>
                      </div>
                      <Progress value={obj.progress} className="h-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* DEPARTMENT PERFORMANCE TAB */}
          <TabsContent value="department" className="mt-6 space-y-6">
            <div className="flex justify-end">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departmentPerformance.map((dept) => (
                <Card key={dept.department} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{dept.department}</CardTitle>
                      <Badge variant={dept.score >= 90 ? 'default' : dept.score >= 80 ? 'secondary' : 'outline'}>
                        {dept.score}%
                      </Badge>
                    </div>
                    <CardDescription>{dept.employees} employés</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={dept.score} className="h-2 mb-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tendance</span>
                      <span className="text-green-600 font-medium">{dept.trend}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* INDIVIDUAL PERFORMANCE TAB */}
          <TabsContent value="individual" className="mt-6 space-y-6">
            {/* Personal Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Mes évaluations</p>
                      <p className="text-2xl font-bold">{evaluations.length}</p>
                    </div>
                    <Target className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Note moyenne</p>
                      <p className="text-2xl font-bold">
                        {evaluations.length > 0 
                          ? (evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length).toFixed(1)
                          : '-'
                        }
                        <span className="text-sm text-muted-foreground">/5</span>
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-secondary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Objectifs atteints</p>
                      <p className="text-2xl font-bold">
                        {evaluations.filter(e => e.rating >= 4).length}
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-accent/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evaluations List */}
            <Card>
              <CardHeader>
                <CardTitle>Historique des évaluations</CardTitle>
                <CardDescription>Vos évaluations de performance</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : evaluations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune évaluation pour le moment</p>
                    <p className="text-sm mt-2">Vos évaluations de performance apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluations.map((evaluation) => (
                      <div
                        key={evaluation.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{evaluation.period}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {evaluation.comments || 'Pas de commentaire'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${getRatingColor(evaluation.rating)}`}>
                                {evaluation.rating}
                                <span className="text-sm text-muted-foreground">/5</span>
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {getRatingLabel(evaluation.rating)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {evaluation.objectives && evaluation.objectives.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Objectifs</p>
                            <div className="space-y-3">
                              {evaluation.objectives.map((obj, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{obj.title || obj.name}</span>
                                    <span className="text-muted-foreground">{obj.progress || obj.score}%</span>
                                  </div>
                                  <Progress value={obj.progress || obj.score || 0} className="h-2" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Prochaine évaluation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les évaluations de performance sont effectuées chaque trimestre. 
                  Votre performance est basée sur votre département, votre pointage et vos objectifs personnels.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
