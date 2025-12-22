import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Shield, Users, UserCheck, Settings, Save, Loader2, 
  Megaphone, Calendar, DollarSign, Eye, Edit, Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default permissions by role
const defaultPermissions = {
  admin: {
    can_manage_employees: true,
    can_approve_leaves: true,
    can_post_announcements: true,
    can_post_behavior: true,
    can_view_salaries: true,
    can_edit_salaries: true,
    can_delete_employees: true,
    can_manage_permissions: true
  },
  secretary: {
    can_manage_employees: true,
    can_approve_leaves: true,
    can_post_announcements: true,
    can_post_behavior: false,
    can_view_salaries: false,
    can_edit_salaries: false,
    can_delete_employees: false,
    can_manage_permissions: false
  },
  employee: {
    can_manage_employees: false,
    can_approve_leaves: false,
    can_post_announcements: false,
    can_post_behavior: false,
    can_view_salaries: false,
    can_edit_salaries: false,
    can_delete_employees: false,
    can_manage_permissions: false
  }
};

const permissionLabels = {
  can_manage_employees: { label: 'Gérer les employés', icon: Users, description: 'Créer, modifier les dossiers employés' },
  can_approve_leaves: { label: 'Approuver les congés', icon: Calendar, description: 'Approuver/rejeter les demandes de congé' },
  can_post_announcements: { label: 'Publier des annonces', icon: Megaphone, description: 'Créer des annonces officielles' },
  can_post_behavior: { label: 'Noter le comportement', icon: UserCheck, description: 'Ajouter des notes de comportement' },
  can_view_salaries: { label: 'Voir les salaires', icon: Eye, description: 'Voir les salaires des employés' },
  can_edit_salaries: { label: 'Modifier les salaires', icon: DollarSign, description: 'Modifier les salaires' },
  can_delete_employees: { label: 'Supprimer des employés', icon: Trash2, description: 'Supprimer définitivement des employés' },
  can_manage_permissions: { label: 'Gérer les permissions', icon: Shield, description: 'Modifier les permissions des rôles' }
};

const PermissionsManagement = () => {
  const { isAdmin } = useAuth();
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState('secretary');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/config/permissions`);
      if (response.data.permissions) {
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (role, permission) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/config/permissions`, { permissions });
      toast.success('Permissions mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions(defaultPermissions);
    toast.info('Permissions réinitialisées (non sauvegardées)');
  };

  if (!isAdmin()) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Accès refusé</h2>
            <p className="text-muted-foreground">Seuls les administrateurs peuvent gérer les permissions</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="permissions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Gestion des Permissions
            </h1>
            <p className="text-muted-foreground">Définissez ce que chaque rôle peut faire dans l'application</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Réinitialiser
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Role Tabs */}
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="secretary" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Secrétaire
            </TabsTrigger>
            <TabsTrigger value="employee" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employé
            </TabsTrigger>
          </TabsList>

          {['admin', 'secretary', 'employee'].map((role) => (
            <TabsContent key={role} value={role} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {role === 'admin' && <Badge className="bg-red-500">Administrateur</Badge>}
                    {role === 'secretary' && <Badge className="bg-blue-500">Secrétaire</Badge>}
                    {role === 'employee' && <Badge className="bg-green-500">Employé</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {role === 'admin' && 'Accès complet au système (certaines permissions ne peuvent être désactivées)'}
                    {role === 'secretary' && 'Permissions pour la gestion quotidienne RH'}
                    {role === 'employee' && 'Accès limité à son propre profil et données'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(permissionLabels).map(([key, config]) => {
                      const IconComponent = config.icon;
                      const isDisabled = role === 'admin' && ['can_manage_permissions', 'can_delete_employees'].includes(key);
                      
                      return (
                        <div 
                          key={key} 
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            permissions[role]?.[key] ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${permissions[role]?.[key] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{config.label}</p>
                              <p className="text-sm text-muted-foreground">{config.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={permissions[role]?.[key] || false}
                            onCheckedChange={() => handleToggle(role, key)}
                            disabled={isDisabled}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Important</h3>
                <p className="text-sm text-muted-foreground">
                  Les modifications de permissions prennent effet immédiatement après l'enregistrement. 
                  Les utilisateurs devront peut-être se reconnecter pour voir les changements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PermissionsManagement;
