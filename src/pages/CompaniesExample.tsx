import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompanies } from '../hooks/useCompanies';
import {
  Company,
  CreateCompanyData,
  UpdateCompanyData,
  CompanySortField,
  SortOrder,
  COMMON_COUNTRIES,
  COMMON_SECTORS
} from '../types/company';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileImage,
  TrendingUp,
  BarChart3
} from "lucide-react";

const CompaniesExample: React.FC = () => {
  const { toast } = useToast();
  const {
    loading,
    companies,
    getCompanies,
    searchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    getCompanyStats,
    uploadCompanyLogo
  } = useCompanies();

  // États pour les dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  
  // États pour les données
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<CompanySortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [stats, setStats] = useState<any>(null);

  // États pour les formulaires
  const [newCompanyForm, setNewCompanyForm] = useState<CreateCompanyData>({
    name: '',
    pays: '',
    secteur: '',
    logo_url: ''
  });
  const [editCompanyForm, setEditCompanyForm] = useState<UpdateCompanyData>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    await getCompanies(undefined, { field: sortField, order: sortOrder });
  };

  const loadStats = async () => {
    const companyStats = await getCompanyStats();
    setStats(companyStats);
    setIsStatsDialogOpen(true);
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      await searchCompanies(searchTerm);
    } else {
      await loadCompanies();
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyForm.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est obligatoire",
        variant: "destructive",
      });
      return;
    }

    let logoUrl = newCompanyForm.logo_url;
    
    // Upload du logo si un fichier est sélectionné
    if (logoFile) {
      logoUrl = await uploadCompanyLogo(logoFile);
      if (!logoUrl) return; // Erreur lors de l'upload
    }

    const companyData = { ...newCompanyForm, logo_url: logoUrl };
    const result = await createCompany(companyData);

    if (result) {
      setNewCompanyForm({ name: '', pays: '', secteur: '', logo_url: '' });
      setLogoFile(null);
      setIsCreateDialogOpen(false);
      loadCompanies();
    }
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setEditCompanyForm({
      name: company.name,
      pays: company.pays || '',
      secteur: company.secteur || '',
      logo_url: company.logo_url || ''
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    const success = await deleteCompany(selectedCompany.id);

    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
      loadCompanies();
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    return companies.filter(company => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.pays && company.pays.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.secteur && company.secteur.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [companies, searchTerm]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des entreprises</h1>
          <p className="text-gray-600 mt-2">
            Démonstration du hook useCompanies avec table sans RLS
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStats} variant="outline">
            📊 Statistiques
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                ➕ Ajouter une entreprise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle entreprise à votre base de données
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom de l'entreprise *</Label>
                  <Input
                    id="name"
                    value={newCompanyForm.name}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                    placeholder="Ex: Tech Innovation"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Select value={newCompanyForm.pays} onValueChange={(value) => setNewCompanyForm({ ...newCompanyForm, pays: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secteur">Secteur d'activité</Label>
                  <Select value={newCompanyForm.secteur} onValueChange={(value) => setNewCompanyForm({ ...newCompanyForm, secteur: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SECTORS.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateCompany} disabled={loading}>
                  {loading ? "Création..." : "Créer l'entreprise"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom, pays ou secteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="sm">
              🔍 Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compteur */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {filteredCompanies.length} entreprise{filteredCompanies.length > 1 ? 's' : ''} trouvée{filteredCompanies.length > 1 ? 's' : ''}
        </p>
        {loading && <span className="text-sm text-blue-600">Chargement...</span>}
      </div>

      {/* Liste des entreprises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                    🏢
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(company)}>
                    ✏️
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(company)}>
                    🗑️
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.pays && (
                <div className="flex items-center text-sm text-gray-600">
                  🌍 {company.pays}
                </div>
              )}
              {company.secteur && (
                <div className="flex items-center text-sm text-gray-600">
                  💼 {company.secteur}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500">
                📅 {new Date(company.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise trouvée</h3>
          <p className="text-gray-600">Commencez par ajouter votre première entreprise.</p>
        </div>
      )}

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'entreprise sélectionnée
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom de l'entreprise</Label>
              <Input
                id="edit-name"
                value={editCompanyForm.name || ''}
                onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-pays">Pays</Label>
              <Select value={editCompanyForm.pays || ''} onValueChange={(value) => setEditCompanyForm({ ...editCompanyForm, pays: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-secteur">Secteur d'activité</Label>
              <Select value={editCompanyForm.secteur || ''} onValueChange={(value) => setEditCompanyForm({ ...editCompanyForm, secteur: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un secteur" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={async () => {
              if (!selectedCompany) return;
              const result = await updateCompany(selectedCompany.id, editCompanyForm);
              if (result) {
                setEditCompanyForm({});
                setIsEditDialogOpen(false);
                setSelectedCompany(null);
                loadCompanies();
              }
            }} disabled={loading}>
              {loading ? "Mise à jour..." : "Sauvegarder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'entreprise "{selectedCompany?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog des statistiques */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Statistiques des entreprises</DialogTitle>
            <DialogDescription>
              Vue d'ensemble de vos entreprises
            </DialogDescription>
          </DialogHeader>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      📈 <span className="font-medium">Total des entreprises</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.totalCompanies}</p>
                  </CardContent>
                </Card>
                
                <div>
                  <h4 className="font-medium mb-2">Répartition par pays</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.companiesByCountry).map(([country, count]) => (
                      <div key={country} className="flex justify-between items-center">
                        <span className="text-sm">{country}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Répartition par secteur</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.companiesBySector).map(([sector, count]) => (
                      <div key={sector} className="flex justify-between items-center">
                        <span className="text-sm">{sector}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompaniesExample; 