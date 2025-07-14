import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSupabase, UserRole, Company } from '../hooks/useSupabase';
import PasswordInput from '@/components/ui/password-input';

// Spécialités par catégorie (même que dans CreateUserForm)
const CONCEPTION_SPECIALTIES = [
  'MOA Maître d\'ouvrage',
  'AMO Assistant maîtrise d\'ouvrage',
  'Géomètre',
  'MOE Maître d\'oeuvre',
  'Commission de sécurité',
  'Monuments historiques',
  'Elus locaux',
  'Futurs usagers',
  'Gestionnaire',
  'Programmiste',
  'Architectes',
  'Membres du Jury',
  'Bureau de contrôle',
  'Bureau d\'étude de sol',
  'Bureau d\'étude structure',
  'Bureau d\'étude thermique',
  'Bureau d\'étude acoustique',
  'Bureau d\'étude électricité',
  'Bureau d\'étude plomberie, chauffage, ventilation, climatisation',
  'Bureau d\'étude VRD voirie, réseaux divers',
  'Architecte d\'intérieur',
  'COORDINATEUR OPC',
  'COORDINATEUR SPS',
  'COORDINATEUR SSI'
];

const REALISATION_SPECIALTIES = [
  'Entreprise fondation',
  'Entreprise Gros-Œuvre',
  'Entreprise VRD voirie-réseaux divers',
  'Entreprise Charpente/Couverture/Étanchéité',
  'Entreprise Menuiseries extérieures',
  'Entreprise Menuiseries intérieures',
  'Entreprise Électricité',
  'Entreprise Plomberie/Chauffage/Ventilation/Climatisation',
  'Entreprise Cloison/Doublage',
  'Entreprise Revêtement de sol',
  'Entreprise Métallerie/Serrurerie',
  'Entreprise Peinture',
  'Entreprise Ascenseur',
  'Entreprise Agencement',
  'Entreprise Paysage/Espace vert',
  'Fournisseurs indirects',
  'Services extérieurs'
];

interface EditUserFormProps {
  userId: string;
  userData: {
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    specialty?: string;
    company?: string;
    company_id?: string;
  };
  onSuccess?: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ userId, userData, onSuccess }) => {
  const [email, setEmail] = useState(userData.email || '');
  const [firstName, setFirstName] = useState(userData.first_name || '');
  const [lastName, setLastName] = useState(userData.last_name || '');
  const [category, setCategory] = useState(''); // Nouvelle state pour la catégorie
  const [specialty, setSpecialty] = useState(userData.specialty || '');
  const [company, setCompany] = useState(userData.company || 'Indépendant');
  const [companyId, setCompanyId] = useState(userData.company_id || '');
  const [role, setRole] = useState<UserRole>((userData.role as UserRole) || 'intervenant');
  
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyInputMode, setCompanyInputMode] = useState<'select' | 'input'>(userData.company_id ? 'select' : 'input');
  
  const { toast } = useToast();
  const { adminUpdateUser, getCompanies } = useSupabase();

  // Fonction pour déterminer la catégorie d'une spécialité
  const getCategoryFromSpecialty = (specialty: string): string => {
    if (CONCEPTION_SPECIALTIES.includes(specialty)) {
      return 'conception';
    } else if (REALISATION_SPECIALTIES.includes(specialty)) {
      return 'realisation';
    }
    return '';
  };

  // Obtenir les spécialités selon la catégorie sélectionnée
  const getSpecialtiesByCategory = (selectedCategory: string) => {
    switch (selectedCategory) {
      case 'conception':
        return CONCEPTION_SPECIALTIES;
      case 'realisation':
        return REALISATION_SPECIALTIES;
      default:
        return [];
    }
  };

  // Initialiser la catégorie basée sur la spécialité existante
  useEffect(() => {
    if (userData.specialty) {
      const initialCategory = getCategoryFromSpecialty(userData.specialty);
      setCategory(initialCategory);
    }
  }, [userData.specialty]);

  // Réinitialiser la spécialité quand la catégorie change (sauf à l'initialisation)
  useEffect(() => {
    if (category && !userData.specialty) {
      setSpecialty('');
    }
  }, [category, userData.specialty]);

  // Charger la liste des entreprises
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (error) {
        console.error("Erreur lors du chargement des entreprises:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    
    fetchCompanies();
  }, [getCompanies]);

  // Met à jour automatiquement le rôle en fonction de la spécialité
  useEffect(() => {
    if (specialty === 'MOA Maître d\'ouvrage') {
      setRole('maitre_ouvrage' as UserRole);
    } else if (role !== 'admin') {
      setRole('intervenant');
    }
  }, [specialty, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !firstName || !lastName || !specialty) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    
    if (changePassword && (!password || password !== confirmPassword)) {
      toast({
        title: "Erreur",
        description: changePassword 
          ? "Veuillez renseigner et confirmer le nouveau mot de passe" 
          : "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const updateData: Record<string, any> = {
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        specialty
      };
      
      // Gérer l'entreprise selon le mode choisi
      if (companyInputMode === 'select' && companyId) {
        updateData.company_id = companyId === 'independant' ? null : companyId;
        
        // Trouver le nom de l'entreprise pour l'affichage
        if (companyId === 'independant') {
          updateData.company = 'Indépendant';
        } else {
          const selectedCompany = companies.find(c => c.id === companyId);
          if (selectedCompany) {
            updateData.company = selectedCompany.name;
          }
        }
      } else {
        updateData.company = company;
        updateData.company_id = null; // Supprimer la référence à une entreprise existante
      }
      
      // Ajouter le mot de passe uniquement s'il doit être modifié
      if (changePassword && password) {
        updateData.password = password;
      }
      
      const { success, error } = await adminUpdateUser(userId, updateData);
      
      if (success) {
        toast({
          title: "Utilisateur mis à jour",
          description: `Les informations de ${firstName} ${lastName} ont été mises à jour avec succès`,
        });
        
        // Réinitialiser le formulaire de mot de passe
        setChangePassword(false);
        setPassword('');
        setConfirmPassword('');
        
        // Appeler la fonction de succès si elle existe
        if (onSuccess) onSuccess();
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur. Vérifiez les informations et réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyInputMode = () => {
    setCompanyInputMode(prevMode => {
      if (prevMode === 'select') {
        setCompanyId('');
        return 'input';
      } else {
        setCompany('Indépendant');
        return 'select';
      }
    });
  };

  return (
    <div className="bg-white">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-firstName">Prénom *</Label>
            <Input
              id="edit-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="edit-lastName">Nom *</Label>
            <Input
              id="edit-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="edit-email">Email *</Label>
          <Input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utilisateur@exemple.com"
            required
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="company">Entreprise</Label>
            <Button 
              type="button" 
              variant="link" 
              className="text-xs h-6 px-0"
              onClick={toggleCompanyInputMode}
            >
              {companyInputMode === 'select' 
                ? "Saisir une nouvelle entreprise" 
                : "Sélectionner une entreprise existante"}
            </Button>
          </div>
          
          {companyInputMode === 'select' ? (
            <>
              <Select
                value={companyId}
                onValueChange={setCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independant">Indépendant</SelectItem>
                  {loadingCompanies ? (
                    <div className="py-2 px-2 text-sm text-gray-500">Chargement des entreprises...</div>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {companyId === 'independant' && (
                <div className="mt-1 text-xs text-gray-500">
                  L'intervenant sera enregistré comme indépendant
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                id="edit-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nom de l'entreprise"
              />
              <div className="mt-1 text-xs text-gray-500">
                Laissez "Indépendant" si l'intervenant n'est pas rattaché à une entreprise
              </div>
            </>
          )}
        </div>
        
        <div>
          <Label htmlFor="edit-category">Catégorie *</Label>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              // Réinitialiser la spécialité si on change de catégorie
              if (value !== getCategoryFromSpecialty(specialty)) {
                setSpecialty('');
              }
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conception">Conception</SelectItem>
              <SelectItem value="realisation">Réalisation</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-gray-500">
            Choisissez d'abord la catégorie pour voir les spécialités correspondantes
          </div>
        </div>
        
        <div>
          <Label htmlFor="edit-specialty">Spécialité *</Label>
          <Select
            value={specialty}
            onValueChange={(value) => setSpecialty(value)}
            required
            disabled={!category}
          >
            <SelectTrigger>
              <SelectValue placeholder={!category ? "Sélectionnez d'abord une catégorie" : "Sélectionner une spécialité"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {getSpecialtiesByCategory(category).map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-sm text-gray-500">
            {specialty === 'MOA Maître d\'ouvrage' ? 
              'Rôle: Intervenant' : 
              specialty ? 'Rôle: Intervenant' : 
              category ? `${getSpecialtiesByCategory(category).length} spécialités disponibles` : ''}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="change-password" 
            checked={changePassword}
            onCheckedChange={(checked) => setChangePassword(checked === true)}
          />
          <Label htmlFor="change-password" className="cursor-pointer">
            Modifier le mot de passe
          </Label>
        </div>
        
        {changePassword && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Modification du mot de passe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-password">Nouveau mot de passe *</Label>
                <PasswordInput
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required={changePassword}
                />
              </div>
              
              <div>
                <Label htmlFor="confirm-password">Confirmer le mot de passe *</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  required={changePassword}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="sticky bottom-0 bg-white pt-6 mt-6 border-t flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
            disabled={loading}
          >
            {loading ? 'Mise à jour...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditUserForm; 