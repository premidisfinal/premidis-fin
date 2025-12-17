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
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar as CalendarIcon, Plus, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TimeManagement = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: null,
    end_date: null,
    reason: ''
  });

  const leaveTypes = [
    { value: 'annual', label: t('annual') },
    { value: 'sick', label: t('sick') },
    { value: 'maternity', label: t('maternity') },
    { value: 'paternity', label: t('paternity') },
    { value: 'unpaid', label: t('unpaid') }
  ];

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leaves`);
      setLeaves(response.data.leaves);
    } catch (error) {
      toast.error('Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leaves/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/leaves`, {
        ...formData,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd')
      });
      toast.success('Demande de congé soumise');
      setDialogOpen(false);
      setFormData({ leave_type: 'annual', start_date: null, end_date: null, reason: '' });
      fetchLeaves();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      await axios.put(`${API_URL}/api/leaves/${leaveId}`, { status });
      toast.success(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`);
      fetchLeaves();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    const icons = {
      pending: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle
    };
    const Icon = icons[status];
    
    return (
      <Badge className={`${styles[status]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {t(status)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="time-management-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('timeManagement')}</h1>
            <p className="text-muted-foreground">Gérez vos congés et absences</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="request-leave-btn">
                <Plus className="mr-2 h-4 w-4" />
                Demander un congé
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle demande de congé</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de congé</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                  >
                    <SelectTrigger data-testid="leave-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left" data-testid="start-date-btn">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left" data-testid="end-date-btn">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => setFormData({ ...formData, end_date: date })}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motif</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Décrivez la raison de votre demande..."
                    required
                    data-testid="leave-reason"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting} data-testid="submit-leave-btn">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Soumettre la demande
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('pending')}</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('approved')}</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('rejected')}</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaves List */}
        <Card>
          <CardHeader>
            <CardTitle>Mes demandes de congé</CardTitle>
            <CardDescription>Historique de vos demandes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande de congé</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4"
                    data-testid={`leave-item-${leave.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {leaveTypes.find(t => t.value === leave.leave_type)?.label || leave.leave_type}
                        </span>
                        {getStatusBadge(leave.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Du {leave.start_date} au {leave.end_date}
                      </p>
                      <p className="text-sm">{leave.reason}</p>
                      {leave.employee_name && isAdmin() && (
                        <p className="text-xs text-muted-foreground">
                          Par: {leave.employee_name}
                        </p>
                      )}
                    </div>
                    
                    {isAdmin() && leave.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleStatusUpdate(leave.id, 'approved')}
                          data-testid={`approve-${leave.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                          data-testid={`reject-${leave.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t('reject')}
                        </Button>
                      </div>
                    )}
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

export default TimeManagement;
