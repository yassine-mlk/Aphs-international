import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/hooks/useSupabase';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Play, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle 
} from 'lucide-react';

interface TaskStatusManagerProps {
  task: {
    id: string;
    task_name: string;
    project_id: string;
    project_name?: string;
    status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
    assigned_to: string;
    validators: string[];
  };
  onStatusChange: () => void;
}

const TaskStatusManager: React.FC<TaskStatusManagerProps> = ({ task, onStatusChange }) => {
  const { toast } = useToast();
  const { updateData } = useSupabase();
  const { user } = useAuth();
  const { notifyTaskStatusChange, notifyFileUploadedToProject } = useNotificationTriggers();
  
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur peut modifier le statut
  const canModifyStatus = () => {
    return task.assigned_to === user?.id || task.validators.includes(user?.id || '');
  };

  // Vérifier si l'utilisateur peut démarrer la tâche
  const canStartTask = () => {
    return task.assigned_to === user?.id && task.status === 'assigned';
  };

  // Vérifier si l'utilisateur peut soumettre la tâche
  const canSubmitTask = () => {
    return task.assigned_to === user?.id && task.status === 'in_progress';
  };

  // Vérifier si l'utilisateur peut valider la tâche
  const canValidateTask = () => {
    return task.validators.includes(user?.id || '') && task.status === 'submitted';
  };

  // Vérifier si l'utilisateur peut rejeter la tâche
  const canRejectTask = () => {
    return task.validators.includes(user?.id || '') && task.status === 'submitted';
  };

  // Fonction pour changer le statut d'une tâche
  const changeTaskStatus = async (newStatus: string) => {
    if (!canModifyStatus()) {
      toast({
        title: "Erreur",
        description: "Vous n'avez pas les permissions pour modifier cette tâche",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updateData_obj: any = {
        id: task.id,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Ajouter des champs spécifiques selon le statut
      switch (newStatus) {
        case 'in_progress':
          updateData_obj.started_at = new Date().toISOString();
          break;
        case 'submitted':
          updateData_obj.submitted_at = new Date().toISOString();
          break;
        case 'validated':
          updateData_obj.validated_at = new Date().toISOString();
          updateData_obj.validated_by = user?.id;
          break;
        case 'rejected':
          updateData_obj.validated_at = new Date().toISOString();
          updateData_obj.validated_by = user?.id;
          break;
      }

      const result = await updateData('task_assignments', updateData_obj);
      
      if (result) {
        // Récupérer le nom de l'utilisateur qui effectue l'action
        const userName = user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email || 'Utilisateur';

        // Envoyer les notifications
        await notifyTaskStatusChange(
          task.project_id,
          task.task_name,
          newStatus,
          userName,
          task.project_name
        );

        toast({
          title: "Succès",
          description: `Statut de la tâche mis à jour vers "${getStatusLabel(newStatus)}"`,
        });

        onStatusChange();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la tâche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour notifier l'upload d'un fichier
  const notifyFileUpload = async (fileName: string) => {
    try {
      const userName = user?.user_metadata?.first_name && user?.user_metadata?.last_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
        : user?.email || 'Utilisateur';

      await notifyFileUploadedToProject(
        task.project_id,
        fileName,
        userName,
        task.task_name,
        task.project_name
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assignée';
      case 'in_progress': return 'En cours';
      case 'submitted': return 'Soumise';
      case 'validated': return 'Validée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  // Obtenir la couleur du badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'submitted': return <Upload className="h-4 w-4" />;
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Statut actuel */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Statut actuel:</span>
        <Badge className={getStatusColor(task.status)}>
          {getStatusIcon(task.status)}
          <span className="ml-1">{getStatusLabel(task.status)}</span>
        </Badge>
      </div>

      {/* Actions disponibles */}
      <div className="flex flex-wrap gap-2">
        {canStartTask() && (
          <Button
            onClick={() => changeTaskStatus('in_progress')}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Démarrer la tâche
          </Button>
        )}

        {canSubmitTask() && (
          <Button
            onClick={() => changeTaskStatus('submitted')}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Soumettre pour validation
          </Button>
        )}

        {canValidateTask() && (
          <Button
            onClick={() => changeTaskStatus('validated')}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Valider
          </Button>
        )}

        {canRejectTask() && (
          <Button
            onClick={() => changeTaskStatus('rejected')}
            disabled={loading}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeter
          </Button>
        )}
      </div>

      {/* Informations sur les permissions */}
      {!canModifyStatus() && (
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Vous n'avez pas les permissions pour modifier le statut de cette tâche.
        </div>
      )}
    </div>
  );
};

export default TaskStatusManager; 