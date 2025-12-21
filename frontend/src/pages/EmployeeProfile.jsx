import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Briefcase, User, Award, FileText, Banknote, Settings, 
  Mail, Phone, Building2, Calendar, MapPin, Upload, Download,
  Edit, ArrowLeft, Plus, Clock, Target, CheckCircle, Loader2,
  ThumbsUp, ThumbsDown, UserCheck, Camera
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, canEdit } = useAuth();
  const { t } = useLanguage();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('travail');
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploading, setUploading] = useState(false);
  
  // For creating objectives (admin only)
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    description: '',
    target_date: '',
    progress: 0
  });

  const isOwnProfile = user?.id === id || !id;
  const canModify = isAdmin() || (canEdit() && !isOwnProfile);

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      const employeeId = id || user?.id;
      
      // Fetch employee details
      const empResponse = await axios.get(`${API_URL}/api/employees/${employeeId}`).catch(() => null);
      if (empResponse) {
        setEmployee(empResponse.data);
        setEditData(empResponse.data);
      } else {
        // Use user data if no employee record
        setEmployee({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          department: user.department,
          position: user.position || 'Employé',
          phone: user.phone,
          hire_date: user.created_at?.split('T')[0],
          country: 'RDC',
          contract_type: 'CDI'
        });
      }

      // Fetch payslips
      try {
        const payslipsResponse = await axios.get(`${API_URL}/api/payroll`, {
          params: { employee_id: employeeId }
        });
        setPayslips(payslipsResponse.data.payslips || []);
      } catch {
        setPayslips([]);
      }

      // Fetch objectives/evaluations
      try {
        const evalResponse = await axios.get(`${API_URL}/api/performance`);
        setObjectives(evalResponse.data.evaluations || []);
      } catch {
        setObjectives([]);
      }

      // Fetch documents
      try {
        const docsResponse = await axios.get(`${API_URL}/api/employees/${employeeId}/documents`);
        setDocuments(docsResponse.data.documents || []);
      } catch {
        setDocuments([]);
      }

      // Fetch behavior notes
      try {
        const behaviorResponse = await axios.get(`${API_URL}/api/behavior/${employeeId}`);
        setBehaviors(behaviorResponse.data.behaviors || []);
      } catch {
        setBehaviors([]);
      }

    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload profile picture
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const employeeId = id || user?.id;
      const response = await axios.post(`${API_URL}/api/upload/avatar/${employeeId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo de profil mise à jour');
      fetchEmployeeData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  // Upload document
  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // First upload the file
      const uploadResponse = await axios.post(`${API_URL}/api/upload/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Then save the document reference
      const employeeId = id || user?.id;
      await axios.post(`${API_URL}/api/employees/${employeeId}/documents`, {
        name: file.name,
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        url: uploadResponse.data.url
      });
      
      toast.success('Document ajouté avec succès');
      fetchEmployeeData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API_URL}/api/employees/${employee.id}`, editData);
      setEmployee(editData);
      setIsEditing(false);
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCreateObjective = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/performance`, {
        employee_id: employee.id,
        period: objectiveForm.title,
        objectives: [{
          title: objectiveForm.title,
          description: objectiveForm.description,
          target_date: objectiveForm.target_date,
          progress: objectiveForm.progress
        }],
        rating: 0,
        comments: objectiveForm.description
      });
      toast.success('Objectif créé');
      setObjectiveDialog(false);
      setObjectiveForm({ title: '', description: '', target_date: '', progress: 0 });
      fetchEmployeeData();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
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

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employé non trouvé</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="employee-profile-page">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Dossier Employé</h1>
              {canModify && (
                <Button 
                  variant={isEditing ? "default" : "outline"} 
                  onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)}
                  data-testid="edit-profile-btn"
                >
                  {isEditing ? (
                    <>Enregistrer</>
                  ) : (
                    <><Edit className="mr-2 h-4 w-4" />Modifier</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Employee Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar with upload option */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={employee.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {(isOwnProfile || canModify) && (
                  <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <p className="text-lg text-muted-foreground">{employee.position}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="capitalize">{employee.department?.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="secondary">{employee.contract_type}</Badge>
                  <Badge variant="outline">{employee.country}</Badge>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 min-w-[200px]">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">{documents.length}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-secondary">{behaviors.length}</p>
                  <p className="text-xs text-muted-foreground">Notes comportement</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs - Like Odoo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="travail" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Travail
            </TabsTrigger>
            <TabsTrigger value="cv" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              CV
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="comportement" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Comportement
            </TabsTrigger>
            <TabsTrigger value="objectifs" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Objectifs
            </TabsTrigger>
          </TabsList>

          {/* TRAVAIL Tab */}
          <TabsContent value="travail" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">TRAVAIL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Entreprise</Label>
                      <p className="font-medium">PREMIDIS sarl</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Département</Label>
                      {isEditing && canModify ? (
                        <Input
                          value={editData.department}
                          onChange={(e) => setEditData({...editData, department: e.target.value})}
                        />
                      ) : (
                        <p className="font-medium capitalize">{employee.department?.replace('_', ' ')}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Poste</Label>
                      {isEditing && canModify ? (
                        <Input
                          value={editData.position}
                          onChange={(e) => setEditData({...editData, position: e.target.value})}
                        />
                      ) : (
                        <p className="font-medium">{employee.position}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type de contrat</Label>
                      <p className="font-medium">{employee.contract_type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">EMPLACEMENT</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Adresse professionnelle</Label>
                    <p className="font-medium">PREMIDIS sarl</p>
                    <p className="text-muted-foreground text-sm">{employee.country}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date d'embauche</Label>
                    <p className="font-medium">
                      {employee.hire_date ? format(new Date(employee.hire_date), 'dd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CV Tab */}
          <TabsContent value="cv" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Curriculum Vitae</CardTitle>
                <CardDescription>Parcours professionnel et formation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-muted-foreground">Formation</Label>
                  <p className="text-muted-foreground italic">Non renseigné</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Expérience professionnelle</Label>
                  <p className="text-muted-foreground italic">Non renseigné</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Compétences</Label>
                  <p className="text-muted-foreground italic">Non renseigné</p>
                </div>
                
                {canModify && (
                  <Button variant="outline" className="mt-4">
                    <Upload className="mr-2 h-4 w-4" />
                    Importer CV
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Certifications</CardTitle>
                  <CardDescription>Diplômes et certifications professionnelles</CardDescription>
                </div>
                {canModify && (
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune certification enregistrée</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personnel Tab */}
          <TabsContent value="personnel" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Prénom</Label>
                      <p className="font-medium">{employee.first_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Nom</Label>
                      <p className="font-medium">{employee.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{employee.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Téléphone</Label>
                      {isEditing && canModify ? (
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        />
                      ) : (
                        <p className="font-medium">{employee.phone || '-'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  {canModify && (
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Importer
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun document</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paie Tab */}
          <TabsContent value="paie" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fiches de paie</CardTitle>
                  <CardDescription>Historique des rémunérations</CardDescription>
                </div>
                {canModify && (
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Importer
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {payslips.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune fiche de paie</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payslips.map((payslip) => (
                      <div 
                        key={payslip.id} 
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Banknote className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][payslip.month - 1]} {payslip.year}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Base: {formatCurrency(payslip.base_salary)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-secondary">
                            {formatCurrency(payslip.net_salary)}
                          </p>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Objectifs Tab */}
          <TabsContent value="objectifs" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Objectifs & Évaluations</CardTitle>
                  <CardDescription>Suivi des performances</CardDescription>
                </div>
                {isAdmin() && (
                  <Dialog open={objectiveDialog} onOpenChange={setObjectiveDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="create-objective-btn">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un objectif
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouvel objectif</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateObjective} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Titre de l'objectif</Label>
                          <Input
                            value={objectiveForm.title}
                            onChange={(e) => setObjectiveForm({...objectiveForm, title: e.target.value})}
                            placeholder="Ex: Augmenter les ventes de 10%"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={objectiveForm.description}
                            onChange={(e) => setObjectiveForm({...objectiveForm, description: e.target.value})}
                            placeholder="Détails de l'objectif..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date cible</Label>
                          <Input
                            type="date"
                            value={objectiveForm.target_date}
                            onChange={(e) => setObjectiveForm({...objectiveForm, target_date: e.target.value})}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Créer l'objectif
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {objectives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun objectif défini</p>
                    {isAdmin() && (
                      <p className="text-sm mt-2">Cliquez sur "Créer un objectif" pour commencer</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {objectives.map((obj) => (
                      <div key={obj.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{obj.period}</h4>
                            <p className="text-sm text-muted-foreground">{obj.comments}</p>
                          </div>
                          <Badge variant={obj.rating >= 4 ? 'default' : obj.rating >= 2 ? 'secondary' : 'destructive'}>
                            {obj.rating}/5
                          </Badge>
                        </div>
                        {obj.objectives?.map((o, idx) => (
                          <div key={idx} className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{o.title || o.name}</span>
                              <span className="text-muted-foreground">{o.progress || 0}%</span>
                            </div>
                            <Progress value={o.progress || 0} className="h-2" />
                          </div>
                        ))}
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

export default EmployeeProfile;
