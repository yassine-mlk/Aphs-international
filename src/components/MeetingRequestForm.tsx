import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useVideoMeetings } from '@/hooks/useVideoMeetings';
import { useSupabase } from '@/hooks/useSupabase';

interface MeetingRequestFormProps {
  onRequestSubmitted?: () => void;
}

export function MeetingRequestForm({ onRequestSubmitted }: MeetingRequestFormProps) {
  const { toast } = useToast();
  const { requestMeeting } = useVideoMeetings();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{value: string, label: string}[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    selectedParticipants: [] as string[]
  });
  
  // Charger la liste des utilisateurs pour les suggestions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .order('first_name');
          
        if (error) throw error;
        
        if (data) {
          const formattedUsers = data.map(user => ({
            value: user.id,
            label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          }));
          setUsers(formattedUsers);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      }
    };
    
    loadUsers();
  }, [supabase]);
  
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
    
    setLoading(true);
    
    try {
      const success = await requestMeeting(
        formData.title,
        formData.description,
        new Date(formData.scheduledTime),
        formData.selectedParticipants
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
        <CardTitle>Demande de réunion</CardTitle>
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
      </CardContent>
      <CardFooter>
        <Button 
          className="bg-aphs-teal hover:bg-aphs-navy w-full" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Envoi en cours..." : "Envoyer la demande"}
        </Button>
      </CardFooter>
    </Card>
  );
} 