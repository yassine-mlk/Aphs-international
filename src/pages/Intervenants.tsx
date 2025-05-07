import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateUserForm from "@/components/CreateUserForm";
import EditUserForm from "@/components/EditUserForm";
import { useSupabase, SPECIALTIES } from '../hooks/useSupabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUpDown } from "lucide-react";

// Type pour un intervenant
interface Intervenant {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  company?: string;
  status: 'active' | 'inactive';
  joinDate: string;
  joinDateRaw: Date; // Pour le tri
}

// Type pour les données d'utilisateur de Supabase
interface SupabaseUser {
  id: string;
  email: string;
  created_at: string;
  banned?: boolean;
  user_metadata?: {
    role?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    specialty?: string;
    company?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Type pour les options de tri
type SortField = 'name' | 'date' | 'specialty';
type SortOrder = 'asc' | 'desc';

const Intervenants: React.FC = () => {
  const { toast } = useToast();
  const { getUsers, adminDeleteUser } = useSupabase();
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntervenant, setSelectedIntervenant] = useState<Intervenant | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Options de tri et filtrage
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('');

  useEffect(() => {
    fetchIntervenants();
  }, []);

  const fetchIntervenants = async () => {
    setLoading(true);
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        // Transformer les données des utilisateurs en format Intervenant
        const formattedUsers: Intervenant[] = (userData.users as SupabaseUser[])
          .filter(user => {
            // Exclure explicitement admin@aphs et tout utilisateur avec le rôle admin
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email.toLowerCase() === 'admin@aphs.fr' || 
                                user.email.toLowerCase() === 'admin@aphs.com' || 
                                user.email.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail;
          })
          .map(user => {
            const joinDateRaw = new Date(user.created_at);
            
            return {
              id: user.id,
              name: user.user_metadata?.name || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              email: user.email || '',
              phone: user.user_metadata?.phone || '',
              role: user.user_metadata?.role || 'intervenant',
              specialty: user.user_metadata?.specialty || '',
              company: user.user_metadata?.company || 'Indépendant',
              status: user.banned ? 'inactive' as const : 'active' as const,
              joinDate: joinDateRaw.toLocaleDateString('fr-FR'),
              joinDateRaw
            };
          });
        
        setIntervenants(formattedUsers);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id: string) => {
    // À implémenter avec Supabase
    // API bannir/débannir un utilisateur
    toast({
      title: "Information",
      description: "La modification du statut sera bientôt disponible",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { success, error } = await adminDeleteUser(id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "L'intervenant a été supprimé avec succès",
        });
        
        // Rafraîchir la liste des intervenants
        fetchIntervenants();
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'intervenant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'intervenant. Veuillez réessayer.",
        variant: "destructive",
      });
    }
    
    // Fermer la boîte de dialogue
    setDeleteDialogOpen(false);
    setSelectedIntervenant(null);
  };
  
  // Helper pour obtenir le nom complet
  const getDisplayName = (intervenant: Intervenant) => {
    if (intervenant.first_name && intervenant.last_name) {
      return `${intervenant.first_name} ${intervenant.last_name}`;
    }
    return intervenant.name || 'Sans nom';
  };

  // Préparer la suppression d'un intervenant
  const prepareDelete = (intervenant: Intervenant) => {
    setSelectedIntervenant(intervenant);
    setDeleteDialogOpen(true);
  };
  
  // Préparer la modification d'un intervenant
  const prepareEdit = (intervenant: Intervenant) => {
    setSelectedIntervenant(intervenant);
    setEditDialogOpen(true);
  };

  // Inversion de l'ordre de tri lorsqu'on clique sur le même champ
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Fermer le dialogue après avoir ajouté ou modifié un utilisateur
  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedIntervenant(null);
    // Recharger la liste des utilisateurs
    fetchIntervenants();
  };

  // Fusion du filtrage et du tri en une seule opération
  const filteredAndSortedIntervenants = useMemo(() => {
    // Étape 1: Filtrer par terme de recherche
    let result = intervenants.filter(
      intervenant => 
        (getDisplayName(intervenant).toLowerCase().includes(searchTerm.toLowerCase())) || 
        intervenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (intervenant.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );

    // Étape 2: Filtrer par spécialité si sélectionnée
    if (specialtyFilter && specialtyFilter !== 'all') {
      result = result.filter(intervenant => intervenant.specialty === specialtyFilter);
    }

    // Étape 3: Trier selon le champ et l'ordre sélectionnés
    const sortedResult = [...result].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = getDisplayName(a).localeCompare(getDisplayName(b));
      } else if (sortField === 'date') {
        comparison = a.joinDateRaw.getTime() - b.joinDateRaw.getTime();
      } else if (sortField === 'specialty') {
        comparison = (a.specialty || '').localeCompare(b.specialty || '');
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sortedResult;
  }, [intervenants, searchTerm, specialtyFilter, sortField, sortOrder]);

  // Liste unique des spécialités présentes dans les intervenants pour le filtre
  const availableSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    intervenants.forEach(intervenant => {
      if (intervenant.specialty) {
        specialties.add(intervenant.specialty);
      }
    });
    return Array.from(specialties).sort();
  }, [intervenants]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intervenants</h1>
          <p className="text-muted-foreground">
            Gérez les comptes des intervenants de votre plateforme.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">Ajouter un intervenant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel intervenant</DialogTitle>
              <DialogDescription>
                Créez un compte pour un nouvel intervenant. Celui-ci pourra ensuite se connecter avec ces identifiants.
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Rechercher un intervenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <Select 
              value={specialtyFilter} 
              onValueChange={setSpecialtyFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Toutes spécialités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {availableSpecialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('name')}
              className={sortField === 'name' ? 'border-teal-500' : ''}
            >
              Nom
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'name' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('date')}
              className={sortField === 'date' ? 'border-teal-500' : ''}
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'date' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('specialty')}
              className={sortField === 'specialty' ? 'border-teal-500' : ''}
            >
              Spécialité
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'specialty' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <span className="text-sm text-gray-500">
          {filteredAndSortedIntervenants.length} intervenants
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900">Nom</th>
                <th className="px-4 py-3 font-medium text-gray-900">Email</th>
                <th className="px-4 py-3 font-medium text-gray-900">Entreprise</th>
                <th className="px-4 py-3 font-medium text-gray-900">Spécialité</th>
                <th className="px-4 py-3 font-medium text-gray-900">Date d'ajout</th>
                <th className="px-4 py-3 font-medium text-gray-900">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedIntervenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500">
                    Aucun intervenant trouvé
                  </td>
                </tr>
              ) : (
                filteredAndSortedIntervenants.map((intervenant) => (
                  <tr key={intervenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{getDisplayName(intervenant)}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.email}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.company || 'Indépendant'}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.specialty || 'Non spécifié'}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.joinDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        intervenant.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {intervenant.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      <button
                        onClick={() => prepareEdit(intervenant)}
                        className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        Modifier
                      </button>
                      <button 
                        onClick={() => toggleStatus(intervenant.id)}
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          intervenant.status === 'active'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {intervenant.status === 'active' ? 'Désactiver' : 'Activer'}
                      </button>
                      <button 
                        onClick={() => prepareDelete(intervenant)}
                        className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogue de modification */}
      {selectedIntervenant && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifier l'intervenant</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'intervenant ainsi que son mot de passe si nécessaire.
              </DialogDescription>
            </DialogHeader>
            <EditUserForm 
              userId={selectedIntervenant.id}
              userData={{
                email: selectedIntervenant.email,
                role: selectedIntervenant.role,
                first_name: selectedIntervenant.first_name,
                last_name: selectedIntervenant.last_name,
                specialty: selectedIntervenant.specialty,
                company: selectedIntervenant.company
              }}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'intervenant {selectedIntervenant ? getDisplayName(selectedIntervenant) : ''} ?
              <br />
              Cette action est irréversible et supprimera définitivement cet utilisateur et toutes ses données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedIntervenant(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedIntervenant && handleDelete(selectedIntervenant.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Intervenants;
