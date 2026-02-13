import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import BehaviorCard from '../components/BehaviorCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { 
  Plus, Clock, User, Search, Filter, Loader2, Download,
  Upload, FileText, AlertTriangle, Award, MessageCircle, File, X, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import axios from '../config/api';
import { toast } from 'sonner';

// Types de comportement étendus
const BEHAVIOR_TYPES = [
  { value: 'sanction', label: 'Sanction', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  { value: 'warning', label: 'Avertissement', icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
  { value: 'dismissal', label: 'Lettre de renvoi', icon: FileText, color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-600' },
  { value: 'note', label: 'Note disciplinaire', icon: MessageCircle, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
  { value: 'praise', label: 'Félicitations', icon: Award, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
  { value: 'other', label: 'Autre', icon: File, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-500' }
];

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [behaviorToDelete, setBehaviorToDelete] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'sanction',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    file_name: '',
    file_url: ''
  });
  
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const getDocUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // Construire l'URL correcte pour les fichiers uploadés
    return `${axios.defaults.baseURL}${url.startsWith('/') ? url : '/' + url}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const behaviorRes = await axios.get('/api/behavior');
      setBehaviors(behaviorRes.data.behaviors || []);

      if (isAdmin()) {
        const empRes = await axios.get('/api/employees');
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
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting behavior note with data:', formData);
      await axios.post('/api/behavior', formData);
      toast.success('Note de comportement ajoutée avec succès');
      setDialogOpen(false);
      setFormData({ 
        employee_id: '', 
        type: 'sanction', 
        note: '', 
        date: format(new Date(), 'yyyy-MM-dd'),
        file_name: '',
        file_url: ''
      });
      fetchData();
    } catch (error) {
      console.error('Behavior creation error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.detail || error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validation du type de fichier côté client
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(`Type de fichier non supporté: ${fileExtension}. Utilisez PDF, JPEG, PNG, DOC ou DOCX.`);
      e.target.value = ''; // Reset input
      return;
    }
    
    // Vérification de la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Le fichier est trop volumineux (max 10 MB)');
      e.target.value = '';
      return;
    }
    
    setUploadingDoc(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      console.log('Starting file upload:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Ne pas spécifier Content-Type, axios le fait automatiquement avec boundary
      const response = await axios.post('/api/upload/file', formDataUpload);
      
      console.log('Upload successful:', response.data);
      
      setFormData(prev => ({
        ...prev,
        file_name: file.name,
        file_url: response.data.url
      }));
      toast.success(`Document "${file.name}" ajouté avec succès`);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'upload du document';
      toast.error(errorMessage);
      
      // Reset input en cas d'erreur
      e.target.value = '';
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = () => {
    setFormData(prev => ({
      ...prev,
      file_name: '',
      file_url: ''
    }));
  };

  const handleDelete = async () => {
    if (!behaviorToDelete) return;
    
    try {
      await axios.delete(`/api/behavior/${behaviorToDelete.id}`);
      toast.success('Note de comportement supprimée');
      setDeleteDialogOpen(false);
      setBehaviorToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleExport = () => {
    const csv = [
      'Date,Employé,Type,Note,Document',
      ...behaviors.map(b => 
        `${b.date},"${b.employee_name}",${b.type},"${b.note.replace(/"/g, '""')}",${b.file_name || 'N/A'}`
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
    sanctions: behaviors.filter(b => ['sanction', 'warning', 'dismissal', 'note'].includes(b.type)).length,
    praise: behaviors.filter(b => b.type === 'praise').length,
    withDocs: behaviors.filter(b => b.file_url || (b.document_urls && b.document_urls.length > 0)).length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="behavior-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dossier Comportement</h1>
            <p className="text-muted-foreground">
              {isAdmin() ? 'Gestion professionnelle des notes disciplinaires et documents RH' : 'Votre dossier comportement'}
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nouvelle note de comportement</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employé *</Label>
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
                              {emp.first_name} {emp.last_name} - {emp.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type de note *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BEHAVIOR_TYPES.map(type => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${type.color}`} />
                                  {type.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description / Motif *</Label>
                      <Textarea
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Décrivez la cause, le contexte et les faits observés..."
                        rows={5}
                        required
                      />
                    </div>

                    {/* Document upload section */}
                    <div className="space-y-2">
                      <Label>Document officiel</Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        {formData.file_url ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{formData.file_name}</p>
                                  <p className="text-xs text-muted-foreground">Document ajouté</p>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <a href={getDocUrl(formData.file_url)} target="_blank" rel="noopener noreferrer">
                                  <Button type="button" variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </a>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={removeDocument}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/jpg,image/png,.doc,.docx"
                              onChange={handleDocUpload}
                              className="hidden"
                            />
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                              {uploadingDoc ? (
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                              ) : (
                                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                              )}
                              <p className="text-sm font-medium mb-1">
                                {uploadingDoc ? 'Upload en cours...' : 'Cliquez pour uploader un document'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PDF, Images, Word (Max 10 MB)
                              </p>
                            </div>
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lettre de sanction, avertissement, justificatif, etc.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting || uploadingDoc}
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {uploadingDoc ? 'Upload du document en cours...' : 'Enregistrer la note'}
                    </Button>
                    {uploadingDoc && (
                      <p className="text-xs text-amber-600 text-center">
                        ⏳ Veuillez patienter pendant l'upload du document
                      </p>
                    )}
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Clock className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sanctions/Avertissements</p>
                  <p className="text-2xl font-bold text-red-600">{stats.sanctions}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Félicitations</p>
                  <p className="text-2xl font-bold text-green-600">{stats.praise}</p>
                </div>
                <Award className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avec documents</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.withDocs}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500/50" />
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
              <SelectTrigger className="w-[220px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {BEHAVIOR_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Behavior List - Card Style like Documents Module */}
        <Card>
          <CardHeader>
            <CardTitle>Historique Comportement</CardTitle>
            <CardDescription>
              Dossier RH professionnel avec documents associés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBehaviors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Aucune note de comportement</p>
                <p className="text-sm">Le dossier comportement est vide</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBehaviors.map((behavior) => (
                  <BehaviorCard
                    key={behavior.id}
                    behavior={behavior}
                    showEmployeeName={true}
                    canDelete={isAdmin()}
                    onDelete={(beh) => {
                      setBehaviorToDelete(beh);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette note de comportement pour{' '}
              <span className="font-semibold">{behaviorToDelete?.employee_name}</span> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBehaviorToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Behavior;
