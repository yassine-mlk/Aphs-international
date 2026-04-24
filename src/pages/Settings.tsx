import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { User, Lock, Bell, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { useSupabase, UserSettings as UserSettingsType } from '../hooks/useSupabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ProjectStructureTab } from "@/components/settings/ProjectStructureTab";

const Settings: React.FC = () => {
  const { toast } = useToast();
  const { getUserSettings, updateUserSettings, updateUserPassword } = useSupabase();
  const { setTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<{ email: string, role: string, id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettingsType | null>(null);
  
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: ""
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    messages: false,
    updates: true
  });

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin' || currentUser?.user_metadata?.role === 'admin';

  // Charger les infos utilisateur et ses paramètres
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Charger les paramètres utilisateur depuis Supabase
        if (parsedUser.id) {
          const settings = await getUserSettings(parsedUser.id);
          if (settings) {
            setUserSettings(settings);
            
            // Mettre à jour les formulaires avec les données
            setProfileForm({
              firstName: settings.first_name || "",
              lastName: settings.last_name || "",
              email: parsedUser.email,
              phone: settings.phone || "",
              bio: settings.bio || ""
            });
            
            setNotifications(settings.notifications);
          }
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger vos paramètres",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [getUserSettings, toast]);

  // Charger le tenantId de l'admin connecté
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.tenant_id) setTenantId(data.tenant_id); });
  }, [currentUser?.id]);

  // Mettre à jour le profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setSaving(true);
    try {
      // Mettre à jour les paramètres dans Supabase
      await updateUserSettings(user.id, {
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        phone: profileForm.phone,
        bio: profileForm.bio
      });
      
      // Mettre à jour le state local
      if (userSettings) {
        setUserSettings({
          ...userSettings,
          first_name: profileForm.firstName,
          last_name: profileForm.lastName,
          phone: profileForm.phone,
          bio: profileForm.bio
        });
      }

      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour le mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérification des mots de passe
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.new.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      const success = await updateUserPassword(passwordForm.current, passwordForm.new);
      
      if (success) {
        // Réinitialiser le formulaire
        setPasswordForm({
          current: "",
          new: "",
          confirm: ""
        });
      }
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour les notifications
  const handleNotificationsSubmit = async () => {
    if (!user?.id || !userSettings) return;
    
    setSaving(true);
    try {
      await updateUserSettings(user.id, {
        notifications
      });
      
      // Mettre à jour le state local
      setUserSettings({
        ...userSettings,
        notifications
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour vos préférences de notification",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <p>Veuillez vous connecter pour accéder à vos paramètres.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos préférences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white">
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" className="data-[state=active]:bg-white">
            <Lock className="h-4 w-4 mr-2" />
            Mot de passe
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="project-management" className="data-[state=active]:bg-white">
              <ClipboardList className="h-4 w-4 mr-2" />
              Gestion structure des projets
            </TabsTrigger>
          )}
        </TabsList>

        {/* Onglet Profil */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Modifiez vos informations personnelles ici.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input 
                        id="firstName"
                        value={profileForm.firstName} 
                        onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input 
                        id="lastName"
                        value={profileForm.lastName} 
                        onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        value={profileForm.email} 
                        disabled 
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input 
                        id="phone"
                        value={profileForm.phone} 
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input 
                      id="bio"
                      value={profileForm.bio} 
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Mot de passe */}
        <TabsContent value="password">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Changer de mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe pour sécuriser votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Mot de passe actuel</Label>
                  <Input 
                    id="current" 
                    type="password" 
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">Nouveau mot de passe</Label>
                  <Input 
                    id="new" 
                    type="password" 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                  <Input 
                    id="confirm" 
                    type="password" 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Mise à jour...' : 'Mettre à jour'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez être notifié.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications par email</Label>
                  <p className="text-muted-foreground text-sm">
                    Recevoir des emails pour les mises à jour importantes.
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications push</Label>
                  <p className="text-muted-foreground text-sm">
                    Recevoir des notifications sur votre appareil.
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Messages et mentions</Label>
                  <p className="text-muted-foreground text-sm">
                    Recevoir des notifications pour les nouveaux messages.
                  </p>
                </div>
                <Switch
                  checked={notifications.messages}
                  onCheckedChange={(checked) => setNotifications({...notifications, messages: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mises à jour du système</Label>
                  <p className="text-muted-foreground text-sm">
                    Être informé des nouveautés et des améliorations.
                  </p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) => setNotifications({...notifications, updates: checked})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleNotificationsSubmit} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Onglet Gestion structure des projets (admin seulement) */}
        {isAdmin && (
          <TabsContent value="project-management">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Gestion structure des projets</CardTitle>
                <CardDescription>
                  Personnalisez la structure par défaut des projets et définissez les fiches informatives pour chaque tâche.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenantId && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-1">Structure par défaut des projets</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Modifiez ici la structure appliquée à tous les nouveaux projets de votre espace.
                    </p>
                    <ProjectStructureTab tenantId={tenantId} />
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
