import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { notifyMemberAdded } from '@/lib/notifications';
import { 
  Users, 
  UserPlus,
  Trash2,
  Eye,
  Mail,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  joined_at?: string;
  added_at?: string;
}

interface Intervenant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  specialty?: string;
  avatar_url?: string;
}

interface TaskAssignment {
  id: string;
  task_name: string;
  assigned_to: string[];
}

interface ProjectMembersTabProps {
  projectId: string;
  members: ProjectMember[];
  intervenantsInfo: Record<string, {
    email: string;
    first_name: string;
    last_name: string;
    company?: string;
    avatar_url?: string;
  }>;
  tenantId?: string | null;
  onMembersChanged: () => void;
}

const ProjectMembersTab: React.FC<ProjectMembersTabProps> = ({
  projectId,
  members,
  intervenantsInfo,
  tenantId,
  onMembersChanged
}) => {
  const { toast } = useToast();
  
  // État pour le dialog d'ajout de membres
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [tenantIntervenants, setTenantIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [selectedIntervenants, setSelectedIntervenants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // État pour le retrait de membre
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [memberAssignments, setMemberAssignments] = useState<TaskAssignment[]>([]);
  const [checkingAssignments, setCheckingAssignments] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // État pour voir les détails
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // IDs des membres actuels
  const currentMemberIds = useMemo(() =>
    new Set(members.map(m => m.user_id)),
    [members]
  );

  // Intervenants disponibles (du tenant, pas encore membres)
  const availableIntervenants = useMemo(() => {
    return tenantIntervenants.filter(i => !currentMemberIds.has(i.user_id));
  }, [tenantIntervenants, currentMemberIds]);

  // Intervenants filtrés par recherche
  const filteredIntervenants = useMemo(() => {
    if (!searchQuery) return availableIntervenants;
    const q = searchQuery.toLowerCase();
    return availableIntervenants.filter(i =>
      i.first_name?.toLowerCase().includes(q) ||
      i.last_name?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      (i.specialty && i.specialty.toLowerCase().includes(q)) ||
      (i.company && i.company.toLowerCase().includes(q))
    );
  }, [availableIntervenants, searchQuery]);

  // Charger les intervenants du tenant
  const fetchTenantIntervenants = async () => {
    if (!tenantId) {
      // Si pas de tenantId, charger tous les intervenants
      setLoadingIntervenants(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, company, specialty')
          .neq('role', 'admin')
          .neq('is_super_admin', true);

        if (error) throw error;
        // Mapper les profiles au format Intervenant
        const mapped = (data || []).map(p => ({
          user_id: p.user_id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          company: p.company,
          specialty: p.specialty,
          avatar_url: undefined
        }));
        setTenantIntervenants(mapped);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les intervenants',
          variant: 'destructive'
        });
      } finally {
        setLoadingIntervenants(false);
      }
      return;
    }

    setLoadingIntervenants(true);
    try {
      // Récupérer les intervenants du tenant via la colonne tenant_id
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, company, specialty')
        .eq('tenant_id', tenantId)
        .neq('role', 'admin')
        .neq('is_super_admin', true);

      if (error) throw error;
      // Mapper les profiles au format Intervenant
      const mapped = (data || []).map(p => ({
        user_id: p.user_id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        email: p.email || '',
        company: p.company,
        specialty: p.specialty,
        avatar_url: undefined
      }));
      setTenantIntervenants(mapped);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les intervenants du tenant',
        variant: 'destructive'
      });
    } finally {
      setLoadingIntervenants(false);
    }
  };

  // Ouvrir le dialog d'ajout
  const handleOpenAddDialog = () => {
    setSelectedIntervenants([]);
    setSearchQuery('');
    fetchTenantIntervenants();
    setIsAddDialogOpen(true);
  };

  // Ajouter les membres sélectionnés
  const handleAddMembers = async () => {
    if (selectedIntervenants.length === 0) return;

    setIsAdding(true);
    try {
      const newMembers = selectedIntervenants.map(userId => ({
        project_id: projectId,
        user_id: userId,
        role: 'membre',
        added_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('membre')
        .insert(newMembers);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `${selectedIntervenants.length} membre${selectedIntervenants.length > 1 ? 's' : ''} ajouté${selectedIntervenants.length > 1 ? 's' : ''} au projet`
      });

      // Envoyer une notification à chaque nouveau membre
      try {
        const addedMembers = tenantIntervenants.filter(i => selectedIntervenants.includes(i.user_id));
        for (const member of addedMembers) {
          await notifyMemberAdded({
            userId: member.user_id,
            projectName: 'Projet',
            addedByName: 'Administrateur',
            role: 'Intervenant',
          });
        }
      } catch (notifError) {
      }

      setIsAddDialogOpen(false);
      setSelectedIntervenants([]);
      onMembersChanged();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter les membres',
        variant: 'destructive'
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Vérifier les assignations d'un membre avant suppression
  const checkMemberAssignments = async (member: ProjectMember) => {
    setMemberToRemove(member);
    setCheckingAssignments(true);
    setIsRemoveDialogOpen(true);

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('id, task_name, assigned_to')
        .eq('project_id', projectId);

      if (error) throw error;

      // Filtrer les assignations où ce membre est assigné
      const memberTasks = (data || []).filter((task: any) =>
        task.assigned_to?.includes(member.user_id)
      );

      setMemberAssignments(memberTasks);
    } catch (error) {
      setMemberAssignments([]);
    } finally {
      setCheckingAssignments(false);
    }
  };

  // Supprimer un membre et ses assignations
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      // 1. Supprimer les assignations de ce membre
      for (const assignment of memberAssignments) {
        // Retirer le membre de la liste assigned_to
        const newAssignedTo = assignment.assigned_to.filter(
          id => id !== memberToRemove.user_id
        );

        if (newAssignedTo.length === 0) {
          // Plus personne n'est assigné, supprimer l'assignation
          await supabase
            .from('task_assignments')
            .delete()
            .eq('id', assignment.id);
        } else {
          // Mettre à jour la liste des assignés
          await supabase
            .from('task_assignments')
            .update({ assigned_to: newAssignedTo })
            .eq('id', assignment.id);
        }
      }

      // 2. Supprimer le membre du projet
      const { error } = await supabase
        .from('membre')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: memberAssignments.length > 0
          ? `Membre retiré et ${memberAssignments.length} assignation${memberAssignments.length > 1 ? 's' : ''} mise${memberAssignments.length > 1 ? 's' : ''} à jour`
          : 'Membre retiré du projet'
      });

      setIsRemoveDialogOpen(false);
      setMemberToRemove(null);
      setMemberAssignments([]);
      onMembersChanged();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le membre',
        variant: 'destructive'
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // Ouvrir les détails d'un membre
  const handleViewDetails = (member: ProjectMember) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membres du projet
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {members.length} membre{members.length > 1 ? 's' : ''}
              </p>
            </div>
            
            <Button onClick={handleOpenAddDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter des membres
            </Button>
          </div>

          <div className="space-y-3">
            {members.map((member) => {
              const info = intervenantsInfo[member.user_id];
              const initials = getInitials(info?.first_name, info?.last_name);
              const fullName = info 
                ? `${info.first_name || ''} ${info.last_name || ''}`.trim()
                : 'Utilisateur inconnu';
              
              return (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {info?.avatar_url && (
                        <AvatarImage src={info.avatar_url} alt={fullName} />
                      )}
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium">{fullName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        {info?.email || member.email || 'Email non disponible'}
                      </div>
                      {info?.company && (
                        <p className="text-sm text-gray-500">{info.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {member.role === 'admin' ? 'Administrateur' : 
                       member.role === 'viewer' ? 'Lecteur' : 'Membre'}
                    </Badge>
                    
                    <span className="text-sm text-gray-400">
                      Ajouté le {formatDate(member.added_at || member.joined_at)}
                    </span>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewDetails(member)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => checkMemberAssignments(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun membre dans ce projet</p>
              <Button className="mt-4" onClick={handleOpenAddDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter des membres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'ajout de membres */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter des membres au projet</DialogTitle>
            <DialogDescription>
              Sélectionnez les intervenants du tenant à ajouter comme membres du projet.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Input
              placeholder="Rechercher un intervenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {loadingIntervenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredIntervenants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {availableIntervenants.length === 0 ? (
                  <>
                    <p>Tous les intervenants du tenant sont déjà membres du projet.</p>
                    <p className="text-sm mt-2">Ajoutez d'abord des intervenants au tenant.</p>
                  </>
                ) : (
                  <p>Aucun intervenant ne correspond à votre recherche.</p>
                )}
              </div>
            ) : (
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {filteredIntervenants.map((intervenant) => {
                  const isSelected = selectedIntervenants.includes(intervenant.user_id);
                  return (
                    <label
                      key={intervenant.user_id}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                        isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIntervenants(prev => [...prev, intervenant.user_id]);
                          } else {
                            setSelectedIntervenants(prev => prev.filter(id => id !== intervenant.user_id));
                          }
                        }}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={intervenant.avatar_url} />
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {getInitials(intervenant.first_name, intervenant.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {intervenant.first_name} {intervenant.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{intervenant.email}</p>
                        {intervenant.specialty && (
                          <p className="text-xs text-gray-400">{intervenant.specialty}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedIntervenants.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <CheckCircle className="h-4 w-4" />
                {selectedIntervenants.length} sélectionné{selectedIntervenants.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedIntervenants.length === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter {selectedIntervenants.length > 0 && `(${selectedIntervenants.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de retrait */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {memberAssignments.length > 0 && <AlertTriangle className="h-5 w-5 text-orange-500" />}
              Retirer ce membre ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Voulez-vous vraiment retirer <strong>
                  {memberToRemove && intervenantsInfo[memberToRemove.user_id]
                    ? `${intervenantsInfo[memberToRemove.user_id].first_name} ${intervenantsInfo[memberToRemove.user_id].last_name}`
                    : 'ce membre'}
                </strong> du projet ?
              </p>

              {checkingAssignments ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification des assignations...
                </div>
              ) : memberAssignments.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Ce membre est assigné à {memberAssignments.length} tâche{memberAssignments.length > 1 ? 's' : ''}
                  </p>
                  <ul className="text-sm text-orange-700 space-y-1 max-h-32 overflow-y-auto">
                    {memberAssignments.map(task => (
                      <li key={task.id} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                        {task.task_name}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-orange-600 mt-2">
                    En confirmant, ce membre sera retiré de ces assignations.
                    {memberAssignments.some(t => t.assigned_to.length === 1) &&
                      " Les tâches où il était le seul assigné seront désassignées."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Ce membre n'a aucune assignation de tâche.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsRemoveDialogOpen(false);
              setMemberToRemove(null);
              setMemberAssignments([]);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving || checkingAssignments}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrait...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Retirer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de détails du membre */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails du membre</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="py-4">
              {(() => {
                const info = intervenantsInfo[selectedMember.user_id];
                const fullName = info
                  ? `${info.first_name || ''} ${info.last_name || ''}`.trim()
                  : 'Utilisateur inconnu';
                return (
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      {info?.avatar_url && (
                        <AvatarImage src={info.avatar_url} alt={fullName} />
                      )}
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                        {getInitials(info?.first_name, info?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{fullName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Mail className="h-4 w-4" />
                        {info?.email || selectedMember.email || 'Email non disponible'}
                      </div>
                      {info?.company && (
                        <p className="text-sm text-gray-500 mt-1">{info.company}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline">
                          {selectedMember.role === 'admin' ? 'Administrateur' :
                           selectedMember.role === 'viewer' ? 'Lecteur' : 'Membre'}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          Ajouté le {formatDate(selectedMember.added_at || selectedMember.joined_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMembersTab;
