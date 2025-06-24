import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSupabase, UserRole, SPECIALTIES, Company } from '../hooks/useSupabase';
import PasswordInput from '@/components/ui/password-input';

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
      setRole('owner' as UserRole);
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
    <div className="bg-white p-6 rounded-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier un utilisateur</h2>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
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
          <Label htmlFor="edit-specialty">Spécialité *</Label>
          <Select
            value={specialty}
            onValueChange={(value) => setSpecialty(value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une spécialité" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {SPECIALTIES.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-sm text-gray-500">
            {specialty === 'MOA Maître d\'ouvrage' ? 
              'Rôle: Propriétaire (owner)' : 
              specialty ? 'Rôle: Intervenant' : ''}
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
          <div className="space-y-4 pt-2 pb-2 border-t border-b border-gray-100">
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
        )}
        
        <div className="pt-4 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
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