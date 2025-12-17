import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Banknote, Download, FileText, Loader2, TrendingUp, TrendingDown, Printer, Upload } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Payroll = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

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
      setPayslips(response.data.payslips);
    } catch (error) {
      toast.error('Erreur lors du chargement des fiches de paie');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotal = () => {
    return payslips.reduce((sum, p) => sum + p.net_salary, 0);
  };

  const getLatestPayslip = () => {
    if (payslips.length === 0) return null;
    return payslips.reduce((latest, current) => {
      if (current.year > latest.year) return current;
      if (current.year === latest.year && current.month > latest.month) return current;
      return latest;
    });
  };

  const latestPayslip = getLatestPayslip();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="payroll-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('payroll')}</h1>
            <p className="text-muted-foreground">Consultez vos fiches de paie</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} data-testid="print-payroll-btn">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={() => {
              const csv = payslips.map(p => `${p.month}/${p.year},${p.base_salary},${p.bonuses},${p.deductions},${p.net_salary}`).join('\n');
              const blob = new Blob([`Mois,Base,Primes,Retenues,Net\n${csv}`], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `fiches_paie_${selectedYear}.csv`;
              a.click();
            }} data-testid="export-payroll-btn">
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
                    <p className="text-sm text-muted-foreground">{t('bonuses')}</p>
                    <p className="text-xl font-bold text-green-600">+{formatCurrency(latestPayslip.bonuses)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('deductions')}</p>
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
                    <p className="text-xl font-bold text-secondary">{formatCurrency(latestPayslip.net_salary)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-secondary/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payslips List */}
        <Card>
          <CardHeader>
            <CardTitle>Fiches de paie {selectedYear}</CardTitle>
            <CardDescription>
              {payslips.length} fiche(s) pour l'année {selectedYear}
              {payslips.length > 0 && ` • Total: ${formatCurrency(calculateTotal())}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      data-testid={`payslip-${payslip.id}`}
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
                            {payslip.deductions > 0 && (
                              <span className="text-red-600">-{formatCurrency(payslip.deductions)}</span>
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
                        <Button variant="outline" size="sm" data-testid={`download-${payslip.id}`}>
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

        {/* Annual Summary */}
        {payslips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif annuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total brut</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(payslips.reduce((sum, p) => sum + p.base_salary, 0))}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total primes</p>
                  <p className="text-xl font-bold text-green-600">
                    +{formatCurrency(payslips.reduce((sum, p) => sum + p.bonuses, 0))}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-secondary/20 to-transparent">
                  <p className="text-sm text-muted-foreground">Total net</p>
                  <p className="text-xl font-bold text-secondary">
                    {formatCurrency(calculateTotal())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
