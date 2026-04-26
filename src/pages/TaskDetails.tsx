import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Calendar, Clock, FileUp, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface Task {
  id: string;
  task_name: string;
  description: string;
  status: string;
  deadline: string;
  project_id: string;
  assigned_to: string[];
}

interface Project {
  id: string;
  name: string;
}

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user, status: authStatus } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  // Charger les détails de la tâche
  const loadTaskDetails = useCallback(async () => {
    if (!id || !user?.id || authStatus !== 'authenticated') return;
    
    try {
      setLoading(true);
      
      // Récupérer la tâche
      const { data: taskData, error: taskError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (taskError) throw taskError;
      
      if (!taskData) {
        toast({
          title: "Tâche non trouvée",
          description: "La tâche demandée n'existe pas ou vous n'y avez pas accès.",
          variant: "destructive",
        });
        navigate('/dashboard/tasks');
        return;
      }
      
      setTask(taskData);
      
      // Récupérer le projet associé
      if (taskData.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', taskData.project_id)
          .maybeSingle();
        
        if (projectData) {
          setProject(projectData);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la tâche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, authStatus, supabase, toast, navigate]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadTaskDetails();
    }
  }, [loadTaskDetails, authStatus]);

  // Mettre à jour le statut de la tâche
  const handleUpdateStatus = async (newStatus: string) => {
    if (!task?.id) return;
    
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', task.id);
      
      if (error) throw error;
      
      toast({
        title: "Statut mis à jour",
        description: `La tâche est maintenant ${newStatus}`,
      });
      
      loadTaskDetails();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  // Soumettre la tâche
  const handleSubmit = async () => {
    if (!task?.id) return;
    
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          status: 'submitted', 
          updated_at: new Date().toISOString(),
          comment: comment || null
        })
        .eq('id', task.id);
      
      if (error) throw error;
      
      toast({
        title: "Tâche soumise",
        description: "Votre travail a été soumis pour validation",
      });
      
      setComment('');
      loadTaskDetails();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de soumettre la tâche",
        variant: "destructive",
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return { label: 'Assignée', color: 'bg-yellow-100 text-yellow-800' };
      case 'in_progress': return { label: 'En cours', color: 'bg-blue-100 text-blue-800' };
      case 'submitted': return { label: 'Soumise', color: 'bg-orange-100 text-orange-800' };
      case 'validated': return { label: 'Validée', color: 'bg-green-100 text-green-800' };
      case 'rejected': return { label: 'Rejetée', color: 'bg-red-100 text-red-800' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Tâche non trouvée</h3>
        <p className="text-gray-500 mb-4">La tâche demandée n'existe pas ou vous n'y avez pas accès.</p>
        <Button onClick={() => navigate('/dashboard/tasks')}>
          Retour aux tâches
        </Button>
      </div>
    );
  }

  const status = getStatusLabel(task.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/tasks')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Détails de la tâche</h1>
      </div>

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{task.task_name}</CardTitle>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-gray-600">{task.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
            </div>
            
            {project && (
              <div className="flex items-center gap-2 text-gray-500">
                <FileUp className="h-4 w-4" />
                <span>Projet: {project.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {task.status === 'assigned' && (
        <Card>
          <CardHeader>
            <CardTitle>Démarrer la tâche</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleUpdateStatus('in_progress')}>
              <Clock className="h-4 w-4 mr-2" />
              Démarrer
            </Button>
          </CardContent>
        </Card>
      )}

      {task.status === 'in_progress' && (
        <Card>
          <CardHeader>
            <CardTitle>Soumettre la tâche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ajoutez un commentaire (optionnel)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Soumettre pour validation
            </Button>
          </CardContent>
        </Card>
      )}

      {task.status === 'submitted' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-orange-600">
              <Clock className="h-5 w-5" />
              <span>Tâche soumise - En attente de validation</span>
            </div>
          </CardContent>
        </Card>
      )}

      {task.status === 'validated' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Tâche validée</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskDetails;