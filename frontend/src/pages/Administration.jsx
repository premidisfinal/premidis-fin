import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { 
  Users, Plus, Search, Filter, Loader2, Mail, Phone, 
  Building2, Calendar, Briefcase, Edit, Trash2, Eye, Download, Upload
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Administration = () => {
  const navigate = useNavigate();
  const { user, isAdmin, canEdit } = useAuth();
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSite, setFilterSite] = useState('all');
  const [filterHierarchy, setFilterHierarchy] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: 'Temp123!',
    phone: '',
    department: 'administration',
    position: '',
    hire_date: '',
    salary: '',
    salary_currency: 'USD',
    role: 'employee',
    category: 'agent',
    country: 'RDC',
    site_id: '',
    hierarchy_level: 'employe'
  });

  const departments = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'comptabilite', label: 'Comptabilité' },
    { value: 'administration', label: 'Administration' },
    { value: 'ressources_humaines', label: 'Ressources Humaines' },
    { value: 'juridique', label: 'Juridique' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'chauffeur', label: 'Chauffeur' },
    { value: 'technicien', label: 'Technicien' },
    { value: 'direction', label: 'Direction' },
    { value: 'logistique', label: 'Logistique' },
    { value: 'production', label: 'Production' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'informatique', label: 'Informatique' }
  ];

  const hierarchyLevels = [
    { value: 'employe', label: 'Employé simple' },
    { value: 'chef_departement', label: 'Chef de département' }
  ];

  const countries = ['RDC', 'Congo', 'Rwanda', 'Burundi', 'Uganda', 'Kenya', 'Tanzanie', 'Cameroun'];

  useEffect(() => {
    fetchData();
  }, [filterDepartment, filterSite, filterHierarchy]);

  const fetchData = async () => {
    try {
      const [empRes, sitesRes] = await Promise.all([
        axios.get(`${API_URL}/api/employees`),
        axios.get(`${API_URL}/api/sites`)
      ]);
      setEmployees(empRes.data.employees || []);
      setSites(sitesRes.data.sites || []);
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
      const payload = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        is_manager: formData.hierarchy_level === 'chef_departement'
      };
      
      if (editEmployee) {
        await axios.put(`${API_URL}/api/employees/${editEmployee.id}`, payload);
        toast.success('Employé mis à jour');
      } else {
        await axios.post(`${API_URL}/api/employees`, payload);
        toast.success('Employé ajouté');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee) => {
    setEditEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || 'administration',
      position: employee.position || '',
      hire_date: employee.hire_date || '',
      salary: employee.salary ? employee.salary.toString() : '',
      salary_currency: employee.salary_currency || 'USD',
      role: employee.role || 'employee',
      category: employee.category || 'agent',
      country: employee.country || 'RDC',
      site_id: employee.site_id || '',
      hierarchy_level: employee.hierarchy_level || (employee.is_manager ? 'chef_departement' : 'employe')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id, permanent = false) => {
    const confirmMsg = permanent 
      ? 'ATTENTION: Cette action supprimera définitivement l\'employé et toutes ses données. Continuer ?'
      : 'Désactiver cet employé ? Il pourra être réactivé plus tard.';
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await axios.delete(`${API_URL}/api/employees/${id}`, {
        params: { permanent }
      });
      toast.success(permanent ? 'Employé supprimé définitivement' : 'Employé désactivé');
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditEmployee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: 'Temp123!',
      phone: '',
      department: 'administration',
      position: '',
      hire_date: '',
      salary: '',
      salary_currency: 'USD',
      role: 'employee',
      category: 'agent',
      contract_type: 'CDI',
      country: 'RDC'
    });
  };

  // Export employees to CSV
  const handleExport = () => {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Département', 'Poste', 'Date embauche', 'Statut'];
    const csv = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        emp.first_name,
        emp.last_name,
        emp.email,
        emp.phone || '',
        emp.department,
        emp.position || '',
        emp.hire_date || '',
        emp.is_active ? 'Actif' : 'Inactif'
      ].map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export réussi');
  };

  // Import employees from CSV
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header
      let imported = 0;
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
        const [firstName, lastName, email, phone, department, position, hireDate] = parts;
        
        if (firstName && lastName && email) {
          try {
            await axios.post(`${API_URL}/api/employees`, {
              first_name: firstName,
              last_name: lastName,
              email: email,
              password: 'Import123!',
              phone: phone || '',
              department: department || 'administration',
              position: position || '',
              hire_date: hireDate || '',
              role: 'employee',
              category: 'agent'
            });
            imported++;
          } catch (err) {
            console.error('Failed to import:', email, err);
          }
        }
      }
      
      toast.success(`${imported} employé(s) importé(s)`);
      fetchEmployees();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="administration-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('administration')}</h1>
            <p className="text-muted-foreground">Gestion des dossiers du personnel</p>
          </div>
          
          {canEdit() && (
            <div className="flex gap-2">
              {/* Hidden file input for import */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="import-btn">
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </Button>
              
              <Button variant="outline" onClick={handleExport} data-testid="export-btn">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button data-testid="add-employee-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('firstName')}</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        data-testid="emp-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('lastName')}</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        data-testid="emp-lastname"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('email')}</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        data-testid="emp-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="emp-phone"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('department')}</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                      >
                        <SelectTrigger data-testid="emp-department">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Poste</Label>
                      <Input
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                        data-testid="emp-position"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date d'embauche</Label>
                      <Input
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                        required
                        data-testid="emp-hire-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salaire</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          required
                          className="flex-1"
                          data-testid="emp-salary"
                        />
                        <Select
                          value={formData.salary_currency || 'USD'}
                          onValueChange={(value) => setFormData({ ...formData, salary_currency: value })}
                        >
                          <SelectTrigger className="w-24" data-testid="emp-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="FC">FC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de contrat</Label>
                      <Select
                        value={formData.contract_type}
                        onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                      >
                        <SelectTrigger data-testid="emp-contract">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {contractTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pays</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData({ ...formData, country: value })}
                      >
                        <SelectTrigger data-testid="emp-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting} data-testid="save-employee-btn">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editEmployee ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="employee-search"
            />
          </div>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[200px]" data-testid="department-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Département" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{filteredEmployees.length} employé(s) trouvé(s)</span>
        </div>

        {/* Employees Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun employé trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`employee-card-${employee.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={employee.avatar_url ? (employee.avatar_url.startsWith('http') ? employee.avatar_url : `${API_URL}${employee.avatar_url.startsWith('/api/') ? '' : '/api'}${employee.avatar_url}`) : null} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">
                        {employee.department?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{employee.country}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{employee.contract_type}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/employee/${employee.id}`)}
                      data-testid={`view-${employee.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir dossier
                    </Button>
                    {isAdmin() && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          data-testid={`edit-${employee.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              data-testid={`delete-${employee.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(employee.id, false)}>
                              Désactiver
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(employee.id, true)}
                              className="text-destructive"
                            >
                              Supprimer définitivement
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Administration;
