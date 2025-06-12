import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, X } from 'lucide-react';

// Interface pour le projet
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  image_url?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  company_id?: string;
  created_at: string;
  updated_at?: string;
}

// Interface pour les entreprises
interface Company {
  id: string;
  name: string;
}

// Options de statut
const PROJECT_STATUSES = [
  { value: 'active', label: 'Actif' },
  { value: 'paused', label: 'En pause' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' }
] as const;

const EditProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { fetchData, updateData } = useSupabase();

  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    image_url: '',
    status: 'active' as Project['status'],
    company_id: ''
  });

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  // Rediriger si pas admin
  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits pour modifier les projets",
        variant: "destructive",
      });
      navigate('/dashboard/projets');
    }
  }, [isAdmin, navigate, toast]);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        toast({
          title: "Erreur",
          description: "ID de projet manquant",
          variant: "destructive",
        });
        navigate('/dashboard/projets');
        return;
      }

      try {
        setLoading(true);

        // Charger le projet
        const projectData = await fetchData<Project>('projects', {
          columns: '*',
          filters: [{ column: 'id', operator: 'eq', value: id }]
        });

        if (!projectData || projectData.length === 0) {
          toast({
            title: "Erreur",
            description: "Projet non trouvé",
            variant: "destructive",
          });
          navigate('/dashboard/projets');
          return;
        }

        const loadedProject = projectData[0];
        setProject(loadedProject);

        // Remplir le formulaire avec les données existantes
        setFormData({
          name: loadedProject.name,
          description: loadedProject.description,
          start_date: loadedProject.start_date.split('T')[0], // Format YYYY-MM-DD pour input date
          end_date: loadedProject.end_date ? loadedProject.end_date.split('T')[0] : '',
          image_url: loadedProject.image_url || '',
          status: loadedProject.status || 'active',
          company_id: loadedProject.company_id || ''
        });

        // Charger les entreprises
        const companiesData = await fetchData<Company>('companies', {
          columns: 'id, name',
          order: { column: 'name', ascending: true }
        });
        setCompanies(companiesData || []);

      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du projet",
          variant: "destructive",
        });
        navigate('/dashboard/projets');
      } finally {
        setLoading(false);
      }
    };

    if (id && isAdmin) {
      loadData();
    }
  }, [id, isAdmin, fetchData, navigate, toast]);

  // Gérer les changements de formulaire
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Valider le formulaire
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est obligatoire",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erreur",
        description: "La description du projet est obligatoire",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.start_date) {
      toast({
        title: "Erreur",
        description: "La date de début est obligatoire",
        variant: "destructive",
      });
      return false;
    }

    // Validation que la date de fin est après la date de début
    if (formData.end_date && formData.end_date < formData.start_date) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!project || !validateForm()) return;

    try {
      setSaving(true);

      // Préparer les données pour la mise à jour
      const updatePayload = {
        id: project.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        image_url: formData.image_url || null,
        status: formData.status,
        company_id: formData.company_id || null,
        updated_at: new Date().toISOString()
      };

      const result = await updateData<Project>('projects', updatePayload);

      if (result) {
        toast({
          title: "Succès",
          description: "Projet mis à jour avec succès",
        });
        
        // Rediriger vers les détails du projet
        navigate(`/dashboard/projets/${project.id}`);
      } else {
        throw new Error('Aucun résultat retourné');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Revenir en arrière
  const handleGoBack = () => {
    navigate(`/dashboard/projets/${id}`);
  };

  // Affichage du loading
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  // Affichage si pas de projet
  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Projet non trouvé</h3>
        <p className="text-gray-500 mb-4">Le projet que vous souhaitez modifier n'existe pas.</p>
        <Button onClick={() => navigate('/dashboard/projets')}>
          Retour aux projets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleGoBack}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier le projet</h1>
            <p className="text-muted-foreground">
              Modifiez les informations du projet "{project.name}"
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-aphs-teal hover:bg-aphs-navy"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du projet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nom du projet */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom du projet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nom du projet"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description détaillée du projet"
              rows={4}
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Date de début <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={formData.start_date}
              />
            </div>
          </div>

          {/* Statut et Entreprise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {PROJECT_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_id">Entreprise</Label>
              <select
                id="company_id"
                value={formData.company_id}
                onChange={(e) => handleInputChange('company_id', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Aucune entreprise associée</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL de l'image */}
          <div className="space-y-2">
            <Label htmlFor="image_url">URL de l'image</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
              placeholder="https://exemple.com/image.jpg"
              type="url"
            />
            {formData.image_url && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">Aperçu de l'image :</p>
                <img 
                  src={formData.image_url} 
                  alt="Aperçu"
                  className="max-w-xs h-auto border rounded-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Informations supplémentaires */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">Informations du projet</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Créé le :</span> {' '}
                {new Date(project.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {project.updated_at && (
                <div>
                  <span className="font-medium">Dernière modification :</span> {' '}
                  {new Date(project.updated_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProject; 