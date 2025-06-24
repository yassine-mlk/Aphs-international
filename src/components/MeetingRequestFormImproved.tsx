import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, FolderOpen } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useVideoMeetingsImproved } from '@/hooks/useVideoMeetingsImproved';
import { useSupabase } from '@/hooks/useSupabase';

interface MeetingRequestFormProps {
  onRequestSubmitted?: () => void;
}

export function MeetingRequestFormImproved({ onRequestSubmitted }: MeetingRequestFormProps) {
  const { toast } = useToast();
  const { requestMeeting, projects, loadUserProjects } = useVideoMeetingsImproved();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{value: string, label: string}[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    scheduledTime: '',
    selectedParticipants: [] as string[]
  });
  
  // Charger la liste des utilisateurs pour les suggestions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .order('first_name');
          
        if (error) throw error;
        
        if (data) {
          const formattedUsers = data.map(user => ({
            value: user.user_id,
            label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          }));
          setUsers(formattedUsers);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      }
    };
    
    loadUsers();
    loadUserProjects();
  }, [supabase, loadUserProjects]);
  
  const handleSubmit = async () => {
    if (!formData.title) {
      toast({
        title: "Titre manquant",
        description: "Veuillez saisir un titre pour la demande de réunion",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.scheduledTime) {
      toast({
        title: "Date manquante",
        description: "Veuillez sélectionner une date pour la réunion",
        variant: "destructive"
      });
      return;
    }

    if (!formData.projectId) {
      toast({
        title: "Projet manquant",
        description: "Veuillez sélectionner un projet pour cette réunion",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const success = await requestMeeting(
        formData.title,
        formData.description,
        new Date(formData.scheduledTime),
        formData.selectedParticipants,
        formData.projectId
      );
      
      if (success) {
        toast({
          title: "Demande envoyée",
          description: "Votre demande de réunion a été envoyée avec succès"
        });
        
        // Réinitialiser le formulaire
        setFormData({
          title: '',
          description: '',
          projectId: '',
          scheduledTime: '',
          selectedParticipants: []
        });
        
        // Notifier le parent si nécessaire
        if (onRequestSubmitted) {
          onRequestSubmitted();
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande de réunion",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Demande de réunion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="request-title">Titre de la réunion *</Label>
          <Input
            id="request-title"
            placeholder="Ex: Point d'avancement projet"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="request-project">Projet associé *</Label>
          <Select
            value={formData.projectId}
            onValueChange={(value) => setFormData({...formData, projectId: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un projet">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                  <span>
                    {formData.projectId ? 
                      projects.find(p => p.id === formData.projectId)?.name || 'Projet sélectionné' 
                      : 'Sélectionnez un projet'
                    }
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {project.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projects.length === 0 && (
            <p className="text-xs text-gray-500">
              Aucun projet disponible. Contactez votre administrateur.
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="request-description">Description</Label>
          <Textarea
            id="request-description"
            placeholder="Objet de la réunion, points à aborder..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="request-time">Date et heure souhaitées *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="request-time"
              type="datetime-local"
              className="pl-10"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="request-participants">Participants suggérés</Label>
          <MultiSelect
            id="request-participants"
            placeholder="Sélectionnez des participants..."
            selected={formData.selectedParticipants}
            options={users}
            onChange={(values) => setFormData({...formData, selectedParticipants: values})}
          />
          <p className="text-xs text-gray-500 mt-1">
            Les participants seront invités si l'administrateur approuve votre demande.
          </p>
        </div>

        {/* Affichage du projet sélectionné si disponible */}
        {formData.projectId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <FolderOpen className="h-4 w-4" />
              <span className="font-medium">Projet sélectionné:</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              {projects.find(p => p.id === formData.projectId)?.name}
            </p>
            {projects.find(p => p.id === formData.projectId)?.description && (
              <p className="text-blue-600 text-xs mt-1">
                {projects.find(p => p.id === formData.projectId)?.description}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="bg-aphs-teal hover:bg-aphs-navy w-full" 
          onClick={handleSubmit}
          disabled={loading || projects.length === 0}
        >
          {loading ? "Envoi en cours..." : "Envoyer la demande"}
        </Button>
      </CardFooter>
    </Card>
  );
} 