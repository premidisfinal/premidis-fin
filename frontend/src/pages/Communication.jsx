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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Megaphone, Plus, Loader2, AlertTriangle, Info, Bell, Trash2, MessageCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LiveChat from '../components/LiveChat';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Communication = () => {
  const { user, isAdmin, canEdit } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/communication/announcements`);
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/communication/announcements`, formData);
      toast.success('Annonce publiée avec succès');
      setDialogOpen(false);
      setFormData({ title: '', content: '', priority: 'normal' });
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/communication/announcements/${id}`);
      toast.success('Annonce supprimée');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return { icon: AlertTriangle, color: 'destructive', label: 'Urgent', bg: 'bg-red-50 dark:bg-red-900/20 border-l-red-500' };
      case 'important':
        return { icon: Bell, color: 'warning', label: 'Important', bg: 'bg-orange-50 dark:bg-orange-900/20 border-l-orange-500' };
      default:
        return { icon: Info, color: 'secondary', label: 'Normal', bg: 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500' };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="communication-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
            <p className="text-muted-foreground">Annonces officielles de l'entreprise</p>
          </div>
          
          {canEdit() && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-announcement-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle annonce
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Publier une annonce</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      placeholder="Titre de l'annonce"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea
                      placeholder="Contenu de l'annonce..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={5}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publier
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total annonces</p>
                  <p className="text-2xl font-bold">{announcements.length}</p>
                </div>
                <Megaphone className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {announcements.filter(a => a.priority === 'urgent').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Importantes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {announcements.filter(a => a.priority === 'important').length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Annonces
            </CardTitle>
            <CardDescription>
              Toutes les communications officielles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune annonce</p>
                {canEdit() && (
                  <p className="text-sm mt-2">Cliquez sur "Nouvelle annonce" pour en créer une</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const config = getPriorityConfig(announcement.priority);
                  const IconComponent = config.icon;
                  
                  return (
                    <div
                      key={announcement.id}
                      className={`p-4 rounded-lg border-l-4 ${config.bg} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <IconComponent className={`h-5 w-5 mt-0.5 ${
                            announcement.priority === 'urgent' ? 'text-red-500' :
                            announcement.priority === 'important' ? 'text-orange-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{announcement.title}</h3>
                              <Badge variant={config.color}>{config.label}</Badge>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{announcement.content}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span>Par {announcement.author_name}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(announcement.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isAdmin() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Communication;
