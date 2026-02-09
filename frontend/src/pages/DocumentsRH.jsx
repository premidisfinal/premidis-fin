import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Settings,
  Lock,
  FileSignature,
  Stamp,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';

const DocumentsRH = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'leave',
    content: '',
    fields: []
  });
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    template_id: '',
    employee_id: '',
    beneficiary_name: '',
    beneficiary_matricule: '',
    document_type: '',
    period_start: '',
    period_end: '',
    reason: ''
  });
  
  // Signature settings state
  const [signatureSettings, setSignatureSettings] = useState({
    signature_image_url: '',
    stamp_image_url: ''
  });
  const [hasSignaturePassword, setHasSignaturePassword] = useState(false);
  const [signaturePasswordForm, setSignaturePasswordForm] = useState({
    password: '',
    confirm_password: ''
  });
  
  // Approval state
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
    if (isAdmin()) {
      fetchEmployees();
      checkSignaturePassword();
      fetchSignatureSettings();
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/hr-documents');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/hr-documents/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const checkSignaturePassword = async () => {
    try {
      const response = await axios.get('/api/hr-documents/signature-password/exists');
      setHasSignaturePassword(response.data.exists);
    } catch (error) {
      console.error('Error checking signature password:', error);
    }
  };

  const fetchSignatureSettings = async () => {
    try {
      const response = await axios.get('/api/hr-documents/signature-settings');
      if (response.data) {
        setSignatureSettings({
          signature_image_url: response.data.signature_image_url || '',
          stamp_image_url: response.data.stamp_image_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching signature settings:', error);
    }
  };

  // Template handlers
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/hr-documents/templates', newTemplate);
      toast.success('Modèle créé avec succès');
      setNewTemplate({ name: '', description: '', category: 'leave', content: '', fields: [] });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du modèle');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) return;
    
    try {
      await axios.delete(`/api/hr-documents/templates/${templateId}`);
      toast.success('Modèle supprimé');
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  // Document handlers
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/hr-documents', documentForm);
      toast.success('Document créé et envoyé pour approbation');
      setDocumentForm({
        template_id: '',
        employee_id: '',
        beneficiary_name: '',
        beneficiary_matricule: '',
        document_type: '',
        period_start: '',
        period_end: '',
        reason: ''
      });
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du document');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDocument = async (document, action) => {
    setSelectedDocument(document);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const submitApproval = async () => {
    if (!approvalPassword) {
      toast.error('Veuillez saisir votre mot de passe de signature');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/hr-documents/approve', {
        document_id: selectedDocument.id,
        action: approvalAction,
        signature_password: approvalPassword,
        comment: approvalComment
      });
      toast.success(approvalAction === 'approve' ? 'Document approuvé avec succès' : 'Document rejeté');
      setShowApprovalDialog(false);
      setApprovalPassword('');
      setApprovalComment('');
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
    }
  };

  // Signature settings handlers
  const handleUploadSignature = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadResponse = await axios.post('/api/upload/file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const newSettings = {
          ...signatureSettings,
          [type === 'signature' ? 'signature_image_url' : 'stamp_image_url']: uploadResponse.data.url
        };

        await axios.post('/api/hr-documents/signature-settings', newSettings);
        setSignatureSettings(newSettings);
        toast.success(type === 'signature' ? 'Signature uploadée' : 'Cachet uploadé');
      } catch (error) {
        toast.error('Erreur lors de l\'upload');
      }
    };
    input.click();
  };

  const handleCreateSignaturePassword = async (e) => {
    e.preventDefault();
    if (signaturePasswordForm.password !== signaturePasswordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await axios.post('/api/hr-documents/signature-password', signaturePasswordForm);
      toast.success('Mot de passe de signature créé avec succès');
      setSignaturePasswordForm({ password: '', confirm_password: '' });
      setHasSignaturePassword(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du mot de passe');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_approval: { label: 'En attente', variant: 'warning', icon: Clock },
      approved: { label: 'Approuvé', variant: 'success', icon: CheckCircle },
      rejected: { label: 'Rejeté', variant: 'destructive', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesSearch = doc.beneficiary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          📄 Documents RH
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestion et validation des documents officiels RH
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          {isAdmin() && (
            <>
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Créer Document
              </TabsTrigger>
              <TabsTrigger value="templates">
                <FileSignature className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Signature
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Documents List */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Documents</CardTitle>
              <CardDescription>
                {isAdmin() ? 'Tous les documents' : 'Vos documents'}
              </CardDescription>
              
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending_approval">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDocuments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun document trouvé</p>
                ) : (
                  filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{doc.beneficiary_name}</h3>
                              {getStatusBadge(doc.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <p><span className="font-medium">Type:</span> {doc.document_type}</p>
                              <p><span className="font-medium">Matricule:</span> {doc.beneficiary_matricule}</p>
                              <p><span className="font-medium">Période:</span> {doc.period_start} - {doc.period_end}</p>
                              <p><span className="font-medium">Créé le:</span> {new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                            {doc.reason && (
                              <p className="mt-2 text-sm"><span className="font-medium">Motif:</span> {doc.reason}</p>
                            )}
                            {doc.approved_by_name && (
                              <p className="mt-2 text-sm text-green-600">
                                <span className="font-medium">Approuvé par:</span> {doc.approved_by_name} le {new Date(doc.approved_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Aperçu du Document</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                  <div
                                    className="prose max-w-none p-6 bg-white rounded border"
                                    dangerouslySetInnerHTML={{ __html: doc.content }}
                                  />
                                  {doc.status === 'approved' && (doc.signature_image_url || doc.stamp_image_url) && (
                                    <div className="mt-6 pt-6 border-t flex justify-end gap-8">
                                      {doc.signature_image_url && (
                                        <div className="text-center">
                                          <img src={doc.signature_image_url} alt="Signature" className="h-20" />
                                          <p className="text-xs text-muted-foreground mt-1">Signature</p>
                                        </div>
                                      )}
                                      {doc.stamp_image_url && (
                                        <div className="text-center">
                                          <img src={doc.stamp_image_url} alt="Cachet" className="h-20" />
                                          <p className="text-xs text-muted-foreground mt-1">Cachet</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {isAdmin() && doc.status === 'pending_approval' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApproveDocument(doc, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApproveDocument(doc, 'reject')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Document */}
        {isAdmin() && (
          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Zone 1 - Création de Document</CardTitle>
                <CardDescription>Remplir les données de base (sans signature)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDocument} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template">Modèle de Document *</Label>
                      <Select
                        value={documentForm.template_id}
                        onValueChange={(value) => setDocumentForm({ ...documentForm, template_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un modèle" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employee">Employé concerné *</Label>
                      <Select
                        value={documentForm.employee_id}
                        onValueChange={(value) => {
                          const emp = employees.find(e => e.id === value);
                          setDocumentForm({
                            ...documentForm,
                            employee_id: value,
                            beneficiary_name: emp ? `${emp.first_name} ${emp.last_name}` : ''
                          });
                        }}
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
                      <Label htmlFor="beneficiary_name">Nom du bénéficiaire *</Label>
                      <Input
                        id="beneficiary_name"
                        value={documentForm.beneficiary_name}
                        onChange={(e) => setDocumentForm({ ...documentForm, beneficiary_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="beneficiary_matricule">Matricule / ID *</Label>
                      <Input
                        id="beneficiary_matricule"
                        value={documentForm.beneficiary_matricule}
                        onChange={(e) => setDocumentForm({ ...documentForm, beneficiary_matricule: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document_type">Type de Document *</Label>
                      <Input
                        id="document_type"
                        placeholder="Congé, Avertissement, etc."
                        value={documentForm.document_type}
                        onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date de création</Label>
                      <Input value={new Date().toLocaleDateString()} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period_start">Période début</Label>
                      <Input
                        id="period_start"
                        type="date"
                        value={documentForm.period_start}
                        onChange={(e) => setDocumentForm({ ...documentForm, period_start: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period_end">Période fin</Label>
                      <Input
                        id="period_end"
                        type="date"
                        value={documentForm.period_end}
                        onChange={(e) => setDocumentForm({ ...documentForm, period_end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Motif / Description *</Label>
                    <Textarea
                      id="reason"
                      value={documentForm.reason}
                      onChange={(e) => setDocumentForm({ ...documentForm, reason: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer le Document
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Templates Management */}
        {isAdmin() && (
          <TabsContent value="templates" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Créer un Nouveau Modèle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="template_name">Nom du Modèle *</Label>
                        <Input
                          id="template_name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Catégorie *</Label>
                        <Select
                          value={newTemplate.category}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leave">Congé</SelectItem>
                            <SelectItem value="behavior">Comportement</SelectItem>
                            <SelectItem value="training">Formation</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenu du Modèle *</Label>
                      <Textarea
                        id="content"
                        value={newTemplate.content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                        rows={8}
                        placeholder="Utilisez {{beneficiary_name}}, {{document_type}}, {{reason}}, etc."
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables disponibles: {'{{beneficiary_name}}'}, {'{{beneficiary_matricule}}'}, 
                        {'{{document_type}}'}, {'{{period_start}}'}, {'{{period_end}}'}, {'{{reason}}'}, 
                        {'{{current_date}}'}, etc.
                      </p>
                    </div>

                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le Modèle
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Modèles Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Card key={template.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{template.name}</h3>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                              <Badge variant="outline" className="mt-2">{template.category}</Badge>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Signature Settings */}
        {isAdmin() && (
          <TabsContent value="settings" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Zone 2 - Signature & Cachet</CardTitle>
                  <CardDescription>Configuration pour l'approbation des documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>Photo de Signature</Label>
                      {signatureSettings.signature_image_url ? (
                        <div className="border rounded p-4 text-center">
                          <img
                            src={signatureSettings.signature_image_url}
                            alt="Signature"
                            className="max-h-32 mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded p-8 text-center text-muted-foreground">
                          Aucune signature
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleUploadSignature('signature')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Uploader Signature
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Label>Cachet Officiel</Label>
                      {signatureSettings.stamp_image_url ? (
                        <div className="border rounded p-4 text-center">
                          <img
                            src={signatureSettings.stamp_image_url}
                            alt="Cachet"
                            className="max-h-32 mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded p-8 text-center text-muted-foreground">
                          Aucun cachet
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleUploadSignature('stamp')}
                      >
                        <Stamp className="h-4 w-4 mr-2" />
                        Uploader Cachet
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mot de Passe de Signature</CardTitle>
                  <CardDescription>
                    {hasSignaturePassword
                      ? 'Votre mot de passe de signature est configuré'
                      : 'Créez un mot de passe pour valider vos approbations'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasSignaturePassword ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Mot de passe de signature configuré</span>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateSignaturePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de Passe *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={signaturePasswordForm.password}
                          onChange={(e) => setSignaturePasswordForm({
                            ...signaturePasswordForm,
                            password: e.target.value
                          })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirmer le Mot de Passe *</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={signaturePasswordForm.confirm_password}
                          onChange={(e) => setSignaturePasswordForm({
                            ...signaturePasswordForm,
                            confirm_password: e.target.value
                          })}
                          required
                        />
                      </div>

                      <Button type="submit">
                        <Lock className="h-4 w-4 mr-2" />
                        Créer le Mot de Passe
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approuver le Document' : 'Rejeter le Document'}
            </DialogTitle>
            <DialogDescription>
              Veuillez saisir votre mot de passe de signature pour confirmer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval_password">Mot de Passe de Signature *</Label>
              <Input
                id="approval_password"
                type="password"
                value={approvalPassword}
                onChange={(e) => setApprovalPassword(e.target.value)}
                placeholder="Saisissez votre mot de passe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval_comment">Commentaire (optionnel)</Label>
              <Textarea
                id="approval_comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                placeholder="Ajouter un commentaire..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={submitApproval}
              disabled={loading}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {approvalAction === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsRH;
