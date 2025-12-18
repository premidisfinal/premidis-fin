import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { 
  Banknote, Download, FileText, Loader2, TrendingUp, TrendingDown, 
  Gift, Car, Home, Shield, Calendar, Plus, Info
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Payroll = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('remuneration');
  const [benefits, setBenefits] = useState([
    { id: '1', name: 'Transport', type: 'transport', amount: 150, icon: Car },
    { id: '2', name: 'Assurance santé', type: 'assurance', amount: 200, icon: Shield },
    { id: '3', name: 'Logement', type: 'logement', amount: 300, icon: Home }
  ]);
  const [rewards, setRewards] = useState([]);
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState({employee:'',title:'',amount:''});
  const [payslipForm, setPayslipForm] = useState({employee_name:'',department:'',month:'',year:new Date().getFullYear(),base_salary:'',bonuses:'',deductions:''});

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const fetchPayslips = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payroll`, {
        params: { year: parseInt(selectedYear) }
      });
      setPayslips(response.data.payslips || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotal = () => {
    return payslips.reduce((sum, p) => sum + p.net_salary, 0);
  };

  const totalBenefits = benefits.reduce((sum, b) => sum + b.amount, 0);

  const getLatestPayslip = () => {
    if (payslips.length === 0) return null;
    return payslips.reduce((latest, current) => {
      if (current.year > latest.year) return current;
      if (current.year === latest.year && current.month > latest.month) return current;
      return latest;
    });
  };

  const latestPayslip = getLatestPayslip();

  const handleExport = () => {
    const csv = payslips.map(p => `${p.month}/${p.year},${p.base_salary},${p.bonuses},${p.deductions},${p.net_salary}`).join('\n');
    const blob = new Blob([`Mois,Base,Primes,Retenues,Net\n${csv}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remuneration_${selectedYear}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="payroll-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rémunération</h1>
            <p className="text-muted-foreground">Salaire, avantages et récompenses</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} data-testid="export-payroll-btn">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32" data-testid="year-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        {latestPayslip && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Salaire de base</p>
                    <p className="text-xl font-bold">{formatCurrency(latestPayslip.base_salary)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avantages</p>
                    <p className="text-xl font-bold text-green-600">+{formatCurrency(totalBenefits)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Retenues</p>
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(latestPayslip.deductions)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary bg-gradient-to-br from-secondary/10 to-transparent">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Salaire net</p>
                    <p className="text-xl font-bold text-secondary">{formatCurrency(latestPayslip.net_salary + totalBenefits)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-secondary/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="remuneration" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Fiches de paie
            </TabsTrigger>
            <TabsTrigger value="avantages" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Avantages
            </TabsTrigger>
            <TabsTrigger value="recompenses" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Récompenses
            </TabsTrigger>
          </TabsList>

          {/* REMUNERATION TAB */}
          <TabsContent value="remuneration" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fiches de paie {selectedYear}</CardTitle>
                  <CardDescription>
                    {payslips.length} fiche(s) • Date de paiement : 25 de chaque mois
                  </CardDescription>
                </div>
                {isAdmin() && (
                  <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="create-payslip-btn">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer fiche de paie
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouvelle fiche de paie</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nom de l'employé</Label>
                          <Input placeholder="Nom complet" value={payslipForm.employee_name} onChange={(e) => setPayslipForm({...payslipForm, employee_name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Département</Label>
                            <Select value={payslipForm.department} onValueChange={(v) => setPayslipForm({...payslipForm, department: v})}>
                              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="comptabilite">Comptabilité</SelectItem>
                                <SelectItem value="administration">Administration</SelectItem>
                                <SelectItem value="ressources_humaines">RH</SelectItem>
                                <SelectItem value="securite">Sécurité</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Mois</Label>
                            <Select value={payslipForm.month} onValueChange={(v) => setPayslipForm({...payslipForm, month: v})}>
                              <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                              <SelectContent>
                                {months.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Salaire base (USD)</Label>
                            <Input type="number" placeholder="0" value={payslipForm.base_salary} onChange={(e) => setPayslipForm({...payslipForm, base_salary: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Primes (USD)</Label>
                            <Input type="number" placeholder="0" value={payslipForm.bonuses} onChange={(e) => setPayslipForm({...payslipForm, bonuses: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Retenues (USD)</Label>
                            <Input type="number" placeholder="0" value={payslipForm.deductions} onChange={(e) => setPayslipForm({...payslipForm, deductions: e.target.value})} />
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Net à payer</p>
                          <p className="text-xl font-bold text-secondary">
                            {formatCurrency((parseFloat(payslipForm.base_salary)||0) + (parseFloat(payslipForm.bonuses)||0) - (parseFloat(payslipForm.deductions)||0))}
                          </p>
                        </div>
                        <Button className="w-full" onClick={async () => {
                          try {
                            await axios.post(`${API_URL}/api/payroll`, {
                              employee_id: user.id,
                              month: parseInt(payslipForm.month),
                              year: payslipForm.year,
                              base_salary: parseFloat(payslipForm.base_salary) || 0,
                              bonuses: parseFloat(payslipForm.bonuses) || 0,
                              deductions: parseFloat(payslipForm.deductions) || 0
                            });
                            toast.success('Fiche de paie créée');
                            setPayslipDialogOpen(false);
                            fetchPayslips();
                          } catch(e) { toast.error('Erreur'); }
                        }}>Créer la fiche</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {/* Salary Calculation Explanation */}
                <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-2">Calcul du salaire</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Salaire Net</strong> = Salaire de Base + Primes + Avantages - Retenues (INSS, IPR, etc.)
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : payslips.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune fiche de paie pour {selectedYear}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payslips
                      .sort((a, b) => b.month - a.month)
                      .map((payslip) => (
                        <div
                          key={payslip.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {months[payslip.month - 1]} {payslip.year}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Base: {formatCurrency(payslip.base_salary)}</span>
                                {payslip.bonuses > 0 && (
                                  <span className="text-green-600">+{formatCurrency(payslip.bonuses)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Net à payer</p>
                              <p className="text-lg font-bold text-secondary">
                                {formatCurrency(payslip.net_salary)}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
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

          {/* AVANTAGES TAB */}
          <TabsContent value="avantages" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Avantages</CardTitle>
                  <CardDescription>Vos avantages mensuels</CardDescription>
                </div>
                {isAdmin() && (
                  <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-benefit-btn">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un avantage</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Type d'avantage</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transport">Transport</SelectItem>
                              <SelectItem value="logement">Logement</SelectItem>
                              <SelectItem value="assurance">Assurance</SelectItem>
                              <SelectItem value="repas">Repas</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Montant (USD)</Label>
                          <Input type="number" placeholder="0.00" />
                        </div>
                        <Button className="w-full">Ajouter</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benefits.map((benefit) => {
                    const Icon = benefit.icon;
                    return (
                      <div
                        key={benefit.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{benefit.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{benefit.type}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          +{formatCurrency(benefit.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="font-medium">Total des avantages</p>
                  <p className="text-xl font-bold text-green-600">
                    +{formatCurrency(totalBenefits)}/mois
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECOMPENSES TAB */}
          <TabsContent value="recompenses" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cadeaux & Récompenses</CardTitle>
                  <CardDescription>Bonus et récompenses exceptionnelles</CardDescription>
                </div>
                {isAdmin() && (
                  <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-reward-btn">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer récompense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouvelle récompense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Employé</Label>
                          <Input placeholder="Nom de l'employé" value={rewardForm.employee} onChange={(e) => setRewardForm({...rewardForm, employee: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Titre de la récompense</Label>
                          <Input placeholder="Ex: Objectif atteint Q4" value={rewardForm.title} onChange={(e) => setRewardForm({...rewardForm, title: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Montant (USD)</Label>
                          <Input type="number" placeholder="0.00" value={rewardForm.amount} onChange={(e) => setRewardForm({...rewardForm, amount: e.target.value})} />
                        </div>
                        <Button className="w-full" onClick={() => {
                          if(rewardForm.title && rewardForm.amount) {
                            setRewards([...rewards, {id: Date.now(), ...rewardForm, date: new Date().toLocaleDateString()}]);
                            setRewardDialogOpen(false);
                            setRewardForm({employee:'',title:'',amount:''});
                            toast.success('Récompense créée');
                          }
                        }}>Créer</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune récompense pour le moment</p>
                    <p className="text-sm mt-2">Les récompenses et bonus exceptionnels apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{reward.title}</p>
                            <p className="text-sm text-muted-foreground">{reward.employee} • {reward.date}</p>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            +{formatCurrency(parseFloat(reward.amount) || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Info */}
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Date de paiement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Le salaire est versé le <strong>25 de chaque mois</strong>. 
                  En cas de jour férié, le paiement est effectué le jour ouvrable précédent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
