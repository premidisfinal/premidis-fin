import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { User, Globe, Bell, Shield, Palette, Loader2, Moon, Sun, Lock, Camera } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

import API_URL from "../config/api";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUser(formData);
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarLoading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/api/upload/avatar/${user.id}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo de profil mise à jour');
      // Refresh user data
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await axios.put(`${API_URL}/api/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      toast.success('Mot de passe modifié avec succès');
      setPasswordDialogOpen(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl" data-testid="settings-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
          <p className="text-muted-foreground">Gérez vos préférences et votre profil</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profil</CardTitle>
            </div>
            <CardDescription>Informations personnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url.startsWith('/api/') ? '' : '/api'}${user.avatar_url}`) : null} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {avatarLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{user?.first_name} {user?.last_name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground capitalize mt-1">
                  {user?.role?.replace('_', ' ')} • {user?.department?.replace('_', ' ')}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('firstName')}</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  data-testid="settings-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('lastName')}</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  data-testid="settings-lastname"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+243 xxx xxx xxx"
                  data-testid="settings-phone"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading} data-testid="save-profile-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>{t('selectLanguage')}</CardTitle>
            </div>
            <CardDescription>Choisissez votre langue préférée</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`
                    p-4 rounded-xl border-2 text-center transition-all
                    ${language === lang.code 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  data-testid={`lang-${lang.code}`}
                >
                  <span className="text-2xl mb-2 block">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Gérez vos préférences de notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications par email</p>
                <p className="text-sm text-muted-foreground">Recevoir des notifications par email</p>
              </div>
              <Switch defaultChecked data-testid="email-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications push</p>
                <p className="text-sm text-muted-foreground">Notifications dans le navigateur</p>
              </div>
              <Switch data-testid="push-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rappels de congés</p>
                <p className="text-sm text-muted-foreground">Rappels pour les demandes de congés</p>
              </div>
              <Switch defaultChecked data-testid="leave-reminders" />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>Paramètres de sécurité de votre compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Changer le mot de passe</p>
                <p className="text-sm text-muted-foreground">Mettre à jour votre mot de passe</p>
              </div>
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Lock className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Changer le mot de passe</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mot de passe actuel</Label>
                      <Input
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmer le nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={passwordLoading}>
                      {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Apparence</CardTitle>
            </div>
            <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="font-medium">Mode sombre</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Activé' : 'Désactivé'}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
