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
      const { data, error } = await fetchData('task_assignments');
      if (error) throw error;
      
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Mes Tâches</h1>
        <p className="text-gray-600">Gérez vos tâches assignées</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher une tâche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="assigned">Assignées</option>
          <option value="in_progress">En cours</option>
          <option value="submitted">Soumises</option>
          <option value="validated">Validées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {/* Liste des tâches */}
      {filteredTasks.length > 0 ? (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/dashboard/intervenant/tasks/${task.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClipboardCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{task.task_name}</h3>
                      <p className="text-sm text-gray-600">Projet: {task.project_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>
          <p className="text-gray-500">Vous n'avez pas de tâches correspondant à vos critères.</p>
        </div>
      )}
    </div>
  );
};

export default Tasks;
