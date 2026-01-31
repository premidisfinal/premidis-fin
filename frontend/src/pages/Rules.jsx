import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { BookOpen, Plus, FileText, Shield, Users, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import API_URL from "../config/api";

const Rules = () => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    effective_date: ''
  });

  const categories = [
    { value: 'general', label: 'Règles générales', icon: FileText },
    { value: 'conduct', label: 'Code de conduite', icon: Users },
    { value: 'security', label: 'Sécurité', icon: Shield },
    { value: 'schedule', label: 'Horaires', icon: Clock }
  ];

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rules`);
      setRules(response.data.rules);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/rules`, formData);
      toast.success('Règlement ajouté');
      setDialogOpen(false);
      setFormData({ title: '', content: '', category: 'general', effective_date: '' });
      fetchRules();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedRules = rules.reduce((acc, rule) => {
    const category = rule.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {});

  const getCategoryInfo = (categoryValue) => {
    return categories.find(c => c.value === categoryValue) || categories[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="rules-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('rules')}</h1>
            <p className="text-muted-foreground">Règlement d'ordre intérieur et conformité</p>
          </div>

          {isAdmin() && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-rule-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un règlement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau règlement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre du règlement"
                      required
                      data-testid="rule-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger data-testid="rule-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date d'effet</Label>
                    <Input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                      required
                      data-testid="rule-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Contenu détaillé du règlement..."
                      rows={6}
                      required
                      data-testid="rule-content"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting} data-testid="save-rule-btn">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Category Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          {categories.map((cat) => {
            const count = groupedRules[cat.value]?.length || 0;
            return (
              <Card key={cat.value} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{cat.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Rules List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun règlement pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Règlements en vigueur</CardTitle>
              <CardDescription>{rules.length} règlement(s) disponible(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {categories.map((cat) => {
                  const categoryRules = groupedRules[cat.value] || [];
                  if (categoryRules.length === 0) return null;
                  
                  return (
                    <AccordionItem key={cat.value} value={cat.value}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <cat.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{cat.label}</span>
                          <Badge variant="secondary">{categoryRules.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {categoryRules.map((rule) => (
                            <div
                              key={rule.id}
                              className="p-4 rounded-lg border bg-muted/30"
                              data-testid={`rule-${rule.id}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-medium">{rule.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                    {rule.content}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  Effectif: {format(new Date(rule.effective_date), 'dd/MM/yyyy')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-secondary/5 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">{t('compliance')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tous les employés sont tenus de respecter les règlements en vigueur. 
                  Toute infraction peut entraîner des sanctions disciplinaires conformément 
                  au code du travail en vigueur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Rules;
