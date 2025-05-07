import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSupabase, UserRole, SPECIALTIES, Company } from '../hooks/useSupabase';

interface CreateUserFormProps {
  onSuccess?: () => void;
}

export default function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('intervenant');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [company, setCompany] = useState('Indépendant');
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyInputMode, setCompanyInputMode] = useState<'select' | 'input'>('select');
  
  const { toast } = useToast();
  const { adminCreateUser, getCompanies } = useSupabase();

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
    } else {
      setRole('intervenant');
    }
  }, [specialty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName || !specialty) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const additionalData: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`,
        specialty
      };
      
      // Ajouter l'information sur l'entreprise
      if (companyInputMode === 'select' && companyId) {
        additionalData.company_id = companyId;
        
        // Trouver le nom de l'entreprise pour l'affichage
        const selectedCompany = companies.find(c => c.id === companyId);
        if (selectedCompany) {
          additionalData.company = selectedCompany.name;
        }
      } else {
        additionalData.company = company;
      }
      
      const { success, error } = await adminCreateUser(email, password, role, additionalData);
      
      if (success) {
        toast({
          title: "Intervenant créé",
          description: `L'intervenant ${firstName} ${lastName} a été créé avec succès`,
        });
        
        // Réinitialiser le formulaire
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setSpecialty('');
        setCompany('Indépendant');
        setCompanyId('');
        setCompanyInputMode('select');
        // Le rôle sera automatiquement réinitialisé à 'intervenant' grâce à l'useEffect
        
        // Appeler la fonction de succès pour fermer le dialogue
        if (onSuccess) {
          onSuccess();
        }
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'intervenant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intervenant. Vérifiez les informations et réessayez.",
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
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Créer un intervenant</h2>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Prénom *</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Nom *</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utilisateur@exemple.com"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="password">Mot de passe *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
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
                id="company"
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
          <Label htmlFor="specialty">Spécialité *</Label>
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
        
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
          disabled={loading}
        >
          {loading ? 'Création en cours...' : 'Créer l\'intervenant'}
        </Button>
      </form>
    </div>
  );
} 