import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Home,
  Settings,
  Lock,
  FileSignature,
  Stamp,
  Search,
  ArrowLeft,
  Edit,
  ChevronRight,
  File,
  Users
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'leave',
    content: '',
    source_module: '',
    manual_data_source: '',
    file_url: ''
  });
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Workflow multi-étapes state
  const [createStep, setCreateStep] = useState(1); // 1: Select Template, 2: Select Employee, 3: Fill Form
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    template_id: '',
    employee_id: '',
    beneficiary_name: '',
    beneficiary_matricule: '',
    document_type: '',
    period_start: '',
    period_end: '',
    reason: '',
    manual_data_source: ''
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
  const [updatePasswordForm, setUpdatePasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    user_id: '',
    new_password: '',
    confirm_password: ''
  });
  const [showUpdatePasswordDialog, setShowUpdatePasswordDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  
  // Approval state
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

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
      setNewTemplate({ 
        name: '', 
        description: '', 
        category: 'leave', 
        content: '', 
        source_module: '',
        manual_data_source: '',
        file_url: ''
      });
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

  const handleUploadTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResponse = await axios.post('/api/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewTemplate({ ...newTemplate, file_url: uploadResponse.data.url });
      toast.success('Fichier uploadé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    }
  };

  // Workflow Step 1: Select Template
  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setCreateStep(2);
  };

  // Workflow Step 2: Select Employee & Fetch Data
  const handleSelectEmployee = async (empId) => {
    setLoading(true);
    try {
      const emp = employees.find(e => e.id === empId);
      setSelectedEmployee(emp);
      
      // Fetch employee data from source module
      if (selectedTemplate.source_module) {
        const response = await axios.get(
          `/api/hr-documents/employee-data/${empId}?source_module=${selectedTemplate.source_module}`
        );
        setEmployeeData(response.data);
        
        // Pre-fill form with employee data
        setDocumentForm({
          template_id: selectedTemplate.id,
          employee_id: empId,
          beneficiary_name: response.data.employee.name,
          beneficiary_matricule: response.data.employee.matricule,
          document_type: selectedTemplate.category,
          period_start: '',
          period_end: '',
          reason: '',
          manual_data_source: selectedTemplate.manual_data_source || ''
        });
      }
      
      setCreateStep(3);
    } catch (error) {
      toast.error('Erreur lors de la récupération des données employé');
    } finally {
      setLoading(false);
    }
  };

  // Workflow Step 3: Create Document
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/hr-documents', {
        ...documentForm,
        source_module: selectedTemplate.source_module
      });
      toast.success('Document créé et envoyé pour approbation');
      
      // Reset workflow
      setCreateStep(1);
      setSelectedTemplate(null);
      setSelectedEmployee(null);
      setEmployeeData(null);
      setDocumentForm({
        template_id: '',
        employee_id: '',
        beneficiary_name: '',
        beneficiary_matricule: '',
        document_type: '',
        period_start: '',
        period_end: '',
        reason: '',
        manual_data_source: ''
      });
      
      fetchDocuments();
      setActiveTab('documents');
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

  const handleUpdateSignaturePassword = async (e) => {
    e.preventDefault();
    if (updatePasswordForm.new_password !== updatePasswordForm.confirm_password) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    try {
      await axios.put('/api/hr-documents/signature-password/update', updatePasswordForm);
      toast.success('Mot de passe de signature modifié avec succès');
      setUpdatePasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setShowUpdatePasswordDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification du mot de passe');
    }
  };

  const handleResetSignaturePassword = async (e) => {
    e.preventDefault();
    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await axios.post('/api/hr-documents/signature-password/reset', resetPasswordForm);
      toast.success('Mot de passe réinitialisé avec succès');
      setResetPasswordForm({ user_id: '', new_password: '', confirm_password: '' });
      setShowResetPasswordDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_approval: { label: 'En attente', variant: 'warning', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approuvé', variant: 'success', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeté', variant: 'destructive', icon: XCircle, color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
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

  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearchTerm.toLowerCase();
    return emp.first_name?.toLowerCase().includes(searchLower) ||
           emp.last_name?.toLowerCase().includes(searchLower) ||
           emp.email?.toLowerCase().includes(searchLower);
  });

  // Document counts by status
  const documentCounts = {
    all: documents.length,
    pending_approval: documents.filter(d => d.status === 'pending_approval').length,
    approved: documents.filter(d => d.status === 'approved').length,
    rejected: documents.filter(d => d.status === 'rejected').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au Tableau de Bord
            </Button>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            📄 Documents RH
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion et validation des documents officiels RH
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
            {documentCounts.all > 0 && (
              <Badge variant="secondary" className="ml-2">{documentCounts.all}</Badge>
            )}
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
              <CardTitle>Historique des Documents</CardTitle>
              <CardDescription>
                Tous vos documents classés par statut
              </CardDescription>
              
              {/* Status Filter Pills */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Tous
                  <Badge variant="secondary">{documentCounts.all}</Badge>
                </Button>
                <Button
                  variant={statusFilter === 'pending_approval' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending_approval')}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  En attente
                  <Badge variant="secondary">{documentCounts.pending_approval}</Badge>
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approuvés
                  <Badge variant="secondary">{documentCounts.approved}</Badge>
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('rejected')}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Rejetés
                  <Badge variant="secondary">{documentCounts.rejected}</Badge>
                </Button>
              </div>
              
              <div className="mt-4">
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun document trouvé</p>
                  </div>
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
                              {doc.period_start && (
                                <p><span className="font-medium">Période:</span> {doc.period_start} - {doc.period_end}</p>
                              )}
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
                                  className="bg-green-600 hover:bg-green-700"
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

        {/* Create Document - Multi-Step Workflow */}
        {isAdmin() && (
          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Créer un Document</CardTitle>
                    <CardDescription>
                      Workflow en 3 étapes : Template → Employé → Formulaire
                    </CardDescription>
                  </div>
                  {createStep > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (createStep === 2) {
                          setCreateStep(1);
                          setSelectedTemplate(null);
                        } else if (createStep === 3) {
                          setCreateStep(2);
                          setSelectedEmployee(null);
                          setEmployeeData(null);
                        }
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                  )}
                </div>
                
                {/* Progress indicator */}
                <div className="flex items-center gap-2 mt-4">
                  <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${createStep >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                      1
                    </div>
                    <span className="text-sm font-medium">Template</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${createStep >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                      2
                    </div>
                    <span className="text-sm font-medium">Employé</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <div className={`flex items-center gap-2 ${createStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${createStep >= 3 ? 'bg-primary text-white' : 'bg-muted'}`}>
                      3
                    </div>
                    <span className="text-sm font-medium">Formulaire</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Step 1: Select Template */}
                {createStep === 1 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Sélectionnez un Template</h3>
                    {templates.length === 0 ? (
                      <div className="text-center py-12">
                        <File className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Aucun template disponible</p>
                        <Button onClick={() => setActiveTab('templates')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un Template
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                          <Card
                            key={template.id}
                            className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-1">{template.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {template.description || 'Aucune description'}
                                  </p>
                                  <div className="flex gap-2">
                                    <Badge variant="outline">{template.category}</Badge>
                                    {template.source_module && (
                                      <Badge variant="secondary">{template.source_module}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button className="w-full mt-4" size="sm">
                                Sélectionner
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Employee */}
                {createStep === 2 && selectedTemplate && (
                  <div>
                    <div className="mb-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Template sélectionné:</p>
                      <p className="font-semibold">{selectedTemplate.name}</p>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-4">Sélectionnez un Employé</h3>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par nom, email..."
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {filteredEmployees.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Aucun employé trouvé</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                        {filteredEmployees.map((emp) => (
                          <Card
                            key={emp.id}
                            className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => handleSelectEmployee(emp.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-lg font-bold text-primary">
                                    {emp.first_name[0]}{emp.last_name[0]}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">{emp.first_name} {emp.last_name}</h4>
                                  <p className="text-sm text-muted-foreground">{emp.email}</p>
                                  <p className="text-xs text-muted-foreground">{emp.department}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Fill Form with Auto-filled Data */}
                {createStep === 3 && selectedEmployee && (
                  <div>
                    <div className="mb-4 p-4 bg-muted rounded-lg space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Template:</p>
                        <p className="font-semibold">{selectedTemplate.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Employé:</p>
                        <p className="font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                      </div>
                    </div>

                    {employeeData && employeeData.module_data && Object.keys(employeeData.module_data).length > 0 && (
                      <Card className="mb-4 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-sm">Données Récupérées Automatiquement</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Source:</span> Module {selectedTemplate.source_module}</p>
                            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(employeeData.module_data, null, 2)}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <form onSubmit={handleCreateDocument} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="manual_data_source">Provenance des données (Information manuelle)</Label>
                        <Textarea
                          id="manual_data_source"
                          value={documentForm.manual_data_source}
                          onChange={(e) => setDocumentForm({ ...documentForm, manual_data_source: e.target.value })}
                          rows={2}
                          placeholder="Indiquez la source ou provenance des informations utilisées..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer le Document
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
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
                  <CardTitle>➕ Créer Template Customisé</CardTitle>
                  <CardDescription>Uploadez un fichier template ou créez-en un nouveau</CardDescription>
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
                            <SelectItem value="payroll">Paie</SelectItem>
                            <SelectItem value="discipline">Discipline</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="source_module">Module Source (Liaison) *</Label>
                        <Select
                          value={newTemplate.source_module}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, source_module: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un module" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leaves">Module Congés</SelectItem>
                            <SelectItem value="behaviors">Module Comportement</SelectItem>
                            <SelectItem value="payroll">Module Paie</SelectItem>
                            <SelectItem value="employees">Module Employés</SelectItem>
                            <SelectItem value="discipline">Module Discipline</SelectItem>
                            <SelectItem value="attendance">Module Présence</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template_file">Upload Template (.docx, .pdf)</Label>
                        <Input
                          id="template_file"
                          type="file"
                          accept=".docx,.pdf,.doc"
                          onChange={handleUploadTemplate}
                        />
                        {newTemplate.file_url && (
                          <p className="text-xs text-green-600">✓ Fichier uploadé</p>
                        )}
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
                      <Label htmlFor="manual_data_source">Provenance des Données (Information Manuelle)</Label>
                      <Textarea
                        id="manual_data_source"
                        value={newTemplate.manual_data_source}
                        onChange={(e) => setNewTemplate({ ...newTemplate, manual_data_source: e.target.value })}
                        rows={2}
                        placeholder="Indiquez d'où proviennent les données pour ce template..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenu du Modèle (HTML) *</Label>
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
                      Créer Template Customisé
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Templates Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucun template</p>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <Card key={template.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">{template.name}</h3>
                                  <Badge variant="outline">{template.category}</Badge>
                                  {template.source_module && (
                                    <Badge variant="secondary">→ {template.source_module}</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                                {template.manual_data_source && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Provenance:</span> {template.manual_data_source}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Créé le {new Date(template.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 mb-4">
                        <CheckCircle className="h-5 w-5" />
                        <span>Mot de passe de signature configuré</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowUpdatePasswordDialog(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier mon Mot de Passe
                        </Button>
                        
                        {isAdmin() && (
                          <Button
                            variant="outline"
                            onClick={() => setShowResetPasswordDialog(true)}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Réinitialiser pour un Utilisateur
                          </Button>
                        )}
                      </div>
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

      {/* Update Password Dialog */}
      <Dialog open={showUpdatePasswordDialog} onOpenChange={setShowUpdatePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Mot de Passe de Signature</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateSignaturePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old_password">Ancien Mot de Passe *</Label>
              <Input
                id="old_password"
                type="password"
                value={updatePasswordForm.old_password}
                onChange={(e) => setUpdatePasswordForm({
                  ...updatePasswordForm,
                  old_password: e.target.value
                })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau Mot de Passe *</Label>
              <Input
                id="new_password"
                type="password"
                value={updatePasswordForm.new_password}
                onChange={(e) => setUpdatePasswordForm({
                  ...updatePasswordForm,
                  new_password: e.target.value
                })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_new_password">Confirmer Nouveau Mot de Passe *</Label>
              <Input
                id="confirm_new_password"
                type="password"
                value={updatePasswordForm.confirm_password}
                onChange={(e) => setUpdatePasswordForm({
                  ...updatePasswordForm,
                  confirm_password: e.target.value
                })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUpdatePasswordDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog (Admin) */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le Mot de Passe (Admin)</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe de signature pour un utilisateur
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetSignaturePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset_user">Utilisateur *</Label>
              <Select
                value={resetPasswordForm.user_id}
                onValueChange={(value) => setResetPasswordForm({
                  ...resetPasswordForm,
                  user_id: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset_new_password">Nouveau Mot de Passe *</Label>
              <Input
                id="reset_new_password"
                type="password"
                value={resetPasswordForm.new_password}
                onChange={(e) => setResetPasswordForm({
                  ...resetPasswordForm,
                  new_password: e.target.value
                })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset_confirm_password">Confirmer Mot de Passe *</Label>
              <Input
                id="reset_confirm_password"
                type="password"
                value={resetPasswordForm.confirm_password}
                onChange={(e) => setResetPasswordForm({
                  ...resetPasswordForm,
                  confirm_password: e.target.value
                })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="destructive">
                <Lock className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsRH;
