import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Users, Briefcase, Trash2, Settings } from 'lucide-react';
import { useWorkGroups, WorkGroupWithMessaging } from '../hooks/useWorkGroups';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
 
const WorkGroups: React.FC = () => {
  const { toast } = useToast();
  const { workGroups, loading, createWorkGroup, updateWorkGroup, deleteWorkGroup } = useWorkGroups();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkGroupWithMessaging | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });
 
  // Filtrer les groupes
  const filteredGroups = workGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
 
  // Ouvrir le dialogue de création
  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', status: 'active' });
    setCreateDialogOpen(true);
  };
 
  // Ouvrir le dialogue d'édition
  const handleOpenEdit = (group: WorkGroupWithMessaging) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      status: group.status as 'active' | 'inactive'
    });
    setEditDialogOpen(true);
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
    
    await createWorkGroup(formData.name, formData.description);
    setCreateDialogOpen(false);
    setFormData({ name: '', description: '', status: 'active' });
  };
 
  // Soumettre la modification
  const handleUpdate = async () => {
    if (!selectedGroup) return;
    
    await updateWorkGroup(selectedGroup.id, {
      name: formData.name,
      description: formData.description,
      status: formData.status
    });
    setEditDialogOpen(false);
    setSelectedGroup(null);
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
                    <Badge className={getStatusColor(group.status)}>
                      {getStatusLabel(group.status)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(group)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      className="text-red-500 hover:text-red-700"
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
 
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Briefcase className="h-4 w-4" />
                  <span>{group.projects?.length || 0} projet(s)</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
 
      {/* Dialogue de création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un groupe de travail</DialogTitle>
            <DialogDescription>
              Créez un nouveau groupe pour organiser votre travail
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du groupe *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Équipe Conception"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez les objectifs du groupe..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Dialogue d'édition */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le groupe</DialogTitle>
            <DialogDescription>
              Modifiez les informations du groupe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom du groupe *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Équipe Conception"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez les objectifs du groupe..."
                rows={3}
              />
            </div>
 
            <div className="space-y-2">
              <Label htmlFor="edit-status">Statut</Label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
 
export default WorkGroups;