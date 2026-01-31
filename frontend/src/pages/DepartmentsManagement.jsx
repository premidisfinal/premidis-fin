import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, Briefcase } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

import API_URL from "../config/api";

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, deptId: null });
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/departments`);
      setDepartments(res.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Erreur lors du chargement des départements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editDept) {
        await axios.put(`${API_URL}/api/departments/${editDept.id}`, formData);
        toast.success('Département mis à jour');
      } else {
        await axios.post(`${API_URL}/api/departments`, formData);
        toast.success('Département créé');
      }
      setDialogOpen(false);
      setEditDept(null);
      setFormData({ code: '', name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setEditDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.deptId) return;
    
    try {
      await axios.delete(`${API_URL}/api/departments/${deleteDialog.deptId}`);
      toast.success('Département supprimé');
      setDeleteDialog({ open: false, deptId: null });
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Départements</h2>
          <p className="text-muted-foreground">Créer, modifier et supprimer les départements</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditDept(null); setFormData({ code: '', name: '', description: '' }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau département
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editDept ? 'Modifier le département' : 'Nouveau département'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: informatique"
                  required
                  disabled={!!editDept}
                />
                <p className="text-xs text-muted-foreground mt-1">Code unique en minuscules sans espaces</p>
              </div>
              
              <div>
                <Label>Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Informatique"
                  required
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du département"
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editDept ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map(dept => (
          <Card key={dept.code} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{dept.code}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(dept)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteDialog({ open: true, deptId: dept.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {dept.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{dept.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun département configuré</p>
            <p className="text-sm text-muted-foreground">Créez votre premier département</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, deptId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce département ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentsManagement;
