import React, { useState, useEffect, useRef } from 'react';
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
import { uploadToR2 } from "@/lib/r2";

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const { getUserSettings, updateUserSettings, updateUserPassword, uploadFile, getFileUrl } = useSupabase();
  const { user: currentUser, role, status } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const [userSettingsState, setUserSettingsState] = useState<any>(null);

  const [tenantPlan, setTenantPlan] = useState<{
    name: string; plan: string; status: string;
    maxProjects: number; maxIntervenants: number; maxStorageGb: number;
    currentProjects: number; currentIntervenants: number;
    trialEndsAt: string | null;
  } | null>(null);

  const isAdmin = role === 'admin' || currentUser?.email === 'admin@aps.com';

  useEffect(() => {
    if (status !== 'authenticated' || !currentUser?.id) {
      if (status !== 'loading') setLoading(false);
      return;
    }
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
            bio: settings.bio || '',
            avatarUrl: settings.avatar_url || ''
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.id, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin || !currentUser?.id) return;
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
  }, [isAdmin, currentUser?.id, status]);


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      await updateUserSettings(currentUser.id, {
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        phone: profileForm.phone,
        bio: profileForm.bio,
        avatar_url: profileForm.avatarUrl
      });
      toast({ title: "Succès", description: "Profil mis à jour" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    // Validation de la taille (max 5 Mo)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
      return;
    }

    setAvatarUploading(true);
    setUploadProgress(0);

    try {
      const extension = file.name.split('.').pop();
      const fileName = `avatars/${currentUser.id}_${Date.now()}.${extension}`;
      
      const publicUrl = await uploadToR2(file, fileName, (progress) => {
        setUploadProgress(progress);
      });

      // Mettre à jour les paramètres utilisateur avec la nouvelle URL
      await updateUserSettings(currentUser.id, {
        avatar_url: publicUrl
      });

      setProfileForm(prev => ({ ...prev, avatarUrl: publicUrl }));
      setUserSettingsState(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      toast({ title: "Succès", description: "Photo de profil mise à jour" });
    } catch (error) {
      console.error("Erreur lors de l'upload de l'avatar:", error);
      toast({ title: "Erreur", description: "Impossible d'importer l'image", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      setUploadProgress(0);
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
              <div className="flex flex-col items-center mb-8">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={profileForm.avatarUrl} />
                    <AvatarFallback className="bg-teal-50 text-teal-600 text-3xl font-bold">
                      {profileForm.firstName[0]}{profileForm.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                <p className="mt-2 text-sm text-muted-foreground">Cliquez pour changer votre photo</p>
                {avatarUploading && uploadProgress > 0 && (
                  <div className="w-48 mt-2">
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                )}
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-4">
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
