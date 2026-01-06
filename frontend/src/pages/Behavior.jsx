import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, ThumbsUp, ThumbsDown, Clock, User, Search, Filter, Loader2, Download,
  Upload, FileText, X, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Behavior = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [behaviors, setBehaviors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'positive',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    document_urls: []
  });
  
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch behaviors
      const behaviorRes = await axios.get(`${API_URL}/api/behavior`);
      setBehaviors(behaviorRes.data.behaviors || []);

      // Fetch employees for admin
      if (isAdmin()) {
        const empRes = await axios.get(`${API_URL}/api/employees`);
        setEmployees(empRes.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.note) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/behavior`, formData);
      toast.success('Note de comportement ajoutée');
      setDialogOpen(false);
      setFormData({ employee_id: '', type: 'positive', note: '', date: format(new Date(), 'yyyy-MM-dd'), document_urls: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const csv = [
      'Date,Employé,Type,Note',
      ...behaviors.map(b => 
        `${b.date},"${b.employee_name}",${b.type},"${b.note.replace(/"/g, '""')}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comportements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Export réussi');
  };

  const filteredBehaviors = behaviors.filter(b => {
    if (filterType !== 'all' && b.type !== filterType) return false;
    if (searchQuery && !b.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: behaviors.length,
    positive: behaviors.filter(b => b.type === 'positive').length,
    negative: behaviors.filter(b => b.type === 'negative').length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="behavior-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suivi du Comportement</h1>
            <p className="text-muted-foreground">
              {isAdmin() ? 'Gérez les notes de comportement des employés' : 'Votre historique de comportement'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            {isAdmin() && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-behavior-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle note de comportement</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employé</Label>
                      <Select
                        value={formData.employee_id}
                        onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un employé" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">
                            <div className="flex items-center gap-2">
                              <ThumbsUp className="h-4 w-4 text-green-500" />
                              Positif
                            </div>
                          </SelectItem>
                          <SelectItem value="negative">
                            <div className="flex items-center gap-2">
                              <ThumbsDown className="h-4 w-4 text-red-500" />
                              Négatif
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Textarea
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Décrivez le comportement observé..."
                        rows={4}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total des notes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Clock className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notes positives</p>
                  <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notes négatives</p>
                  <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
                </div>
                <ThumbsDown className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {isAdmin() && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="positive">Positifs</SelectItem>
                <SelectItem value="negative">Négatifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Behavior List */}
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>
              {isAdmin() ? 'Toutes les notes de comportement' : 'Votre historique personnel'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBehaviors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune note de comportement</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBehaviors.map((behavior) => (
                  <div
                    key={behavior.id}
                    className={`p-4 rounded-lg border-l-4 bg-card hover:bg-muted/50 transition-colors ${
                      behavior.type === 'positive' ? 'border-l-green-500' : 'border-l-red-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {behavior.type === 'positive' ? (
                          <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <ThumbsDown className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{behavior.employee_name}</span>
                            <Badge variant={behavior.type === 'positive' ? 'default' : 'destructive'}>
                              {behavior.type === 'positive' ? 'Positif' : 'Négatif'}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">{behavior.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(behavior.date), 'dd MMMM yyyy', { locale: fr })}
                            {behavior.created_by_name && ` • Par ${behavior.created_by_name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Behavior;
