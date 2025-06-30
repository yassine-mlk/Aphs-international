import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Lock, Bell, Globe, Moon, Sun, Smartphone, ClipboardList, Settings as SettingsIcon, Loader2, Upload, Camera } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { useSupabase, UserSettings as UserSettingsType } from '../hooks/useSupabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/components/LanguageSelector';
import { useTheme } from '../App';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

// Import structures de projet depuis ProjectDetails
import { projectStructure, realizationStructure } from "@/data/project-structure";

// Interface pour les fiches informatives des tâches
interface TaskInfoSheet {
  id?: string;
  phase_id: 'conception' | 'realisation';
  section_id: string;
  subsection_id: string;
  task_name: string;
  info_sheet: string;
  language: string; // 'fr', 'en', 'es', 'ar'
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

const Settings: React.FC = () => {
  const { toast } = useToast();
  const { getUserSettings, updateUserSettings, updateUserPassword, fetchData, insertData, updateData, uploadFile, getFileUrl, createStorageBucketIfNotExists } = useSupabase();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<{ email: string, role: string, id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettingsType | null>(null);
  
  // États pour l'upload de photo de profil
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // State pour les paramètres des projets
  const [infoSheetLoading, setInfoSheetLoading] = useState(false);
  const [taskInfoSheets, setTaskInfoSheets] = useState<TaskInfoSheet[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<'conception' | 'realisation'>('conception');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubsection, setSelectedSubsection] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [infoSheetText, setInfoSheetText] = useState('');
  const [selectedInfoSheetLanguage, setSelectedInfoSheetLanguage] = useState<Language>('fr'); // Langue sélectionnée pour la fiche
  
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
  
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('fr');

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
            
            // Charger l'avatar existant
            if (settings.avatar_url) {
              setAvatarPreview(settings.avatar_url);
            }
            
            setNotifications(settings.notifications);
            setDarkMode(settings.theme === 'dark');
            setSelectedLanguage(settings.language);
          }
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
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

  // Gérer la sélection de fichier avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un fichier image (JPG, PNG, GIF, WEBP)",
          variant: "destructive",
        });
        return;
      }

      // Vérifier la taille du fichier (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 2MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      
      // Créer une prévisualisation
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    }
  };

  // Uploader l'avatar
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;

    setUploadingAvatar(true);
    try {
      // S'assurer que le bucket 'avatars' existe
      await createStorageBucketIfNotExists('avatars');

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName; // Pas besoin du préfixe 'avatars/' car c'est le nom du bucket

      // Upload du fichier
      const uploadResult = await uploadFile('avatars', filePath, avatarFile);
      
      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Obtenir l'URL publique
      const publicUrl = await getFileUrl('avatars', filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader la photo de profil",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Mettre à jour le profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setSaving(true);
    try {
      let avatarUrl = userSettings?.avatar_url;

      // Uploader la nouvelle photo si elle a été sélectionnée
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // Mettre à jour les paramètres dans Supabase
      await updateUserSettings(user.id, {
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        phone: profileForm.phone,
        bio: profileForm.bio,
        avatar_url: avatarUrl
      });
      
      // Mettre à jour le state local
      if (userSettings) {
        setUserSettings({
          ...userSettings,
          first_name: profileForm.firstName,
          last_name: profileForm.lastName,
          phone: profileForm.phone,
          bio: profileForm.bio,
          avatar_url: avatarUrl
        });
      }

      // Réinitialiser le fichier sélectionné
      setAvatarFile(null);

      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
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
      console.error('Error updating password:', error);
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
      console.error('Error updating notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour vos préférences de notification",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour le thème
  const handleThemeChange = async (isDark: boolean) => {
    if (!user?.id || !userSettings) return;
    
    setDarkMode(isDark);
    try {
      const newTheme = isDark ? 'dark' : 'light';
      
      await updateUserSettings(user.id, {
        theme: newTheme
      });
      
      // Mettre à jour le state local
      setUserSettings({
        ...userSettings,
        theme: newTheme
      });
      
      // Appliquer le thème à l'application via le contexte
      setTheme(newTheme);
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  // Mettre à jour la langue
  const handleLanguageChange = async (lang: Language) => {
    if (!user?.id || !userSettings) return;
    
    setSelectedLanguage(lang);
    try {
      await updateUserSettings(user.id, {
        language: lang
      });
      
      // Mettre à jour le state local
      setUserSettings({
        ...userSettings,
        language: lang
      });
      
      // Mettre à jour la langue dans l'application
      setLanguage(lang);
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  // Fonction pour charger les fiches informatives
  const loadTaskInfoSheets = async () => {
    if (!isAdmin) {
      console.log('Non autorisé à charger les fiches informatives (non admin)');
      return;
    }
    
    console.log('Tentative de chargement des fiches informatives');
    setInfoSheetLoading(true);
    try {
      console.log('Appel API: fetchData sur task_info_sheets');
      const data = await fetchData<TaskInfoSheet>('task_info_sheets', {
        columns: '*',
      });
      
      console.log('Résultat de la requête task_info_sheets:', data);
      
      if (data) {
        setTaskInfoSheets(data);
        console.log(`${data.length} fiches informatives chargées`);
      } else {
        console.log('Aucune fiche informative trouvée ou erreur de chargement');
      }
    } catch (error) {
      console.error('Erreur détaillée lors du chargement des fiches informatives:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fiches informatives",
        variant: "destructive",
      });
    } finally {
      setInfoSheetLoading(false);
    }
  };
  
  // Charger les fiches informatives au démarrage
  useEffect(() => {
    if (isAdmin) {
      loadTaskInfoSheets();
    }
  }, [isAdmin, user]);
  
  // Obtenir la fiche informative pour une tâche
  const getInfoSheet = (phase: string, section: string, subsection: string, task: string, lang: string = 'fr') => {
    return taskInfoSheets.find(
      sheet => 
        sheet.phase_id === phase && 
        sheet.section_id === section && 
        sheet.subsection_id === subsection && 
        sheet.task_name === task &&
        sheet.language === lang
    );
  };
  
  // Manipuler les changements de sélection de tâche
  const handleTaskSelection = (phase: 'conception' | 'realisation', section: string, subsection: string, task: string) => {
    setSelectedPhase(phase);
    setSelectedSection(section);
    setSelectedSubsection(subsection);
    setSelectedTask(task);
    
    // Afficher le contenu de la fiche dans la langue sélectionnée
    const infoSheet = getInfoSheet(phase, section, subsection, task, selectedInfoSheetLanguage);
    if (infoSheet) {
      setInfoSheetText(infoSheet.info_sheet);
    } else {
      setInfoSheetText('');
    }
  };
  
  const handleInfoSheetLanguageChange = (lang: Language) => {
    setSelectedInfoSheetLanguage(lang);
    
    // Mettre à jour le contenu avec la fiche dans la langue sélectionnée
    if (selectedTask) {
      const infoSheet = getInfoSheet(selectedPhase, selectedSection, selectedSubsection, selectedTask, lang);
      if (infoSheet) {
        setInfoSheetText(infoSheet.info_sheet);
      } else {
        setInfoSheetText('');
      }
    }
  };
  
  // Sauvegarder la fiche informative
  const handleSaveInfoSheet = async () => {
    if (!selectedTask || !user || !user.id) {
      console.error('Impossible de sauvegarder: tâche non sélectionnée ou utilisateur non défini');
      return;
    }
    
    setInfoSheetLoading(true);
    
    try {
      console.log('Tentative de sauvegarde pour:', {
        phase: selectedPhase,
        section: selectedSection,
        subsection: selectedSubsection,
        task: selectedTask,
        language: selectedInfoSheetLanguage,
        userId: user.id
      });
      
      const existingInfoSheet = getInfoSheet(selectedPhase, selectedSection, selectedSubsection, selectedTask, selectedInfoSheetLanguage);
      
      if (existingInfoSheet) {
        console.log('Mise à jour de la fiche existante:', existingInfoSheet.id);
        // Mettre à jour la fiche existante
        const result = await updateData('task_info_sheets', {
          id: existingInfoSheet.id,
          info_sheet: infoSheetText
        });
        
        console.log('Résultat de la mise à jour:', result);
        
        if (result) {
          // Mettre à jour la liste locale
          setTaskInfoSheets(prev => 
            prev.map(sheet => 
              sheet.id === existingInfoSheet.id 
                ? { ...sheet, info_sheet: infoSheetText, updated_at: new Date().toISOString() }
                : sheet
            )
          );
          
          toast({
            title: "Succès",
            description: "Fiche informative mise à jour avec succès"
          });
        } else {
          console.error('Erreur lors de la mise à jour:', result);
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour la fiche informative",
            variant: "destructive",
          });
        }
      } else {
        console.log('Création d\'une nouvelle fiche informative');
        // Créer une nouvelle fiche
        const newInfoSheet: TaskInfoSheet = {
          phase_id: selectedPhase,
          section_id: selectedSection,
          subsection_id: selectedSubsection,
          task_name: selectedTask,
          info_sheet: infoSheetText,
          language: selectedInfoSheetLanguage,
          created_by: user.id
        };
        
        const result = await insertData('task_info_sheets', newInfoSheet);
        console.log('Résultat de l\'insertion:', result);
        
        if (result && result.id) {
          // Ajouter la nouvelle fiche à la liste locale
          setTaskInfoSheets(prev => [...prev, { 
            ...newInfoSheet, 
            id: result.id, 
            created_at: result.created_at || new Date().toISOString(), 
            updated_at: result.updated_at || new Date().toISOString() 
          }]);
          
          toast({
            title: "Succès",
            description: "Fiche informative créée avec succès"
          });
        } else {
          console.error('Erreur: Résultat d\'insertion invalide ou ID manquant:', result);
          toast({
            title: "Erreur",
            description: "La fiche a été créée mais il y a eu un problème avec l'ID retourné",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la fiche informative:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la fiche informative",
        variant: "destructive",
      });
    } finally {
      setInfoSheetLoading(false);
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
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white">
            <Sun className="h-4 w-4 mr-2" />
            Apparence
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="project-settings" className="data-[state=active]:bg-white">
              <ClipboardList className="h-4 w-4 mr-2" />
              Paramètres des projets
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
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={avatarPreview || ""} />
                        <AvatarFallback className="text-xl bg-aphs-navy text-white">
                          {profileForm.firstName.charAt(0)}{profileForm.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        {avatarFile ? 'Changer' : 'Ajouter une photo'}
                      </Button>
                      {avatarFile && (
                        <p className="text-xs text-gray-500">
                          {avatarFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input 
                          id="firstName"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input 
                          id="lastName"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email"
                          value={profileForm.email}
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input 
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input 
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
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

        {/* Onglet Apparence */}
        <TabsContent value="appearance">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode sombre</Label>
                  <p className="text-muted-foreground text-sm">
                    Basculer entre le mode clair et le mode sombre.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={darkMode}
                    onCheckedChange={handleThemeChange}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Langue</Label>
                  <p className="text-muted-foreground text-sm">
                    Choisissez la langue de l'interface.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedLanguage === 'fr' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleLanguageChange('fr')}
                    className="flex items-center gap-1"
                  >
                    🇫🇷 Français
                  </Button>
                  <Button 
                    variant={selectedLanguage === 'en' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleLanguageChange('en')}
                    className="flex items-center gap-1"
                  >
                    🇬🇧 English
                  </Button>
                  <Button 
                    variant={selectedLanguage === 'es' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleLanguageChange('es')}
                    className="flex items-center gap-1"
                  >
                    🇪🇸 Español
                  </Button>
                  <Button 
                    variant={selectedLanguage === 'ar' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleLanguageChange('ar')}
                    className="flex items-center gap-1"
                  >
                    🇸🇦 العربية
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Paramètres des projets (admin seulement) */}
        {isAdmin && (
          <TabsContent value="project-settings">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Fiches informatives des tâches</CardTitle>
                <CardDescription>
                  Définissez les instructions détaillées pour chaque tâche de la structure des projets.
                  Ces fiches seront visibles par les intervenants lors de l'exécution des tâches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Structure des projets</h3>
                    <p className="text-sm text-gray-500">
                      Sélectionnez une tâche pour définir sa fiche informative
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={selectedPhase === 'conception' ? 'default' : 'outline'} 
                      onClick={() => setSelectedPhase('conception')}
                      size="sm"
                    >
                      Phase Conception
                    </Button>
                    <Button 
                      variant={selectedPhase === 'realisation' ? 'default' : 'outline'} 
                      onClick={() => setSelectedPhase('realisation')}
                      size="sm"
                    >
                      Phase Réalisation
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b font-medium">
                      Structure des tâches
                    </div>
                    <div className="max-h-[500px] overflow-y-auto p-2">
                      <Accordion type="multiple" className="w-full">
                        {(selectedPhase === 'conception' ? projectStructure : realizationStructure).map((section) => (
                          <AccordionItem key={section.id} value={section.id} className="border rounded-md mb-4">
                            <AccordionTrigger className="px-3 py-2 hover:bg-gray-50">
                              <div className="flex items-center">
                                <span className="font-bold text-gray-700 mr-2">{section.id} -</span>
                                <span className="font-medium">{section.title}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                              <div className="space-y-1 p-2">
                                {section.items.map((item) => (
                                  <Accordion type="multiple" key={item.id}>
                                    <AccordionItem value={item.id} className="border rounded-md mb-2">
                                      <AccordionTrigger className="px-3 py-2 hover:bg-gray-50">
                                        <div className="flex items-center text-sm">
                                          <span className="font-semibold text-gray-700 mr-2">{item.id}</span>
                                          <span>{item.title}</span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="p-0">
                                        <ul className="p-3 bg-gray-50">
                                          {item.tasks.map((task, index) => {
                                            const infoSheet = getInfoSheet(selectedPhase, section.id, item.id, task, selectedInfoSheetLanguage);
                                            return (
                                              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                <div className="flex items-center">
                                                  <span className="text-sm">{task}</span>
                                                </div>
                                                <div>
                                                  <Button 
                                                    variant={
                                                      (selectedTask === task && 
                                                       selectedSection === section.id && 
                                                       selectedSubsection === item.id && 
                                                       selectedPhase === selectedPhase) 
                                                        ? 'default' 
                                                        : 'outline'
                                                    } 
                                                    size="sm"
                                                    onClick={() => handleTaskSelection(selectedPhase, section.id, item.id, task)}
                                                    className="h-7 text-xs"
                                                  >
                                                    {infoSheet ? 'Modifier' : 'Définir'} la fiche
                                                  </Button>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 border rounded-md font-medium">
                      Contenu de la fiche informative
                    </div>
                    {selectedTask ? (
                      <div className="space-y-3">
                        <div className="bg-white border rounded-md p-3">
                          <p className="text-gray-800 mb-2 font-medium">
                            {selectedPhase === 'conception' ? 'Phase Conception' : 'Phase Réalisation'} &gt; {selectedSection} &gt; {selectedSubsection} &gt; {selectedTask}
                          </p>
                          <div className="border-t pt-2">
                            <p className="text-sm text-gray-500 mb-1">
                              Cette fiche informative s'affichera à tous les intervenants assignés à cette tâche.
                            </p>
                          </div>
                        </div>
                        
                        {/* Sélection de la langue pour la fiche */}
                        <div className="bg-white border rounded-md p-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Langue de la fiche informative</Label>
                            <div className="flex gap-2">
                              <Button 
                                variant={selectedInfoSheetLanguage === 'fr' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => handleInfoSheetLanguageChange('fr')}
                                className="flex items-center gap-1"
                              >
                                🇫🇷 Français
                              </Button>
                              <Button 
                                variant={selectedInfoSheetLanguage === 'en' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => handleInfoSheetLanguageChange('en')}
                                className="flex items-center gap-1"
                              >
                                🇬🇧 English
                              </Button>
                              <Button 
                                variant={selectedInfoSheetLanguage === 'es' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => handleInfoSheetLanguageChange('es')}
                                className="flex items-center gap-1"
                              >
                                🇪🇸 Español
                              </Button>
                              <Button 
                                variant={selectedInfoSheetLanguage === 'ar' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => handleInfoSheetLanguageChange('ar')}
                                className="flex items-center gap-1"
                              >
                                🇸🇦 العربية
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <Textarea
                          placeholder="Décrivez en détail ce qui est attendu pour cette tâche (objectifs, méthodologie, livrables précis...)"
                          value={infoSheetText}
                          onChange={(e) => setInfoSheetText(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleSaveInfoSheet}
                            disabled={infoSheetLoading || !infoSheetText}
                            className="flex items-center gap-2"
                          >
                            {infoSheetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Enregistrer la fiche en {selectedInfoSheetLanguage === 'fr' ? 'français' : 
                                                   selectedInfoSheetLanguage === 'en' ? 'anglais' : 
                                                   selectedInfoSheetLanguage === 'es' ? 'espagnol' : 'arabe'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-6 rounded-md text-center text-gray-500">
                        Sélectionnez une tâche dans l'arborescence pour définir sa fiche informative
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
