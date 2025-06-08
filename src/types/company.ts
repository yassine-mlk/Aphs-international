// Types pour la table companies
// Basés sur les formulaires et hooks existants

export interface Company {
  id: string;
  name: string;
  pays?: string;
  secteur?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// Interface pour la création d'une entreprise (sans les champs auto-générés)
export interface CreateCompanyData {
  name: string;
  pays?: string;
  secteur?: string;
  logo_url?: string;
}

// Interface pour la mise à jour d'une entreprise (tous les champs optionnels sauf id)
export interface UpdateCompanyData {
  name?: string;
  pays?: string;
  secteur?: string;
  logo_url?: string;
}

// Interface pour les formulaires d'entreprise
export interface CompanyFormData {
  name: string;
  pays: string;
  secteur: string;
  logoFile?: File | null;
}

// Options de recherche et filtrage
export interface CompanyFilters {
  name?: string;
  pays?: string;
  secteur?: string;
  searchTerm?: string;
}

// Options de tri
export type CompanySortField = 'name' | 'pays' | 'secteur' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface CompanySortOptions {
  field: CompanySortField;
  order: SortOrder;
}

// Interface pour les statistiques d'entreprise
export interface CompanyStats {
  totalCompanies: number;
  companiesByCountry: { [key: string]: number };
  companiesBySector: { [key: string]: number };
  recentCompanies: Company[];
}

// Constantes pour les options de formulaire
export const COMMON_COUNTRIES = [
  'France',
  'Espagne', 
  'Maroc',
  'Tunisie',
  'Algérie',
  'Canada',
  'Belgique',
  'Suisse',
  'Allemagne',
  'Italie'
] as const;

export const COMMON_SECTORS = [
  'Technologie',
  'Construction',
  'Énergies renouvelables',
  'Services numériques',
  'Transport',
  'Finance',
  'Santé',
  'Éducation',
  'Commerce',
  'Industrie',
  'Agriculture',
  'Tourisme'
] as const;

// Helpers pour validation et formatage
export const isValidCompany = (company: Partial<Company>): company is CreateCompanyData => {
  return !!(company.name && company.name.trim().length > 0);
};

export const formatCompanyDisplay = (company: Company): string => {
  const parts = [company.name];
  if (company.pays) parts.push(company.pays);
  if (company.secteur) parts.push(company.secteur);
  return parts.join(' - ');
};

export const getCompanyDisplayName = (company: Company): string => {
  return company.name;
};

// Types pour les erreurs de validation
export interface CompanyValidationError {
  field: keyof CreateCompanyData;
  message: string;
}

export const validateCompanyData = (data: Partial<CreateCompanyData>): CompanyValidationError[] => {
  const errors: CompanyValidationError[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Le nom de l\'entreprise est obligatoire' });
  }
  
  if (data.name && data.name.trim().length > 255) {
    errors.push({ field: 'name', message: 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères' });
  }
  
  if (data.pays && data.pays.length > 100) {
    errors.push({ field: 'pays', message: 'Le nom du pays ne peut pas dépasser 100 caractères' });
  }
  
  if (data.secteur && data.secteur.length > 100) {
    errors.push({ field: 'secteur', message: 'Le secteur ne peut pas dépasser 100 caractères' });
  }
  
  return errors;
}; 