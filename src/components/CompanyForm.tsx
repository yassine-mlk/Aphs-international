import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSupabase } from '../hooks/useSupabase';
import { COMPANY_SPECIALITIES, Company } from '../types/company';

interface CompanyFormProps {
  company?: Partial<Company>;
  onSuccess?: () => void;
  mode: 'create' | 'edit';
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, onSuccess, mode }) => {
  const [name, setName] = useState(company?.name || '');
  const [pays, setPays] = useState(company?.pays || '');
  const [secteur, setSecteur] = useState(company?.secteur || '');
  const [specialite, setSpecialite] = useState(company?.specialite || company?.secteur || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(company?.logo_url || null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { toast } = useToast();
  const { addCompany, updateCompany, supabase } = useSupabase();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Clean up the preview URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    // Vérifier que le fichier n'est pas trop volumineux (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le logo ne doit pas dépasser 2MB.",
        variant: "destructive",
      });
      return null;
    }

    // Vérifier le type du fichier
    const validImageTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez utiliser un format d'image (JPG, PNG, SVG, GIF, WEBP).",
        variant: "destructive",
      });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;
    const bucketName = 'logos';

    try {
      setUploadProgress(10); // Indiquer que l'upload commence
      
      // Supprimer la vérification d'existence du bucket
      // Nous supposons que le bucket a été créé manuellement dans la console Supabase
      
      setUploadProgress(30); // Progression
      
      // Upload du fichier
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Écraser si le fichier existe déjà
          contentType: file.type,
        });

      if (error) throw error;
      
      setUploadProgress(70); // Fichier uploadé

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setUploadProgress(100); // Terminé
      
      // Petite pause pour montrer que l'upload est terminé
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      setUploadProgress(0);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le logo. Veuillez réessayer.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Fonction pour supprimer le logo actuel
  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    setLogoFile(null);
    // Si on est en mode édition et qu'il y a déjà un logo, on garde une référence pour le supprimer lors de la soumission
    if (mode === 'edit' && company?.logo_url) {
      // Ce sera remplacé par null lors de la mise à jour
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!specialite) {
      toast({
        title: "Erreur",
        description: "La spécialité de l'entreprise est obligatoire",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      let logoUrl = company?.logo_url || null;
      
      // Si on est en mode édition et qu'on a supprimé le logo (previewUrl est null mais logoFile aussi)
      if (mode === 'edit' && previewUrl === null && !logoFile) {
        logoUrl = null; // Explicitement mettre à null pour supprimer la référence
      }
      // Upload le nouveau logo si un fichier est sélectionné
      else if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
        if (!logoUrl) {
          throw new Error("Échec de l'upload du logo");
        }
      }
      
      const companyData = {
        name,
        pays,
        secteur: secteur || specialite, // Garder pour compatibilité avec l'existant
        specialite,
        logo_url: logoUrl
      };
      
      let result;
      
      if (mode === 'create') {
        result = await addCompany(companyData);
      } else {
        if (!company?.id) throw new Error("ID d'entreprise manquant");
        result = await updateCompany(company.id, companyData);
      }
      
      if (result.success) {
        toast({
          title: "Succès",
          description: mode === 'create' 
            ? `L'entreprise ${name} a été créée avec succès` 
            : `L'entreprise ${name} a été mise à jour avec succès`,
        });
        
        // Réinitialiser le formulaire si c'est une création
        if (mode === 'create') {
          setName('');
          setPays('');
          setSecteur('');
          setSpecialite('');
          setLogoFile(null);
          setPreviewUrl(null);
          setUploadProgress(0);
        }
        
        // Appeler la fonction de succès
        if (onSuccess) {
          onSuccess();
        }
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Erreur lors de l\'opération sur l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: `Impossible de ${mode === 'create' ? 'créer' : 'modifier'} l'entreprise. Vérifiez les informations et réessayez.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {mode === 'create' ? 'Ajouter une entreprise' : 'Modifier l\'entreprise'}
      </h2>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="company-name">Nom de l'entreprise *</Label>
          <Input
            id="company-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'entreprise"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="company-pays">Pays</Label>
          <Input
            id="company-pays"
            type="text"
            value={pays}
            onChange={(e) => setPays(e.target.value)}
            placeholder="Pays"
          />
        </div>
        
        <div>
          <Label htmlFor="company-specialite">Spécialité de l'entreprise *</Label>
          <Select value={specialite} onValueChange={setSpecialite}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une spécialité" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SPECIALITIES.map((speciality) => (
                <SelectItem key={speciality} value={speciality}>
                  {speciality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="company-logo">Logo de l'entreprise</Label>
          <div className="mt-1 space-y-3">
            {previewUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 border rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  <button 
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-0 right-0 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                    title="Supprimer le logo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('company-logo')?.click()}
                >
                  Changer le logo
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border border-dashed rounded flex items-center justify-center bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <Input
                    id="company-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                    style={{ display: previewUrl ? 'none' : 'block' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formats recommandés: PNG, JPG, SVG. 
                    Taille max: 2MB.
                  </p>
                </div>
              </div>
            )}
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Upload en cours... {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-4 flex justify-end space-x-3">
          {mode === 'edit' && (
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
            >
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
            disabled={loading}
          >
            {loading 
              ? (mode === 'create' ? 'Création...' : 'Mise à jour...') 
              : (mode === 'create' ? 'Créer l\'entreprise' : 'Enregistrer les modifications')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CompanyForm; 