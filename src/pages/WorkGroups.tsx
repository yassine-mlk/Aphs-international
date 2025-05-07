import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, MoreHorizontal, Briefcase, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSupabase, WorkGroup, WorkGroupMember, WorkGroupProject } from '../hooks/useSupabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Type pour un groupe de travail avec membres et projets
interface WorkGroupWithDetails extends WorkGroup {
  members: WorkGroupMember[];
  projects: WorkGroupProject[];
}

// Type pour un utilisateur récupéré depuis getUsers
interface UserFromAdmin {
  id: string;
  email: string;
  user_metadata?: {
    role?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    specialty?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Type pour un utilisateur filtré à afficher dans la liste
interface FilteredUser {
  id: string;
  email: string;
  name: string;
  specialty: string;
  isMember: boolean;
}

const WorkGroups: React.FC = () => {
  const { toast } = useToast();
  const { getWorkGroups, getWorkGroupMembers, getWorkGroupProjects, createWorkGroup, updateWorkGroup, deleteWorkGroup, addMembersToWorkGroup, removeMemberFromWorkGroup, getUsers, addProjectToWorkGroup, removeProjectFromWorkGroup } = useSupabase();
  
  const [workGroups, setWorkGroups] = useState<WorkGroupWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  
  // États pour le dialogue de création/modification
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkGroupWithDetails | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'actif',
  });
  
  // États pour le dialogue de gestion des membres
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<FilteredUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // États pour le dialogue de gestion des projets
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState("");
  
  // État pour le dialogue de confirmation de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Ajouter ces états pour la gestion des intervenants dans le formulaire de création
  const [availableUsersForCreate, setAvailableUsersForCreate] = useState<FilteredUser[]>([]);
  const [selectedUsersForCreate, setSelectedUsersForCreate] = useState<string[]>([]);
  const [userSearchQueryCreate, setUserSearchQueryCreate] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Charger les groupes au chargement du composant
  useEffect(() => {
    fetchWorkGroups();
    fetchAllUsers(); // Charger les informations utilisateur au démarrage
  }, []);

  // Fonction pour récupérer les groupes de travail
  const fetchWorkGroups = async () => {
    setLoading(true);
    try {
      const data = await getWorkGroups();
      
      if (data && data.workgroups) {
        // Pour chaque groupe, récupérer ses membres et projets
        const groupsWithDetails = await Promise.all(
          data.workgroups.map(async (group) => {
            const members = await getWorkGroupMembers(group.id);
            const projects = await getWorkGroupProjects(group.id);
            
            return {
              ...group,
              members,
              projects
            };
          })
        );
        
        setWorkGroups(groupsWithDetails);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes de travail:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les groupes de travail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer tous les utilisateurs
  const fetchAllUsers = async () => {
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        // Filtrer les admin et convertir les données
        const filteredUsers = (userData.users as UserFromAdmin[])
          .filter(user => {
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email.toLowerCase() === 'admin@aphs.fr' || 
                              user.email.toLowerCase() === 'admin@aphs.com' || 
                              user.email.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail;
          })
          .map(user => ({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email,
            specialty: user.user_metadata?.specialty || '',
            isMember: false
          }));
        
        setAvailableUsers(filteredUsers);
        setAvailableUsersForCreate(filteredUsers);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    }
  };

  // Filtrer les groupes selon le statut et la recherche
  const filteredGroups = workGroups.filter(group => {
    const matchesFilter = filter === "tous" || group.status === filter;
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Gestionnaire pour ouvrir le dialogue de création
  const handleCreateGroup = async () => {
    // Réinitialiser le formulaire
    setFormData({
      name: '',
      description: '',
      status: 'actif',
    });
    setSelectedUsersForCreate([]);
    setUserSearchQueryCreate("");
    
    // Charger la liste des intervenants disponibles
    setLoadingUsers(true);
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        // Filtrer les admin et convertir les données
        const filteredUsers = (userData.users as UserFromAdmin[])
          .filter(user => {
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email.toLowerCase() === 'admin@aphs.fr' || 
                              user.email.toLowerCase() === 'admin@aphs.com' || 
                              user.email.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail;
          })
          .map(user => ({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email,
            specialty: user.user_metadata?.specialty || '',
            isMember: false
          }));
        
        setAvailableUsersForCreate(filteredUsers);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des intervenants",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
    
    setCreateDialogOpen(true);
  };

  // Gestionnaire pour soumettre le formulaire de création
  const handleSubmitCreate = async () => {
    try {
      const result = await createWorkGroup({
        name: formData.name,
        description: formData.description,
        status: formData.status as 'actif' | 'inactif',
      });
      
      if (result && selectedUsersForCreate.length > 0) {
        // Ajouter les intervenants sélectionnés au groupe
        const success = await addMembersToWorkGroup(result.id, selectedUsersForCreate);
        
        if (!success) {
          toast({
            title: "Avertissement",
            description: "Le groupe a été créé mais certains intervenants n'ont pas pu être ajoutés",
            variant: "default",
          });
        }
      }
      
      // Rafraîchir la liste
      fetchWorkGroups();
      // Fermer le dialogue
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
    }
  };

  // Gestionnaire pour ouvrir le dialogue de modification
  const handleEditGroup = (group: WorkGroupWithDetails) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      status: group.status,
    });
    setEditDialogOpen(true);
  };

  // Gestionnaire pour soumettre le formulaire de modification
  const handleSubmitEdit = async () => {
    if (!selectedGroup) return;
    
    try {
      const result = await updateWorkGroup(selectedGroup.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status as 'actif' | 'inactif',
      });
      
      if (result) {
        // Rafraîchir la liste
        fetchWorkGroups();
        // Fermer le dialogue
        setEditDialogOpen(false);
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('Erreur lors de la modification du groupe:', error);
    }
  };

  // Gestionnaire pour préparer la suppression
  const handlePrepareDelete = (group: WorkGroupWithDetails) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  // Gestionnaire pour confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!selectedGroup) return;
    
    try {
      const success = await deleteWorkGroup(selectedGroup.id);
      
      if (success) {
        // Rafraîchir la liste
        fetchWorkGroups();
        toast({
          title: "Succès",
          description: "Groupe de travail supprimé avec succès",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du groupe:', error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  // Gestionnaire pour ouvrir le dialogue de gestion des membres
  const handleManageMembers = async (group: WorkGroupWithDetails) => {
    setSelectedGroup(group);
    setSelectedUsers([]);
    setUserSearchQuery("");
    
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        // Convertir les données utilisateur
        const allUsers = (userData.users as UserFromAdmin[])
          .filter(user => {
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email.toLowerCase() === 'admin@aphs.fr' || 
                          user.email.toLowerCase() === 'admin@aphs.com' || 
                          user.email.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail;
          })
          .map(user => ({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email,
            specialty: user.user_metadata?.specialty || '',
            // Vérifier si l'utilisateur est déjà membre en comparant les IDs
            isMember: group.members.some(member => member.user_id === user.id)
          }));
        
        setAvailableUsers(allUsers);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des intervenants",
        variant: "destructive",
      });
    }
    
    setMembersDialogOpen(true);
  };

  // Fonction pour ajouter des membres au groupe
  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;
    
    try {
      const success = await addMembersToWorkGroup(selectedGroup.id, selectedUsers);
      
      if (success) {
        // Rafraîchir la liste des groupes
        fetchWorkGroups();
        toast({
          title: "Succès",
          description: "Membres ajoutés au groupe de travail",
        });
        setMembersDialogOpen(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout des membres:', error);
    }
  };

  // Fonction pour retirer un membre du groupe
  const handleRemoveMember = async (memberId: string) => {
    try {
      const success = await removeMemberFromWorkGroup(memberId);
      
      if (success) {
        // Rafraîchir la liste des groupes
        fetchWorkGroups();
      }
    } catch (error) {
      console.error('Erreur lors du retrait du membre:', error);
    }
  };

  // Gestionnaire pour ouvrir le dialogue de gestion des projets
  const handleManageProjects = (group: WorkGroupWithDetails) => {
    setSelectedGroup(group);
    setNewProject('');
    setProjectsDialogOpen(true);
  };

  // Fonction pour ajouter un projet au groupe
  const handleAddProject = async () => {
    if (!selectedGroup || !newProject.trim()) return;
    
    try {
      const result = await addProjectToWorkGroup(selectedGroup.id, newProject.trim());
      
      if (result) {
        // Rafraîchir la liste des groupes
        fetchWorkGroups();
        // Réinitialiser le champ
        setNewProject('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du projet:', error);
    }
  };

  // Fonction pour supprimer un projet du groupe
  const handleRemoveProject = async (projectId: string) => {
    try {
      const success = await removeProjectFromWorkGroup(projectId);
      
      if (success) {
        // Rafraîchir la liste des groupes
        fetchWorkGroups();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
    }
  };

  // Filtrer les utilisateurs pour la recherche
  const filteredUsers = availableUsers.filter(user => 
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.specialty.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Filtrer les utilisateurs pour la recherche dans le formulaire de création
  const filteredUsersForCreate = availableUsersForCreate.filter(user => 
    user.email.toLowerCase().includes(userSearchQueryCreate.toLowerCase()) ||
    user.name.toLowerCase().includes(userSearchQueryCreate.toLowerCase()) ||
    user.specialty.toLowerCase().includes(userSearchQueryCreate.toLowerCase())
  );

  // Helper pour obtenir les initiales d'un nom
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Helper pour formater la date uniquement
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Rendu de la liste des membres
  const renderMembersList = (members: WorkGroupMember[], context: 'card' | 'dialog' = 'card') => {
    if (members.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          Aucun membre dans ce groupe
        </div>
      );
    }

    // Déterminer la source des informations utilisateur selon le contexte
    const usersList = context === 'dialog' ? availableUsers : 
                     (context === 'card' ? [...availableUsers, ...availableUsersForCreate] : []);

    return (
      <ul className="space-y-2">
        {members.map(member => {
          // Rechercher les infos utilisateur dans la liste appropriée
          const userInfo = usersList.find(user => user.id === member.user_id);
          
          return (
            <li key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback>
                    {userInfo ? getInitials(userInfo.name) : member.user_id.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {userInfo ? userInfo.name : `Utilisateur (${member.user_id.substring(0, 8)}...)`}
                  </div>
                  <div className="text-sm text-gray-500">{userInfo ? userInfo.email : member.role}</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleRemoveMember(member.id)}
              >
                Retirer
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groupes de travail</h1>
          <p className="text-muted-foreground">
            Gérez vos groupes d'intervenants et collaborations
          </p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Groupe
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un groupe..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="tous" className="w-full" onValueChange={setFilter}>
        <TabsList className="w-full justify-start bg-gray-100 p-0 h-auto">
          <TabsTrigger value="tous" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
            Tous
          </TabsTrigger>
          <TabsTrigger value="actif" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
            Actifs
          </TabsTrigger>
          <TabsTrigger value="inactif" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
            Inactifs
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Chargement des groupes de travail...</span>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map(group => (
              <Card key={group.id} className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge className={`
                      ${group.status === 'actif' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      ${group.status === 'inactif' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : ''}
                    `}>
                      {group.status === 'actif' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Membres du groupe */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Membres ({group.members.length})</h4>
                    {renderMembersList(group.members, 'card')}
                  </div>
                  
                  {/* Projets associés */}
                  {group.projects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Projets associés</h4>
                      <div className="flex flex-wrap gap-2">
                        {group.projects.map(project => (
                          <div key={project.id} className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1">
                            <Briefcase className="h-3 w-3 text-gray-600" />
                            <span className="text-xs">{project.project_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between py-3 px-6 border-t bg-gray-50 text-xs text-gray-500">
                  <span>Dernière activité: {formatDate(group.last_activity)}</span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Plus d'options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageMembers(group)}>
                        Gérer les membres
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageProjects(group)}>
                        Gérer les projets
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handlePrepareDelete(group)}
                        className="text-red-600"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredGroups.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Aucun groupe trouvé</h3>
              <p className="text-gray-500">Aucun groupe ne correspond à votre recherche ou au filtre sélectionné.</p>
            </div>
          )}
        </>
      )}

      {/* Dialogue de création de groupe */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Créer un nouveau groupe de travail</DialogTitle>
            <DialogDescription>
              Créez un groupe pour collaborer avec des intervenants
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du groupe</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du groupe de travail"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description des objectifs du groupe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Section pour sélectionner les intervenants */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Sélectionner les intervenants</h3>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher un intervenant..."
                  className="pl-8"
                  value={userSearchQueryCreate}
                  onChange={(e) => setUserSearchQueryCreate(e.target.value)}
                />
              </div>
              
              {loadingUsers ? (
                <div className="flex justify-center items-center h-[200px] border rounded-md">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-gray-500">Chargement des intervenants...</span>
                </div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {filteredUsersForCreate.length > 0 ? (
                    <div className="space-y-2">
                      {filteredUsersForCreate.map(user => (
                        <div key={user.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                          <Checkbox 
                            id={`create-user-${user.id}`} 
                            checked={selectedUsersForCreate.includes(user.id)} 
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsersForCreate([...selectedUsersForCreate, user.id]);
                              } else {
                                setSelectedUsersForCreate(selectedUsersForCreate.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <div className="flex flex-1 items-center">
                            <label 
                              htmlFor={`create-user-${user.id}`} 
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-blue-700 text-white text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p>{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                                {user.specialty && (
                                  <p className="text-xs text-gray-400">{user.specialty}</p>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-sm text-gray-500">Aucun intervenant trouvé.</p>
                  )}
                </ScrollArea>
              )}
              
              <div className="text-sm text-gray-500 mt-2">
                {selectedUsersForCreate.length > 0 ? (
                  <p>{selectedUsersForCreate.length} intervenant(s) sélectionné(s)</p>
                ) : (
                  <p>Aucun intervenant sélectionné</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleSubmitCreate} 
              disabled={!formData.name.trim()}
              className="flex items-center"
            >
              <Users className="mr-2 h-4 w-4" />
              Créer le groupe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de modification de groupe */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Modifier le groupe de travail</DialogTitle>
            <DialogDescription>
              Modifiez les informations du groupe de travail
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom du groupe</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du groupe de travail"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description des objectifs du groupe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEdit} disabled={!formData.name.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce groupe de travail ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de gestion des membres */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Gérer les membres du groupe</DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des intervenants de ce groupe de travail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Liste des membres actuels */}
            <div>
              <h3 className="text-sm font-medium mb-2">Membres actuels</h3>
              {renderMembersList(selectedGroup?.members || [], 'dialog')}
            </div>
            
            {/* Ajouter des membres */}
            <div>
              <h3 className="text-sm font-medium mb-2">Ajouter des intervenants</h3>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher un intervenant..."
                  className="pl-8"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map(user => (
                      <div key={user.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                        <Checkbox 
                          id={`user-${user.id}`} 
                          checked={selectedUsers.includes(user.id)} 
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          disabled={user.isMember}
                        />
                        <div className="flex flex-1 items-center justify-between">
                          <label 
                            htmlFor={`user-${user.id}`} 
                            className={`text-sm font-medium ${user.isMember ? 'text-gray-400' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-blue-700 text-white text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p>{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </label>
                          {user.isMember && (
                            <Badge variant="outline" className="text-xs py-0">Déjà membre</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-sm text-gray-500">Aucun intervenant trouvé.</p>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleAddMembers} 
              disabled={selectedUsers.length === 0}
              className="flex items-center"
            >
              <Users className="mr-2 h-4 w-4" />
              Ajouter les intervenants sélectionnés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de gestion des projets */}
      <Dialog open={projectsDialogOpen} onOpenChange={setProjectsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Gérer les projets du groupe</DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des projets associés à ce groupe de travail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Liste des projets actuels */}
            <div>
              <h3 className="text-sm font-medium mb-2">Projets associés</h3>
              <div className="border rounded-md overflow-hidden mb-4">
                {selectedGroup && selectedGroup.projects.length > 0 ? (
                  <div className="divide-y">
                    {selectedGroup.projects.map(project => (
                      <div key={project.id} className="flex justify-between items-center p-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-500" />
                          <span>{project.project_name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveProject(project.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 text-sm text-gray-500">Aucun projet associé à ce groupe.</p>
                )}
              </div>
            </div>
            
            {/* Ajouter un projet */}
            <div>
              <h3 className="text-sm font-medium mb-2">Ajouter un projet</h3>
              <div className="flex space-x-2">
                <Input
                  placeholder="Nom du projet"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddProject} disabled={!newProject.trim()}>Ajouter</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setProjectsDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkGroups;
