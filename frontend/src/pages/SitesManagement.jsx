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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Building2, MapPin, Plus, Edit, Trash2, Users, UserCog, 
  Loader2, Search, Globe, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SitesManagement = () => {
  const { isAdmin } = useAuth();
  const [sites, setSites] = useState([]);
  const [groups, setGroups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sites');
  
  // Site dialog
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [siteForm, setSiteForm] = useState({
    name: '',
    city: '',
    country: 'RDC',
    address: ''
  });
  
  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    site_id: '',
    department: '',
    manager_id: '',
    member_ids: []
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
    { value: 'technicien', label: 'Technicien' }
  ];

  const countries = ['RDC', 'Congo', 'Rwanda', 'Burundi', 'Uganda', 'Kenya'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sitesRes, groupsRes, employeesRes] = await Promise.all([
        axios.get(`${API_URL}/api/sites`),
        axios.get(`${API_URL}/api/sites/groups`),
        axios.get(`${API_URL}/api/employees`)
      ]);
      setSites(sitesRes.data.sites || []);
      setGroups(groupsRes.data.groups || []);
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

  const handleDeleteSite = async (siteId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce site ?')) return;
    try {
      await axios.delete(`${API_URL}/api/sites/${siteId}`);
      toast.success('Site supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Group CRUD
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editGroup) {
        await axios.put(`${API_URL}/api/sites/groups/${editGroup.id}`, groupForm);
        toast.success('Groupe mis à jour');
      } else {
        await axios.post(`${API_URL}/api/sites/groups`, groupForm);
        toast.success('Groupe créé');
      }
      setGroupDialogOpen(false);
      setEditGroup(null);
      setGroupForm({ name: '', site_id: '', department: '', manager_id: '', member_ids: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce groupe ?')) return;
    try {
      await axios.delete(`${API_URL}/api/sites/groups/${groupId}`);
      toast.success('Groupe supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditSite = (site) => {
    setEditSite(site);
    setSiteForm({
      name: site.name,
      city: site.city,
      country: site.country,
      address: site.address || ''
    });
    setSiteDialogOpen(true);
  };

  const openEditGroup = (group) => {
    setEditGroup(group);
    setGroupForm({
      name: group.name,
      site_id: group.site_id,
      department: group.department,
      manager_id: group.manager_id || '',
      member_ids: group.member_ids || []
    });
    setGroupDialogOpen(true);
  };

  const toggleMember = (employeeId) => {
    setGroupForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(employeeId)
        ? prev.member_ids.filter(id => id !== employeeId)
        : [...prev.member_ids, employeeId]
    }));
  };

  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `${API_URL}${avatarUrl.startsWith('/api/') ? '' : '/api'}${avatarUrl}`;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sites de travail</h1>
            <p className="text-muted-foreground">Gestion des sites et des groupes hiérarchiques</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sites" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sites ({sites.length})
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Groupes hiérarchiques ({groups.length})
            </TabsTrigger>
          </TabsList>

          {/* Sites Tab */}
          <TabsContent value="sites" className="mt-6">
            <div className="flex justify-end mb-4">
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
                  const siteGroups = groups.filter(g => g.site_id === site.id);
                  const siteEmployees = employees.filter(e => e.site_id === site.id);
                  return (
                    <Card key={site.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{site.name}</CardTitle>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {site.city}, {site.country}
                              </div>
                            </div>
                          </div>
                          {isAdmin() && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditSite(site)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSite(site.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {site.address && (
                          <p className="text-sm text-muted-foreground mb-3">{site.address}</p>
                        )}
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{siteEmployees.length} employés</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <span>{siteGroups.length} groupes</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="mt-6">
            <div className="flex justify-end mb-4">
              {isAdmin() && (
                <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditGroup(null); setGroupForm({ name: '', site_id: '', department: '', manager_id: '', member_ids: [] }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau groupe
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editGroup ? 'Modifier le groupe' : 'Nouveau groupe hiérarchique'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleGroupSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nom du groupe *</Label>
                          <Input
                            value={groupForm.name}
                            onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                            placeholder="Ex: Équipe Marketing Kinshasa"
                            required
                          />
                        </div>
                        <div>
                          <Label>Site *</Label>
                          <Select 
                            value={groupForm.site_id} 
                            onValueChange={(v) => setGroupForm({...groupForm, site_id: v})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un site" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map(site => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.name} - {site.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Département *</Label>
                        <Select 
                          value={groupForm.department} 
                          onValueChange={(v) => setGroupForm({...groupForm, department: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un département" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Chef de département</Label>
                        <Select 
                          value={groupForm.manager_id} 
                          onValueChange={(v) => setGroupForm({...groupForm, manager_id: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un responsable" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Aucun</SelectItem>
                            {employees.filter(e => e.role !== 'employee').map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name} ({emp.position || emp.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Membres du groupe</Label>
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                          {employees.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun employé disponible</p>
                          ) : (
                            employees.map(emp => (
                              <div 
                                key={emp.id}
                                className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                                  groupForm.member_ids.includes(emp.id) ? 'bg-primary/10' : ''
                                }`}
                                onClick={() => toggleMember(emp.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={groupForm.member_ids.includes(emp.id)}
                                  onChange={() => {}}
                                  className="h-4 w-4"
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={getAvatarUrl(emp.avatar_url)} />
                                  <AvatarFallback className="text-xs">
                                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {emp.first_name} {emp.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {emp.position || emp.department}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {groupForm.member_ids.length} membre(s) sélectionné(s)
                        </p>
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={submitting || !groupForm.site_id || !groupForm.department}>
                          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {editGroup ? 'Mettre à jour' : 'Créer'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {groups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun groupe hiérarchique</p>
                  <p className="text-sm text-muted-foreground">Créez des groupes pour organiser vos équipes par site</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sites.map(site => {
                  const siteGroups = groups.filter(g => g.site_id === site.id);
                  if (siteGroups.length === 0) return null;
                  
                  return (
                    <div key={site.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">{site.name}</h3>
                        <Badge variant="secondary">{site.city}</Badge>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2 pl-6">
                        {siteGroups.map(group => (
                          <Card key={group.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{group.name}</CardTitle>
                                  <Badge variant="outline" className="mt-1 capitalize">
                                    {departments.find(d => d.value === group.department)?.label || group.department}
                                  </Badge>
                                </div>
                                {isAdmin() && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditGroup(group)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              {/* Manager */}
                              {group.manager && (
                                <div className="mb-3">
                                  <p className="text-xs text-muted-foreground mb-1">Chef de département</p>
                                  <div className="flex items-center gap-2 p-2 rounded bg-primary/5">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={getAvatarUrl(group.manager.avatar_url)} />
                                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                        {group.manager.first_name?.[0]}{group.manager.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {group.manager.first_name} {group.manager.last_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{group.manager.position}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Members */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Membres ({group.members?.length || 0})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {group.members?.slice(0, 5).map(member => (
                                    <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                                      <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                                      <AvatarFallback className="text-xs">
                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {(group.members?.length || 0) > 5 && (
                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs">
                                      +{group.members.length - 5}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SitesManagement;
