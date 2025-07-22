import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from '@/hooks/useSupabase';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { Plus, Calendar, User, FileText, Clock, CheckCircle, XCircle, AlertCircle, Upload, Download, Eye } from 'lucide-react';
import { ProjectTask, TaskFormData, Profile, ProjectTaskHistory, TASK_STATUSES, TASK_PRIORITIES } from '../types/project';

interface TaskManagerProps {
  projectId: string;
  projectName: string;
  currentUserId: string;
  userRole: 'owner' | 'manager' | 'member' | 'viewer';
}

const TaskManager: React.FC<TaskManagerProps> = ({ projectId, projectName, currentUserId, userRole }) => {
  const { toast } = useToast();
  const { fetchData, insertData, updateData, uploadFile } = useSupabase();
  const {
    notifyFileValidationRequest,
    createAdminNotification,
    notifyTaskStatusChange,
    notifyFileUploadedToProject
  } = useNotificationTriggers();
  
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<ProjectTaskHistory[]>([]);
  
  // États des dialogues
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  
  // Formulaire de création/édition
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    task_type: 'general',
    assigned_to: '',
    validators: [],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium',
    comments: ''
  });
  
  // Fichier pour upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationComments, setValidationComments] = useState('');
  
  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [projectId]);
  
  const loadTasks = async () => {
    try {
      const data = await fetchData<ProjectTask>('project_tasks', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
        order: { column: 'created_at', ascending: false }
      });
      setTasks(data);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tâches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadUsers = async () => {
    try {
      const data = await fetchData<Profile>('profiles', {
        columns: 'user_id, first_name, last_name, email, role'
      });
      setUsers(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };
  
  const loadTaskHistory = async (taskId: string) => {
    try {
      const data = await fetchData<ProjectTaskHistory>('project_task_history', {
        filters: [{ column: 'task_id', operator: 'eq', value: taskId }],
        order: { column: 'performed_at', ascending: false }
      });
      setTaskHistory(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };
  
  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre de la tâche est obligatoire",
        variant: "destructive",
      });
      return;
    }
    
    if (!taskForm.assigned_to) {
      toast({
        title: "Erreur",
        description: "Veuillez assigner la tâche à un utilisateur",
        variant: "destructive",
      });
      return;
    }
    
    if (taskForm.validators.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un validateur",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const newTask = {
        project_id: projectId,
        ...taskForm,
        assigned_by: currentUserId,
        due_date: new Date(taskForm.due_date).toISOString()
      };
      
      const result = await insertData<ProjectTask>('project_tasks', newTask);
      
      if (result) {
        toast({
          title: "Succès",
          description: "Tâche créée avec succès",
        });
        setIsCreateDialogOpen(false);
        resetTaskForm();
        loadTasks();
      }
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la tâche",
        variant: "destructive",
      });
    }
  };
  
  const handleSubmitTask = async (task: ProjectTask) => {
    if (!selectedFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier à soumettre",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Upload du fichier
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `tasks/${task.id}/${fileName}`;
      
      const uploadResult = await uploadFile('task-files', filePath, selectedFile);
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }
      
      // Mise à jour de la tâche
      const updatedTask = {
        ...task,
        status: 'submitted' as const,
        submitted_at: new Date().toISOString(),
        file_url: uploadResult.data?.publicUrl || uploadResult.data?.fullPath || '',
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        comments: taskForm.comments
      };
      
      const result = await updateData<ProjectTask>('project_tasks', updatedTask);
      
      if (result) {
        // === NOTIFICATIONS SYSTÈME ===
        try {
          // Récupérer le nom de l'utilisateur qui soumet
          const uploaderUser = users.find(u => u.user_id === currentUserId);
          const uploaderName = uploaderUser ? 
            `${uploaderUser.first_name} ${uploaderUser.last_name}` : 
            'Intervenant inconnu';
            
          // 1. Notifier tous les membres du projet et l'admin
          await notifyFileUploadedToProject(
            projectId,
            selectedFile.name,
              uploaderName,
            task.title,
            projectName
          );
          
          // 2. Notifier le changement de statut
          await notifyTaskStatusChange(
            projectId,
            task.title,
            'submitted',
              uploaderName,
              projectName
            );
          
          console.log(`TaskManager: Notifications envoyées pour tous les membres du projet`);
        } catch (notificationError) {
          console.error('Erreur lors de l\'envoi des notifications:', notificationError);
          // Ne pas faire échouer la soumission si les notifications échouent
        }
        
        toast({
          title: "Succès",
          description: "Tâche soumise avec succès",
        });
        setSelectedFile(null);
        setTaskForm({ ...taskForm, comments: '' });
        setIsSubmitDialogOpen(false);
        loadTasks();
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre la tâche",
        variant: "destructive",
      });
    }
  };
  
  const handleValidateTask = async (task: ProjectTask, isApproved: boolean) => {
    try {
      const updatedTask = {
        ...task,
        status: isApproved ? 'validated' as const : 'rejected' as const,
        validated_by: currentUserId,
        validated_at: new Date().toISOString(),
        validation_comments: validationComments,
        ...(isApproved && { completed_at: new Date().toISOString() })
      };
      
      const result = await updateData<ProjectTask>('project_tasks', updatedTask);
      
      if (result) {
        toast({
          title: "Succès",
          description: `Tâche ${isApproved ? 'validée' : 'rejetée'} avec succès`,
        });
        setIsValidationDialogOpen(false);
        setValidationComments('');
        loadTasks();
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la tâche",
        variant: "destructive",
      });
    }
  };
  
  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      task_type: 'general',
      assigned_to: '',
      validators: [],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      comments: ''
    });
  };
  
  const getStatusBadge = (status: ProjectTask['status']) => {
    const statusConfig = {
      assigned: { label: 'Assigné', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'En cours', className: 'bg-yellow-100 text-yellow-800' },
      submitted: { label: 'Soumis', className: 'bg-purple-100 text-purple-800' },
      validated: { label: 'Validé', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status];
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };
  
  const getPriorityBadge = (priority: ProjectTask['priority']) => {
    const priorityConfig = {
      low: { label: 'Faible', className: 'bg-green-100 text-green-800' },
      medium: { label: 'Moyenne', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'Élevée', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgente', className: 'bg-red-100 text-red-800' }
    };
    
    const config = priorityConfig[priority];
    
    return (
      <Badge className={config.className}>
        <AlertCircle className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };
  
  const canUserValidate = (task: ProjectTask) => {
    return task.validators.includes(currentUserId);
  };
  
  const canUserSubmit = (task: ProjectTask) => {
    return task.assigned_to === currentUserId && task.status === 'assigned';
  };
  
  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Utilisateur inconnu';
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tâches du projet</h2>
          <p className="text-gray-600">{projectName}</p>
        </div>
        {(userRole === 'owner' || userRole === 'manager') && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </Button>
        )}
      </div>
      
      <div className="grid gap-4">
        {tasks.map(task => (
          <Card key={task.id} className="border-l-4 border-l-aphs-teal">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Assigné à: {getUserName(task.assigned_to)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Échéance: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Type: {task.task_type}</span>
                </div>
                {task.file_url && (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-gray-500" />
                    <a 
                      href={task.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-aphs-teal hover:underline"
                    >
                      {task.file_name}
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {canUserSubmit(task) && (
                  <Button size="sm" onClick={() => {
                    setSelectedTask(task);
                    setIsSubmitDialogOpen(true);
                  }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Soumettre
                  </Button>
                )}
                
                {canUserValidate(task) && task.status === 'submitted' && (
                  <Button size="sm" onClick={() => {
                    setSelectedTask(task);
                    setIsValidationDialogOpen(true);
                  }}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Valider
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(task);
                    loadTaskHistory(task.id);
                    setIsHistoryDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Historique
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Aucune tâche</h3>
          <p className="text-gray-500">Ce projet n'a pas encore de tâches.</p>
        </div>
      )}
      
      {/* Dialog de création de tâche */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle tâche</DialogTitle>
            <DialogDescription>
              Remplissez les informations de la tâche à créer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Titre<span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  placeholder="Titre de la tâche"
                />
              </div>
              <div>
                <Label htmlFor="task_type">Type</Label>
                <Input
                  id="task_type"
                  value={taskForm.task_type}
                  onChange={(e) => setTaskForm({...taskForm, task_type: e.target.value})}
                  placeholder="Type de tâche"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                placeholder="Description détaillée de la tâche"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assigned_to">Assigné à<span className="text-red-500">*</span></Label>
                <select
                  id="assigned_to"
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="priority">Priorité</Label>
                <select
                  id="priority"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({...taskForm, priority: e.target.value as ProjectTask['priority']})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TASK_PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="validators">Validateurs<span className="text-red-500">*</span></Label>
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                {users.map(user => (
                  <label key={user.user_id} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={taskForm.validators.includes(user.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTaskForm({
                            ...taskForm,
                            validators: [...taskForm.validators, user.user_id]
                          });
                        } else {
                          setTaskForm({
                            ...taskForm,
                            validators: taskForm.validators.filter(id => id !== user.user_id)
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{user.first_name} {user.last_name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="due_date">Date d'échéance<span className="text-red-500">*</span></Label>
              <Input
                id="due_date"
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateTask}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de soumission de tâche */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Soumettre la tâche</DialogTitle>
            <DialogDescription>
              Téléchargez votre fichier et ajoutez des commentaires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="file">Fichier à soumettre<span className="text-red-500">*</span></Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="comments">Commentaires</Label>
              <Textarea
                id="comments"
                value={taskForm.comments}
                onChange={(e) => setTaskForm({...taskForm, comments: e.target.value})}
                placeholder="Commentaires sur votre soumission"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => selectedTask && handleSubmitTask(selectedTask)}>
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de validation */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Valider la tâche</DialogTitle>
            <DialogDescription>
              Approuvez ou rejetez cette tâche avec vos commentaires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedTask?.file_url && (
              <div>
                <Label>Fichier soumis</Label>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Download className="h-4 w-4" />
                  <a 
                    href={selectedTask.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-aphs-teal hover:underline"
                  >
                    {selectedTask.file_name}
                  </a>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="validation_comments">Commentaires de validation</Label>
              <Textarea
                id="validation_comments"
                value={validationComments}
                onChange={(e) => setValidationComments(e.target.value)}
                placeholder="Vos commentaires sur cette soumission"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidationDialogOpen(false)}>Annuler</Button>
            <Button 
              variant="destructive"
              onClick={() => selectedTask && handleValidateTask(selectedTask, false)}
            >
              Rejeter
            </Button>
            <Button onClick={() => selectedTask && handleValidateTask(selectedTask, true)}>
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog d'historique */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Historique de la tâche</DialogTitle>
            <DialogDescription>
              Historique complet des actions effectuées sur cette tâche.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {taskHistory.length > 0 ? (
              taskHistory.map(entry => (
                <div key={entry.id} className="border-b pb-3 mb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{entry.action}</p>
                      <p className="text-sm text-gray-600">
                        Par {getUserName(entry.performed_by)} - {new Date(entry.performed_at).toLocaleString()}
                      </p>
                    </div>
                    {entry.new_status && (
                      <Badge variant="outline">
                        {entry.previous_status} → {entry.new_status}
                      </Badge>
                    )}
                  </div>
                  {entry.comments && (
                    <p className="text-sm bg-gray-50 p-2 rounded">{entry.comments}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">Aucun historique disponible</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManager; 