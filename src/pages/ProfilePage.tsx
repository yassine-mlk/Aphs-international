import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Camera, Loader2, Lock, Package, FolderOpen, Users, HardDrive } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const { getUserSettings, updateUserSettings, updateUserPassword, uploadFile, getFileUrl } = useSupabase();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userSettingsState, setUserSettingsState] = useState<any>(null);

  const [tenantPlan, setTenantPlan] = useState<{
    name: string; plan: string; status: string;
    maxProjects: number; maxIntervenants: number; maxStorageGb: number;
    currentProjects: number; currentIntervenants: number;
    trialEndsAt: string | null;
  } | null>(null);

  const isAdmin = JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  useEffect(() => {
    if (!currentUser?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const settings = await getUserSettings(currentUser.id);
        if (settings) {
          setUserSettingsState(settings);
          setProfileForm({
            firstName: settings.first_name || '',
            lastName: settings.last_name || '',
            email: currentUser.email || '',
            phone: settings.phone || '',
            bio: settings.bio || ''
          });
          if (settings.avatar_url) setAvatarPreview(settings.avatar_url);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isAdmin || !currentUser?.id) return;
    const loadTenantPlan = async () => {
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', currentUser.id).maybeSingle();
      if (!profile?.tenant_id) return;
      const { data: tenant } = await supabase.from('tenants').select('name, plan, status, max_projects, max_intervenants, max_storage_gb, trial_ends_at').eq('id', profile.tenant_id).maybeSingle();
      if (!tenant) return;
      const [{ count: projCount }, { count: intervCount }] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).neq('role', 'admin')
      ]);
      setTenantPlan({
        name: tenant.name, plan: tenant.plan, status: tenant.status,
        maxProjects: tenant.max_projects, maxIntervenants: tenant.max_intervenants, maxStorageGb: tenant.max_storage_gb,
        currentProjects: projCount ?? 0, currentIntervenants: intervCount ?? 0,
        trialEndsAt: tenant.trial_ends_at
      });
    };
    loadTenantPlan();
  }, [isAdmin, currentUser?.id]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: "Erreur", description: "Format accepté : JPG, PNG, WEBP", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Image max 2 MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !currentUser?.id) return null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${ext}`;
      const result = await uploadFile('avatars', fileName, avatarFile);
      if (result.error) throw result.error;
      return await getFileUrl('avatars', fileName);
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      let avatarUrl = userSettingsState?.avatar_url;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }
      await updateUserSettings(currentUser.id, {
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        phone: profileForm.phone,
        bio: profileForm.bio,
        avatar_url: avatarUrl
      });
      setUserSettingsState((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarFile(null);
      toast({ title: "Succès", description: "Profil mis à jour" });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Erreur", description: "Minimum 6 caractères", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateUserPassword(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et votre abonnement.</p>
      </div>

      <Tabs defaultValue="infos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="infos"><User className="h-4 w-4 mr-2" />Informations</TabsTrigger>
          <TabsTrigger value="password"><Lock className="h-4 w-4 mr-2" />Mot de passe</TabsTrigger>
          {isAdmin && <TabsTrigger value="offre"><Package className="h-4 w-4 mr-2" />Mon offre</TabsTrigger>}
        </TabsList>

        {/* Onglet infos perso */}
        <TabsContent value="infos">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Modifiez votre profil et votre photo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={avatarPreview || ''} />
                        <AvatarFallback className="text-xl bg-aps-navy text-white">
                          {profileForm.firstName.charAt(0)}{profileForm.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploadingAvatar}>
                      <Camera className="h-4 w-4 mr-1" />
                      {avatarFile ? 'Changer' : 'Ajouter une photo'}
                    </Button>
                    {avatarFile && <p className="text-xs text-muted-foreground">{avatarFile.name}</p>}
                  </div>

                  <div className="flex-1 grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prénom</Label>
                        <Input value={profileForm.firstName} onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input value={profileForm.lastName} onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={profileForm.email} readOnly disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Input value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet mot de passe */}
        <TabsContent value="password">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Changer de mot de passe</CardTitle>
              <CardDescription>Mettez à jour votre mot de passe.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Mot de passe actuel</Label>
                  <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input type="password" value={passwordForm.new} onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe</Label>
                  <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Mettre à jour'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet offre (admin seulement) */}
        {isAdmin && (
          <TabsContent value="offre">
            {tenantPlan ? (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Votre formule
                  </CardTitle>
                  <CardDescription>Détails de l'abonnement et utilisation des quotas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg capitalize">
                        {tenantPlan.plan === 'starter' ? 'Starter' : tenantPlan.plan === 'pro' ? 'Pro' : tenantPlan.plan === 'enterprise' ? 'Enterprise' : tenantPlan.plan}
                      </p>
                      <p className="text-sm text-muted-foreground">{tenantPlan.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tenantPlan.status === 'active' ? 'bg-green-100 text-green-700' :
                        tenantPlan.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tenantPlan.status === 'active' ? 'Actif' : tenantPlan.status === 'trial' ? 'Essai' : 'Suspendu'}
                      </span>
                      {tenantPlan.status === 'trial' && tenantPlan.trialEndsAt && (
                        <p className="text-xs text-muted-foreground">Essai jusqu'au {new Date(tenantPlan.trialEndsAt).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5"><FolderOpen className="h-4 w-4" /> Projets</span>
                        <span className="font-medium">{tenantPlan.currentProjects} / {tenantPlan.maxProjects}</span>
                      </div>
                      <Progress value={(tenantPlan.currentProjects / tenantPlan.maxProjects) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Intervenants</span>
                        <span className="font-medium">{tenantPlan.currentIntervenants} / {tenantPlan.maxIntervenants}</span>
                      </div>
                      <Progress value={(tenantPlan.currentIntervenants / tenantPlan.maxIntervenants) * 100} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5"><HardDrive className="h-4 w-4" /> Stockage</span>
                      <span className="font-medium">{tenantPlan.maxStorageGb} GB inclus</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground border-t pt-4">
                    Pour modifier votre formule ou augmenter vos limites, contactez le support.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Informations d'abonnement non disponibles.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProfilePage;
