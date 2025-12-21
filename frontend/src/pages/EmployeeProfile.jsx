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
  ThumbsUp, ThumbsDown, UserCheck, Camera, DollarSign
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

        {/* Tabs - Simplified */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="travail" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="comportement" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Comportement
            </TabsTrigger>
          </TabsList>

          {/* TRAVAIL/INFO Tab */}
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
                  
                  {/* Salary section - visible only to employee (own) or admin */}
                  {(isOwnProfile || isAdmin()) && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-muted-foreground">Salaire mensuel</Label>
                          <p className="text-2xl font-bold text-primary">
                            {employee.salary ? `${employee.salary.toLocaleString()} FC` : 'Non défini'}
                          </p>
                        </div>
                        {isAdmin() && !isOwnProfile && (
                          <Button variant="outline" size="sm" onClick={() => {
                            const newSalary = prompt('Nouveau salaire:', employee.salary || '0');
                            if (newSalary) {
                              axios.put(`${API_URL}/api/employees/${employee.id}/salary?salary=${newSalary}`)
                                .then(() => {
                                  toast.success('Salaire mis à jour');
                                  fetchEmployeeData();
                                })
                                .catch(err => toast.error('Erreur'));
                            }
                          }}>
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
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

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <CardDescription>Certificats, pièces d'identité, autres documents</CardDescription>
                </div>
                {(isOwnProfile || canModify) && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/jpg,image/png"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Ajouter un document
                      </span>
                    </Button>
                  </label>
                )}
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document</p>
                    <p className="text-sm mt-2">Formats acceptés : PDF, JPEG, PNG</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${doc.type === 'pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <FileText className={`h-5 w-5 ${doc.type === 'pdf' ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{doc.type}</p>
                          </div>
                        </div>
                        <a href={`${API_URL}${doc.url}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comportement Tab */}
          <TabsContent value="comportement" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Historique du comportement
                </CardTitle>
                <CardDescription>Notes et observations de la hiérarchie</CardDescription>
              </CardHeader>
              <CardContent>
                {behaviors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune note de comportement</p>
                    <p className="text-sm mt-2">Les notes sont ajoutées par l'administration</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {behaviors.map((behavior) => (
                      <div
                        key={behavior.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          behavior.type === 'positive' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' : 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {behavior.type === 'positive' ? (
                            <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <ThumbsDown className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={behavior.type === 'positive' ? 'default' : 'destructive'}>
                                {behavior.type === 'positive' ? 'Positif' : 'Négatif'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(behavior.date), 'dd MMMM yyyy', { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm">{behavior.note}</p>
                            {behavior.created_by_name && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Par {behavior.created_by_name}
                              </p>
                            )}
                          </div>
                        </div>
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
