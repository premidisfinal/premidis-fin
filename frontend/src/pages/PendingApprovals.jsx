import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  UserPlus, Check, X, Loader2, Mail, Building2, Shield, 
  Clock, AlertTriangle, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PendingApprovals = () => {
  const { user } = useAuth();
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/auth/pending-registrations`);
      setPendingRegistrations(response.data.pending_registrations || []);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    setProcessing(prev => ({ ...prev, [userId]: 'approving' }));
    try {
      await axios.post(`${API_URL}/api/auth/approve-registration/${userId}`);
      toast.success('Inscription approuvée avec succès');
      setPendingRegistrations(prev => prev.filter(r => r.id !== userId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'approbation');
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Raison du rejet (optionnel):');
    
    setProcessing(prev => ({ ...prev, [userId]: 'rejecting' }));
    try {
      await axios.post(`${API_URL}/api/auth/reject-registration/${userId}?reason=${encodeURIComponent(reason || '')}`);
      toast.success('Inscription rejetée');
      setPendingRegistrations(prev => prev.filter(r => r.id !== userId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du rejet');
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: null }));
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      secretary: 'Secrétaire',
      super_admin: 'Super Administrateur',
      employee: 'Employé'
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'destructive';
      case 'secretary':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              Demandes d'inscription en attente
            </h1>
            <p className="text-muted-foreground mt-1">
              Approuvez ou rejetez les demandes d'inscription pour les rôles sensibles
            </p>
          </div>
          <Button variant="outline" onClick={fetchPendingRegistrations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Les demandes d'inscription pour les rôles <strong>Administrateur</strong> et <strong>Secrétaire</strong> 
            nécessitent une approbation manuelle. Les employés sont activés automatiquement.
          </AlertDescription>
        </Alert>

        {/* Pending Registrations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Demandes en attente ({pendingRegistrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingRegistrations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucune demande d'inscription en attente</p>
                <p className="text-sm mt-2">Toutes les demandes ont été traitées</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={registration.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {registration.first_name?.[0]}{registration.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {registration.first_name} {registration.last_name}
                          </h3>
                          <Badge variant={getRoleBadgeVariant(registration.role)}>
                            <Shield className="h-3 w-3 mr-1" />
                            {getRoleLabel(registration.role)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {registration.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {registration.department || 'Non spécifié'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          Inscrit le {format(new Date(registration.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(registration.id)}
                        disabled={processing[registration.id]}
                        className="text-destructive hover:text-destructive"
                      >
                        {processing[registration.id] === 'rejecting' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Rejeter
                          </>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleApprove(registration.id)}
                        disabled={processing[registration.id]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing[registration.id] === 'approving' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Approuver
                          </>
                        )}
                      </Button>
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

export default PendingApprovals;
