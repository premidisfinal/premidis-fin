import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { TrendingUp, Target, Award, Star, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Performance = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/performance`);
      setEvaluations(response.data.evaluations);
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

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="performance-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('performance')}</h1>
          <p className="text-muted-foreground">Objectifs et évaluations de performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('evaluations')}</p>
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
            <CardDescription>Vos évaluations de performance passées</CardDescription>
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
                    data-testid={`evaluation-${evaluation.id}`}
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
                        <p className="text-sm font-medium mb-3">{t('objectives')}</p>
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
                  Votre prochaine évaluation aura lieu prochainement.
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
