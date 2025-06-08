import React, { useState, useEffect } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { Profile, IntervenantFormData, SPECIALTIES, USER_ROLES, USER_STATUSES } from '../types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Mail, Phone, Building } from 'lucide-react';

const ProfilesExample: React.FC = () => {
  const {
    loading,
    getProfiles,
    createIntervenant,
    updateProfile,
    deleteProfile,
    searchProfiles,
    getIntervenants
  } = useProfiles();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newIntervenantForm, setNewIntervenantForm] = useState<IntervenantFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    specialty: '',
    company: 'Indépendant',
    company_id: ''
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const profilesData = await getProfiles();
    setProfiles(profilesData);
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const searchResults = await searchProfiles(term);
      setProfiles(searchResults);
    } else {
      loadProfiles();
    }
  };

  const handleCreateIntervenant = async () => {
    const result = await createIntervenant(newIntervenantForm);
    if (result.profile) {
      setIsCreateDialogOpen(false);
      setNewIntervenantForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        specialty: '',
        company: 'Indépendant',
        company_id: ''
      });
      loadProfiles();
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedProfile) return;
    
    const result = await updateProfile(selectedProfile.id, {
      first_name: selectedProfile.first_name,
      last_name: selectedProfile.last_name,
      email: selectedProfile.email,
      phone: selectedProfile.phone,
      specialty: selectedProfile.specialty,
      company: selectedProfile.company,
      bio: selectedProfile.bio,
      status: selectedProfile.status
    });
    
    if (result) {
      setIsEditDialogOpen(false);
      setSelectedProfile(null);
      loadProfiles();
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce profil ?')) {
      const success = await deleteProfile(profileId);
      if (success) {
        loadProfiles();
      }
    }
  };

  const handleLoadIntervenants = async () => {
    const intervenants = await getIntervenants();
    setProfiles(intervenants);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'intervenant': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Profils & Intervenants</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher des profils..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleLoadIntervenants}>
            Intervenants
          </Button>
          <Button variant="outline" onClick={loadProfiles}>
            Tous
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel intervenant
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{profile.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getRoleBadgeColor(profile.role)}>
                        {USER_ROLES.find(r => r.value === profile.role)?.label || profile.role}
                      </Badge>
                      <Badge className={getStatusBadgeColor(profile.status)}>
                        {USER_STATUSES.find(s => s.value === profile.status)?.label || profile.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProfile(profile);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteProfile(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                  
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="h-4 w-4" />
                    <span>{profile.company}</span>
                  </div>
                  
                  {profile.specialty && (
                    <div className="text-sm">
                      <span className="font-medium">Spécialité:</span>
                      <p className="text-gray-600 mt-1">{profile.specialty}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Créé le {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Créer un nouvel intervenant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={newIntervenantForm.firstName}
                  onChange={(e) => setNewIntervenantForm({ ...newIntervenantForm, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={newIntervenantForm.lastName}
                  onChange={(e) => setNewIntervenantForm({ ...newIntervenantForm, lastName: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newIntervenantForm.email}
                onChange={(e) => setNewIntervenantForm({ ...newIntervenantForm, email: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={newIntervenantForm.password}
                onChange={(e) => setNewIntervenantForm({ ...newIntervenantForm, password: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="specialty">Spécialité</Label>
              <Select value={newIntervenantForm.specialty} onValueChange={(value) => setNewIntervenantForm({ ...newIntervenantForm, specialty: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une spécialité" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                value={newIntervenantForm.company}
                onChange={(e) => setNewIntervenantForm({ ...newIntervenantForm, company: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateIntervenant}>
              Créer l'intervenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName">Prénom</Label>
                  <Input
                    id="edit-firstName"
                    value={selectedProfile.first_name}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, first_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName">Nom</Label>
                  <Input
                    id="edit-lastName"
                    value={selectedProfile.last_name}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, last_name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-specialty">Spécialité</Label>
                <Select value={selectedProfile.specialty || ''} onValueChange={(value) => setSelectedProfile({ ...selectedProfile, specialty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select value={selectedProfile.status} onValueChange={(value: any) => setSelectedProfile({ ...selectedProfile, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateProfile}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilesExample; 