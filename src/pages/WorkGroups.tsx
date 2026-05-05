import React, { useState, useEffect, useMemo } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Search, 
  Users, 
  Briefcase, 
  Trash2, 
  Settings, 
  Check, 
  X, 
  UserPlus, 
  UserMinus,
  Mail,
  Shield
} from 'lucide-react';
import { useWorkGroups, WorkGroupWithMessaging, AvailableUser } from '../hooks/useWorkGroups';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { FeatureGate } from '@/components/ui/FeatureGate';

const WorkGroups: React.FC = () => {
  return (
    <FeatureGate feature="groups">
      <WorkGroupsContent />
    </FeatureGate>
  );
};

const WorkGroupsContent: React.FC = () => {
  const { toast } = useToast();
  const { user, status } = useAuth();
  const { 
    workGroups, 
    loading, 
    createWorkGroup, 
    updateWorkGroup, 
    deleteWorkGroup,
    addMembersToWorkGroup,
    removeMemberFromWorkGroup,
    getAvailableUsers
  } = useWorkGroups();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkGroupWithMessaging | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Synchroniser selectedGroup avec les données mises à jour de workGroups
  useEffect(() => {
    if (selectedGroup) {
      const updated = workGroups.find(g => g.id === selectedGroup.id);
      if (updated) {
        setSelectedGroup(updated);
      }
    }
  }, [workGroups, selectedGroup?.id]);

  // Charger les utilisateurs disponibles
  useEffect(() => {
    if (status === 'authenticated') {
      const loadUsers = async () => {
        const users = await getAvailableUsers();
        setAvailableUsers(users);
      };
      loadUsers();
    }
  }, [getAvailableUsers, status]);

  // Filtrer les utilisateurs disponibles pour la recherche
  const filteredAvailableUsers = useMemo(() => {
    return availableUsers.filter(user => 
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.specialty?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [availableUsers, userSearchQuery]);

  // Filtrer les membres actuels du groupe
  const currentMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.members || [];
  }, [selectedGroup]);

  // Filtrer les utilisateurs qui ne sont pas encore membres du groupe sélectionné
  const usersNotSelected = useMemo(() => {
    if (!selectedGroup) return filteredAvailableUsers;
    const memberUserIds = currentMembers.map(m => m.user_id);
    return filteredAvailableUsers.filter(user => !memberUserIds.includes(user.id));
  }, [filteredAvailableUsers, currentMembers, selectedGroup]);

  // Filtrer les groupes
  const filteredGroups = workGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
 
  // Ouvrir le dialogue de création
  const handleOpenCreate = () => {
    setFormData({ name: '', description: '' });
    setSelectedUserIds([]);
    setUserSearchQuery("");
    setCreateDialogOpen(true);
  };
 
  // Ouvrir le dialogue d'édition
  const handleOpenEdit = (group: WorkGroupWithMessaging) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || ''
    });
    setSelectedUserIds([]); // Reset selection when opening edit
    setUserSearchQuery("");
    setEditDialogOpen(true);
  };
 
  // Basculer la sélection d'un utilisateur (pour la création)
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  // Soumettre la création
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du groupe est requis',
        variant: 'destructive'
      });
      return;
    }
    
    // Créer le groupe avec les membres sélectionnés
    const workgroupId = await createWorkGroup(
      formData.name, 
      formData.description, 
      selectedUserIds
    );
    
    if (workgroupId) {
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      setSelectedUserIds([]);
    }
  };
 
  // Soumettre la modification des infos de base
  const handleUpdate = async () => {
    if (!selectedGroup) return;
    
    await updateWorkGroup(selectedGroup.id, {
      name: formData.name,
      description: formData.description
    });
    setEditDialogOpen(false);
    setSelectedGroup(null);
  };

  // Ajouter des membres à un groupe existant (version en vrac)
  const handleAddMembersBulk = async () => {
    if (!selectedGroup || selectedUserIds.length === 0) return;
    
    const success = await addMembersToWorkGroup(selectedGroup.id, selectedUserIds);
    if (success) {
      setSelectedUserIds([]); // Vider la sélection après ajout
      // Rafraîchir le groupe sélectionné
      const updatedGroup = workGroups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) setSelectedGroup(updatedGroup);
      
      toast({
        title: 'Succès',
        description: `${selectedUserIds.length} membre(s) ajouté(s) au groupe`,
      });
    }
  };

  // Supprimer un membre d'un groupe existant
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    
    const success = await removeMemberFromWorkGroup(memberId);
    if (success) {
      // Rafraîchir le groupe sélectionné
      const updatedGroup = workGroups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) setSelectedGroup(updatedGroup);
    }
  };
 
  // Supprimer un groupe
  const handleDelete = async (group: WorkGroupWithMessaging) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?`)) {
      await deleteWorkGroup(group.id);
    }
  };
 
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
 
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };
 
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
 
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groupes de travail</h1>
          <p className="text-muted-foreground">
            Gérez vos groupes de travail et collaborateurs
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau groupe
        </Button>
      </div>
 
      {/* Barre de recherche */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un groupe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredGroups.length} groupe(s)
        </div>
      </div>
 
      {/* Liste des groupes */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'Aucun résultat' : 'Aucun groupe'}
          </h3>
          <p className="text-gray-500">
            {searchQuery ? 'Aucun groupe ne correspond à votre recherche' : 'Créez votre premier groupe de travail'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-800 line-clamp-1">
                      {group.name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(group)}
                      title="Gérer les membres"
                    >
                      <UserPlus className="h-4 w-4 text-aps-teal" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(group)}
                      title="Paramètres"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      className="text-red-500 hover:text-red-700"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {group.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{group.members?.length || 0} membre(s)</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
 
      {/* Dialogue de création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Créer un groupe de travail</DialogTitle>
            <DialogDescription>
              Créez un nouveau groupe pour organiser votre travail et ajoutez des membres.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-y">
            {/* Colonne de gauche: Infos de base */}
            <div className="w-full md:w-1/2 p-6 space-y-4 border-b md:border-b-0 md:border-r overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Nom du groupe *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Équipe Conception"
                  className="border-gray-300 focus:ring-aps-teal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez les objectifs du groupe..."
                  rows={4}
                  className="border-gray-300 focus:ring-aps-teal resize-none"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  <p className="font-semibold mb-1">Information</p>
                  Les membres ajoutés recevront une notification et pourront accéder aux documents partagés dans ce groupe.
                </div>
              </div>
            </div>

            {/* Colonne de droite: Sélection des membres */}
            <div className="w-full md:w-1/2 flex flex-col bg-gray-50/50">
              <div className="p-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un intervenant..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 h-[350px]">
                <div className="p-2 space-y-1">
                  {filteredAvailableUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Aucun intervenant trouvé</p>
                    </div>
                  ) : (
                    filteredAvailableUsers.map((user) => (
                      <div 
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`
                          flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
                          ${selectedUserIds.includes(user.id) 
                            ? 'bg-aps-teal/10 border-aps-teal/20 border' 
                            : 'hover:bg-white border-transparent border hover:border-gray-200'}
                        `}
                      >
                        <Avatar className="h-8 w-8 border border-gray-200">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 font-normal capitalize">
                              {user.role}
                            </Badge>
                            {user.specialty && (
                              <span className="text-[10px] text-gray-500 truncate">{user.specialty}</span>
                            )}
                          </div>
                        </div>

                        <div className={`
                          flex items-center justify-center h-7 w-7 rounded-full border transition-all
                          ${selectedUserIds.includes(user.id) 
                            ? 'bg-aps-teal border-aps-teal text-white' 
                            : 'border-gray-300 text-gray-400 hover:border-aps-teal hover:text-aps-teal'}
                        `}>
                          {selectedUserIds.includes(user.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t bg-white flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>{selectedUserIds.length} membre(s) sélectionné(s)</span>
                {selectedUserIds.length > 0 && (
                  <button 
                    onClick={() => setSelectedUserIds([])}
                    className="text-aps-teal hover:underline"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-4 gap-2 bg-gray-50 rounded-b-lg">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="h-9">
              Annuler
            </Button>
            <SubmitButton onClick={handleCreate} disabled={!formData.name.trim()} className="h-9 bg-aps-navy hover:bg-aps-navy/90" loadingText="Création...">
              Créer le groupe
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Dialogue d'édition */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Modifier le groupe</DialogTitle>
            <DialogDescription>
              Gérez les informations et les membres du groupe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-y">
            {/* Colonne de gauche: Infos de base */}
            <div className="w-full md:w-1/3 p-6 space-y-6 border-b md:border-b-0 md:border-r overflow-y-auto bg-gray-50/30">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-700">Nom du groupe *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Équipe Conception"
                  className="bg-white border-gray-300 focus:ring-aps-teal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-700">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez les objectifs du groupe..."
                  rows={4}
                  className="bg-white border-gray-300 focus:ring-aps-teal resize-none"
                />
              </div>
  
              <div className="pt-4">
                <Button 
                  onClick={handleUpdate} 
                  disabled={!formData.name.trim()} 
                  className="w-full bg-aps-navy hover:bg-aps-navy/90 text-white"
                >
                  Enregistrer les infos
                </Button>
              </div>
            </div>

            {/* Colonne centrale: Membres actuels */}
            <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r bg-white">
              <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Membres actuels ({currentMembers.length})</h4>
              </div>
              <ScrollArea className="flex-1 h-[400px]">
                <div className="p-3 space-y-2">
                  {currentMembers.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Aucun membre dans ce groupe</p>
                    </div>
                  ) : (
                    currentMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 border border-gray-100">
                            <AvatarFallback className="bg-aps-teal/10 text-aps-teal text-[10px]">
                              {(member.user?.first_name?.[0] || member.user?.email?.[0] || '?').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {member.user?.first_name ? `${member.user.first_name} ${member.user.last_name || ''}` : member.user?.email}
                            </p>
                            <p className="text-[10px] text-gray-500 capitalize">{member.role}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Retirer du groupe"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Colonne de droite: Ajouter des membres */}
            <div className="w-full md:w-1/3 flex flex-col bg-gray-50/20">
              <div className="p-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Sélectionner des membres..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm border-gray-200"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 h-[350px]">
                <div className="p-3 space-y-1">
                  {usersNotSelected.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <Users className="h-10 w-10 text-gray-100 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Tous les intervenants sont membres</p>
                    </div>
                  ) : (
                    usersNotSelected.map((user) => (
                      <div 
                        key={user.id} 
                        onClick={() => toggleUserSelection(user.id)}
                        className={`
                          flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
                          ${selectedUserIds.includes(user.id) 
                            ? 'bg-aps-teal/10 border-aps-teal/20 border' 
                            : 'hover:bg-white border-transparent border hover:border-gray-200'}
                        `}
                      >
                        <Avatar className="h-8 w-8 border border-gray-100">
                          <AvatarFallback className="bg-gray-100 text-gray-500 text-[10px]">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user.specialty || user.role}</p>
                        </div>
                        <div className={`
                          flex items-center justify-center h-6 w-6 rounded-full border transition-all
                          ${selectedUserIds.includes(user.id) 
                            ? 'bg-aps-teal border-aps-teal text-white' 
                            : 'border-gray-300 text-gray-400'}
                        `}>
                          {selectedUserIds.includes(user.id) ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {selectedUserIds.length > 0 && (
                <div className="p-3 border-t bg-white">
                  <Button 
                    onClick={handleAddMembersBulk}
                    className="w-full bg-aps-teal hover:bg-aps-teal/90 text-white h-9 text-sm"
                  >
                    Ajouter {selectedUserIds.length} membre(s)
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 bg-gray-50 rounded-b-lg">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="h-9">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkGroups;