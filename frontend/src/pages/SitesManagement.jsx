import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { 
  Building2, MapPin, Plus, Edit, Trash2, Users, UserCog, 
  Loader2, ArrowLeft, ChevronRight, Crown, User
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SitesManagement = () => {
  const { isAdmin } = useAuth();
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View state - null = list of sites, site object = viewing that site
  const [selectedSite, setSelectedSite] = useState(null);
  
  // Delete site confirmation dialog
  const [deleteSiteDialog, setDeleteSiteDialog] = useState({ open: false, siteId: null });
  
  // Site dialog
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [siteForm, setSiteForm] = useState({
    name: '',
    city: '',
    country: 'RDC',
    address: ''
  });
  
  const [submitting, setSubmitting] = useState(false);

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

  const countries = ['RDC', 'Congo', 'Rwanda', 'Burundi', 'Uganda', 'Kenya', 'Tanzanie', 'Cameroun'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sitesRes, employeesRes] = await Promise.all([
        axios.get(`${API_URL}/api/sites`),
        axios.get(`${API_URL}/api/employees`)
      ]);
      setSites(sitesRes.data.sites || []);
      setEmployees(employeesRes.data.employees || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Site CRUD
  const handleSiteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editSite) {
        await axios.put(`${API_URL}/api/sites/${editSite.id}`, siteForm);
        toast.success('Site mis à jour');
      } else {
        await axios.post(`${API_URL}/api/sites`, siteForm);
        toast.success('Site créé');
      }
      setSiteDialogOpen(false);
      setEditSite(null);
      setSiteForm({ name: '', city: '', country: 'RDC', address: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSite = (siteId) => {
    setDeleteSiteDialog({ open: true, siteId });
  };
  
  const confirmDeleteSite = async () => {
    const siteId = deleteSiteDialog.siteId;
    setDeleteSiteDialog({ open: false, siteId: null });
    
    try {
      await axios.delete(`${API_URL}/api/sites/${siteId}`);
      toast.success('Site supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditSite = (site, e) => {
    e.stopPropagation();
    setEditSite(site);
    setSiteForm({
      name: site.name,
      city: site.city,
      country: site.country,
      address: site.address || ''
    });
    setSiteDialogOpen(true);
  };

  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `${API_URL}${avatarUrl.startsWith('/api/') ? '' : '/api'}${avatarUrl}`;
  };

  // Get employees for a specific site grouped by department
  const getEmployeesBySiteAndDepartment = (siteId) => {
    const siteEmployees = employees.filter(e => e.site_id === siteId);
    const grouped = {};
    
    siteEmployees.forEach(emp => {
      const dept = emp.department || 'non_defini';
      if (!grouped[dept]) {
        grouped[dept] = { chef: null, employees: [] };
      }
      
      // Check if employee is department head
      if (emp.hierarchy_level === 'chef_departement' || emp.is_manager) {
        grouped[dept].chef = emp;
      } else {
        grouped[dept].employees.push(emp);
      }
    });
    
    return grouped;
  };

  // Get department label
  const getDepartmentLabel = (value) => {
    const dept = departments.find(d => d.value === value);
    return dept ? dept.label : value?.replace('_', ' ') || 'Non défini';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // View: Inside a specific site
  if (selectedSite) {
    const departmentGroups = getEmployeesBySiteAndDepartment(selectedSite.id);
    const totalEmployees = employees.filter(e => e.site_id === selectedSite.id).length;

    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSite(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{selectedSite.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedSite.city}, {selectedSite.country}
                    {selectedSite.address && ` • ${selectedSite.address}`}
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              {totalEmployees} employé{totalEmployees > 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Departments */}
          {Object.keys(departmentGroups).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun employé assigné à ce site</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Assignez des employés à ce site depuis leur dossier individuel
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(departmentGroups).map(([deptKey, deptData]) => (
                <Card key={deptKey}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge variant="outline" className="text-base font-semibold px-3 py-1">
                          {getDepartmentLabel(deptKey)}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-normal">
                          ({(deptData.chef ? 1 : 0) + deptData.employees.length} personne{(deptData.chef ? 1 : 0) + deptData.employees.length > 1 ? 's' : ''})
                        </span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Department Head */}
                    {deptData.chef && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          Chef de département
                        </p>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <Avatar className="h-12 w-12 border-2 border-primary">
                            <AvatarImage src={getAvatarUrl(deptData.chef.avatar_url)} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {deptData.chef.first_name?.[0]}{deptData.chef.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{deptData.chef.first_name} {deptData.chef.last_name}</p>
                            <p className="text-sm text-muted-foreground">{deptData.chef.position || 'Chef de département'}</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Crown className="h-3 w-3 mr-1" />
                            Chef
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Employees */}
                    {deptData.employees.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Employés ({deptData.employees.length})
                        </p>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {deptData.employees.map(emp => (
                            <div 
                              key={emp.id} 
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={getAvatarUrl(emp.avatar_url)} />
                                <AvatarFallback className="text-sm">
                                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{emp.first_name} {emp.last_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{emp.position || 'Employé'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!deptData.chef && deptData.employees.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun employé dans ce département
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // View: List of all sites
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sites de travail</h1>
            <p className="text-muted-foreground">Cliquez sur un site pour voir ses employés par département</p>
          </div>
          {isAdmin() && (
            <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditSite(null); setSiteForm({ name: '', city: '', country: 'RDC', address: '' }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editSite ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSiteSubmit} className="space-y-4">
                  <div>
                    <Label>Nom du site *</Label>
                    <Input
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({...siteForm, name: e.target.value})}
                      placeholder="Ex: Siège Kinshasa"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ville *</Label>
                      <Input
                        value={siteForm.city}
                        onChange={(e) => setSiteForm({...siteForm, city: e.target.value})}
                        placeholder="Kinshasa"
                        required
                      />
                    </div>
                    <div>
                      <Label>Pays</Label>
                      <Select value={siteForm.country} onValueChange={(v) => setSiteForm({...siteForm, country: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={siteForm.address}
                      onChange={(e) => setSiteForm({...siteForm, address: e.target.value})}
                      placeholder="Adresse complète"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editSite ? 'Mettre à jour' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucun site configuré</p>
              <p className="text-sm text-muted-foreground">Créez votre premier site de travail</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map(site => {
              const siteEmployees = employees.filter(e => e.site_id === site.id);
              const deptCount = [...new Set(siteEmployees.map(e => e.department))].length;
              
              return (
                <Card 
                  key={site.id} 
                  className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/50"
                  onClick={() => setSelectedSite(site)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {site.name}
                          </CardTitle>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {site.city}, {site.country}
                          </div>
                        </div>
                      </div>
                      {isAdmin() && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEditSite(site, e)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {site.address && (
                      <p className="text-sm text-muted-foreground mb-3 truncate">{site.address}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium">{siteEmployees.length}</span>
                          <span className="text-muted-foreground">employé{siteEmployees.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          <span>{deptCount}</span>
                          <span className="text-muted-foreground">dép.</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Site Confirmation Dialog */}
        <Dialog open={deleteSiteDialog.open} onOpenChange={(open) => !open && setDeleteSiteDialog({ open: false, siteId: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Supprimer le site
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                Voulez-vous vraiment supprimer ce site ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteSiteDialog({ open: false, siteId: null })}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSite}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SitesManagement;
