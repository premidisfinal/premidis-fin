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
import { 
  Calendar as CalendarIcon, Plus, Clock, CheckCircle, XCircle, AlertCircle, 
  Loader2, ChevronLeft, ChevronRight, LogIn, LogOut, Download,
  Users, FileText, Settings
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TimeManagement = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('calendar');
  const [leaves, setLeaves] = useState([]);
  const [calendarLeaves, setCalendarLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: null,
    end_date: null,
    reason: ''
  });

  const [attendanceForm, setAttendanceForm] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in: '',
    check_out: '',
    notes: ''
  });
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [leaveRules, setLeaveRules] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({});

  const leaveTypes = [
    { value: 'annual', label: 'Congé annuel', color: 'bg-blue-500' },
    { value: 'sick', label: 'Congé maladie', color: 'bg-red-500' },
    { value: 'maternity', label: 'Congé maternité', color: 'bg-pink-500' },
    { value: 'exceptional', label: 'Autorisation exceptionnelle', color: 'bg-orange-500' },
    { value: 'public', label: 'Jour férié', color: 'bg-green-500' }
  ];

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch leaves
      const leavesRes = await axios.get(`${API_URL}/api/leaves`);
      setLeaves(leavesRes.data.leaves || []);

      // Fetch calendar leaves
      const calendarRes = await axios.get(`${API_URL}/api/leaves/calendar`, {
        params: { 
          month: currentMonth.getMonth() + 1, 
          year: currentMonth.getFullYear() 
        }
      });
      setCalendarLeaves(calendarRes.data.leaves || []);

      // Fetch stats
      const statsRes = await axios.get(`${API_URL}/api/leaves/stats`);
      setStats(statsRes.data);

      // Fetch leave rules
      try {
        const rulesRes = await axios.get(`${API_URL}/api/leaves/rules`);
        setLeaveRules(rulesRes.data);
      } catch {}

      // Fetch leave balance
      try {
        const balanceRes = await axios.get(`${API_URL}/api/leaves/balance`);
        setLeaveBalance(balanceRes.data);
      } catch {}

      // Fetch attendance
      const attRes = await axios.get(`${API_URL}/api/attendance`);
      setAttendance(attRes.data.attendance || []);

      // Fetch today's attendance
      const todayRes = await axios.get(`${API_URL}/api/attendance/today`);
      setTodayAttendance(todayRes.data.attendance);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async (e) => {
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      await axios.put(`${API_URL}/api/leaves/${leaveId}`, { status });
      toast.success(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCheckIn = async () => {
    try {
      await axios.post(`${API_URL}/api/attendance/check-in`);
      toast.success('Pointage d\'entrée enregistré');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleCheckOut = async () => {
    try {
      await axios.post(`${API_URL}/api/attendance/check-out`);
      toast.success('Pointage de sortie enregistré');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleCreateAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/attendance`, attendanceForm);
      toast.success('Pointage enregistré');
      setAttendanceDialogOpen(false);
      setAttendanceForm({ employee_id: '', date: format(new Date(), 'yyyy-MM-dd'), check_in: '', check_out: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = activeTab === 'attendance' ? attendance : leaves;
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    const icons = { pending: AlertCircle, approved: CheckCircle, rejected: XCircle };
    const Icon = icons[status];
    
    return (
      <Badge className={`${styles[status]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {t(status)}
      </Badge>
    );
  };

  // Calendar helpers
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getLeavesForDay = (day) => {
    return calendarLeaves.filter(leave => {
      try {
        const start = parseISO(leave.start_date);
        const end = parseISO(leave.end_date);
        return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
      } catch {
        return false;
      }
    });
  };

  const getLeaveColor = (leaveType) => {
    const type = leaveTypes.find(t => t.value === leaveType);
    return type?.color || 'bg-primary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="time-management-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('timeManagement')}</h1>
            <p className="text-muted-foreground">Congés, présences et pointage</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} data-testid="export-btn">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            {isAdmin() && (
              <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="adjust-leaves-btn">
                    <Settings className="mr-2 h-4 w-4" />
                    Ajuster les congés
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Paramètres des congés</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Quota annuel par défaut (jours)</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                    <div className="space-y-2">
                      <Label>Types de congés</Label>
                      <div className="space-y-2">
                        {leaveTypes.map((type) => (
                          <div key={type.value} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${type.color}`} />
                              <span>{type.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full">Enregistrer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
                <form onSubmit={handleSubmitLeave} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type de congé</Label>
                    <Select
                      value={formData.leave_type}
                      onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${type.color}`} />
                              {type.label}
                            </div>
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
                          <Button variant="outline" className="w-full justify-start text-left">
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
                          <Button variant="outline" className="w-full justify-start text-left">
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
                      placeholder="Décrivez la raison..."
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Soumettre
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Punch Buttons */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Pointage du jour</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
                {todayAttendance && (
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-green-600">Entrée: {todayAttendance.check_in || '-'}</span>
                    <span className="text-red-600">Sortie: {todayAttendance.check_out || '-'}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCheckIn}
                  disabled={todayAttendance?.check_in}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="check-in-btn"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrée
                </Button>
                <Button
                  onClick={handleCheckOut}
                  disabled={!todayAttendance?.check_in || todayAttendance?.check_out}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="check-out-btn"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sortie
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - CLICKABLE */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className={`border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => {
              setStatusFilter(statusFilter === 'pending' ? null : 'pending');
              setActiveTab('leaves');
            }}
            data-testid="stat-pending"
          >
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
          
          <Card 
            className={`border-l-4 border-l-green-500 cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => {
              setStatusFilter(statusFilter === 'approved' ? null : 'approved');
              setActiveTab('leaves');
            }}
            data-testid="stat-approved"
          >
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

          <Card 
            className={`border-l-4 border-l-red-500 cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => {
              setStatusFilter(statusFilter === 'rejected' ? null : 'rejected');
              setActiveTab('leaves');
            }}
            data-testid="stat-rejected"
          >
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mes congés
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pointages
            </TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Calendrier des congés</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[150px] text-center">
                      {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {isAdmin() ? 'Vue complète de tous les congés' : 'Congés approuvés et vos demandes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-4">
                  {leaveTypes.map((type) => (
                    <div key={type.value} className="flex items-center gap-1.5 text-sm">
                      <div className={`w-3 h-3 rounded-full ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before first of month */}
                  {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 bg-muted/30 rounded-lg" />
                  ))}
                  
                  {daysInMonth.map((day) => {
                    const dayLeaves = getLeavesForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`h-24 p-1 rounded-lg border transition-colors ${
                          isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayLeaves.slice(0, 3).map((leave) => (
                            <div
                              key={leave.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${getLeaveColor(leave.leave_type)}`}
                              title={`${leave.employee_name}: ${leave.leave_type}`}
                            >
                              {leave.employee_name?.split(' ')[0]}
                            </div>
                          ))}
                          {dayLeaves.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayLeaves.length - 3} autres
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaves Tab */}
          <TabsContent value="leaves" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes demandes de congé</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : leaves.filter(l => !statusFilter || l.status === statusFilter).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune demande de congé {statusFilter ? `(${t(statusFilter)})` : ''}</p>
                    {statusFilter && (
                      <Button variant="link" onClick={() => setStatusFilter(null)}>
                        Voir toutes les demandes
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaves.filter(l => !statusFilter || l.status === statusFilter).map((leave) => (
                      <div
                        key={leave.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getLeaveColor(leave.leave_type)}`} />
                            <span className="font-medium">
                              {leaveTypes.find(t => t.value === leave.leave_type)?.label || leave.leave_type}
                            </span>
                            {getStatusBadge(leave.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Du {leave.start_date} au {leave.end_date}
                          </p>
                          <p className="text-sm">{leave.reason}</p>
                          {leave.employee_name && isAdmin() && (
                            <p className="text-xs text-muted-foreground">Par: {leave.employee_name}</p>
                          )}
                        </div>
                        
                        {isAdmin() && leave.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatusUpdate(leave.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Historique des pointages</CardTitle>
                  <CardDescription>Enregistrement des heures d'entrée et sortie</CardDescription>
                </div>
                {isAdmin() && (
                  <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-attendance-btn">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enregistrer un pointage</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateAttendance} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={attendanceForm.date}
                            onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Heure d'entrée</Label>
                            <Input
                              type="time"
                              value={attendanceForm.check_in}
                              onChange={(e) => setAttendanceForm({...attendanceForm, check_in: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Heure de sortie</Label>
                            <Input
                              type="time"
                              value={attendanceForm.check_out}
                              onChange={(e) => setAttendanceForm({...attendanceForm, check_out: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={attendanceForm.notes}
                            onChange={(e) => setAttendanceForm({...attendanceForm, notes: e.target.value})}
                            placeholder="Notes optionnelles..."
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
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun pointage enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendance.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <p className="text-lg font-bold">{format(parseISO(att.date), 'dd')}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(att.date), 'MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">{att.employee_name}</p>
                            <div className="flex gap-4 text-sm">
                              <span className="text-green-600 flex items-center gap-1">
                                <LogIn className="h-3 w-3" />
                                {att.check_in || '-'}
                              </span>
                              <span className="text-red-600 flex items-center gap-1">
                                <LogOut className="h-3 w-3" />
                                {att.check_out || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {att.notes && (
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {att.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TimeManagement;
