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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSupabase, Company } from '../hooks/useSupabase';
import CompanyForm from '@/components/CompanyForm';
import { ArrowUpDown, Building, Flag, Briefcase, Image } from "lucide-react";

// Type pour les options de tri
type SortField = 'name' | 'pays' | 'secteur' | 'created_at';
type SortOrder = 'asc' | 'desc';

const Companies: React.FC = () => {
  const { toast } = useToast();
  const { getCompanies, deleteCompany } = useSupabase();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Options de tri
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const companiesData = await getCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des entreprises",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Préparer la suppression d'une entreprise
  const prepareDelete = (company: Company) => {
    setSelectedCompany(company);
    setDeleteDialogOpen(true);
  };
  
  // Préparer la modification d'une entreprise
  const prepareEdit = (company: Company) => {
    setSelectedCompany(company);
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

  // Gérer la suppression d'une entreprise
  const handleDelete = async (id: string) => {
    try {
      const { success, error } = await deleteCompany(id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "L'entreprise a été supprimée avec succès",
        });
        
        // Rafraîchir la liste des entreprises
        fetchCompanies();
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error 
          ? error.message 
          : "Impossible de supprimer l'entreprise. Veuillez réessayer.",
        variant: "destructive",
      });
    }
    
    // Fermer la boîte de dialogue
    setDeleteDialogOpen(false);
    setSelectedCompany(null);
  };

  // Fermer le dialogue après avoir ajouté ou modifié une entreprise
  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedCompany(null);
    // Recharger la liste des entreprises
    fetchCompanies();
  };

  // Filtrer et trier les entreprises
  const filteredAndSortedCompanies = useMemo(() => {
    // Filtrer par terme de recherche
    const filtered = companies.filter(
      company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.pays && company.pays.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (company.secteur && company.secteur.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Trier selon le champ et l'ordre sélectionnés
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'pays') {
        const paysA = a.pays || '';
        const paysB = b.pays || '';
        comparison = paysA.localeCompare(paysB);
      } else if (sortField === 'secteur') {
        const secteurA = a.secteur || '';
        const secteurB = b.secteur || '';
        comparison = secteurA.localeCompare(secteurB);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [companies, searchTerm, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
          <p className="text-muted-foreground">
            Gérez les entreprises partenaires de votre plateforme.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">Ajouter une entreprise</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle entreprise</DialogTitle>
              <DialogDescription>
                Créez une nouvelle entreprise qui pourra être associée aux intervenants.
              </DialogDescription>
            </DialogHeader>
            <CompanyForm mode="create" onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Rechercher une entreprise..."
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
            onClick={() => toggleSort('pays')}
            className={sortField === 'pays' ? 'border-teal-500' : ''}
          >
            Pays
            <ArrowUpDown className="ml-2 h-4 w-4" />
            {sortField === 'pays' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toggleSort('secteur')}
            className={sortField === 'secteur' ? 'border-teal-500' : ''}
          >
            Secteur
            <ArrowUpDown className="ml-2 h-4 w-4" />
            {sortField === 'secteur' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toggleSort('created_at')}
            className={sortField === 'created_at' ? 'border-teal-500' : ''}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
            {sortField === 'created_at' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <span className="text-sm text-gray-500">
          {filteredAndSortedCompanies.length} entreprises
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCompanies.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500">
              Aucune entreprise trouvée
            </div>
          ) : (
            filteredAndSortedCompanies.map((company) => (
              <div 
                key={company.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{company.name}</h3>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => prepareEdit(company)}
                        className="h-7 w-7 p-0"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="text-blue-600"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => prepareDelete(company)}
                        className="h-7 w-7 p-0"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="text-red-600"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {company.logo_url && (
                      <div className="flex items-center mb-3">
                        <img 
                          src={company.logo_url} 
                          alt={`${company.name} logo`}
                          className="w-16 h-16 object-contain rounded"
                        />
                      </div>
                    )}
                    
                    {company.pays && (
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 mr-2" />
                        <span>{company.pays}</span>
                      </div>
                    )}
                    
                    {company.secteur && (
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        <span>{company.secteur}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialogue de modification */}
      {selectedCompany && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifier l'entreprise</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'entreprise sélectionnée.
              </DialogDescription>
            </DialogHeader>
            <CompanyForm 
              company={selectedCompany}
              mode="edit"
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
              Êtes-vous sûr de vouloir supprimer l'entreprise {selectedCompany?.name} ?
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCompany(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedCompany && handleDelete(selectedCompany.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;
