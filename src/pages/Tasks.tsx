import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  Search, 
  Filter,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { TaskListSkeleton } from '@/components/Skeletons';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  task_name: string;
  status: string;
  deadline: string;
  project_name: string;
  phase: string;
}

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { fetchData } = useSupabase();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const result = await fetchData('task_assignments');
      const data = result as any;
      if (data?.error) throw data.error;
      
      // Filtrer les tâches assignées à l'utilisateur
      const userTasks = (data || []).filter((t: any) => 
        t.assigned_to?.includes(user.id)
      );
      
      setTasks(userTasks);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validée';
      case 'submitted': return 'Soumise';
      case 'in_progress': return 'En cours';
      case 'assigned': return 'Assignée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-aps-navy text-white rounded-lg">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mes Tâches</h1>
            <p className="text-muted-foreground">
              Suivez et gérez vos assignations sur tous les projets
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher une tâche ou un projet..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="assigned">Assignée</option>
            <option value="in_progress">En cours</option>
            <option value="submitted">Soumise</option>
            <option value="validated">Validée</option>
            <option value="rejected">Rejetée</option>
          </select>
        </div>
      </div>

      {loading ? (
        <TaskListSkeleton />
      ) : filteredTasks.length > 0 ? (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
              onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                  <div className={`w-2 sm:self-stretch ${
                    task.status === 'validated' ? 'bg-green-500' :
                    task.status === 'submitted' ? 'bg-blue-500' :
                    task.status === 'in_progress' ? 'bg-yellow-500' :
                    task.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  
                  <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{task.task_name}</h3>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-medium text-aps-navy">{task.project_name}</span>
                        <span>•</span>
                        <span>{task.phase}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Échéance: {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR') : 'Non définie'}</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-full bg-gray-50 group-hover:bg-aps-teal group-hover:text-white transition-colors">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground italic">Aucune tâche trouvée</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tasks;
