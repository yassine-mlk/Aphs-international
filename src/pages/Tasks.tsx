import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Search, 
  Filter,
  Calendar,
  ArrowRight,
  UserCheck,
  PenTool,
  SortAsc,
  SortDesc,
  LayoutGrid,
  Layers,
  Flag
} from 'lucide-react';
import { TaskListSkeleton } from '@/components/Skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  task_name: string;
  status: string;
  deadline: string;
  project_name: string;
  project_id: string;
  phase_id: string;
  assignment_type: 'standard' | 'workflow';
  section_name?: string;
  subsection_name?: string;
  priority?: string;
  assigned_to: string[];
  validators: any[];
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  in_review: 'En revue',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  vso: 'Visa Sans Obs.',
  vao: 'Visa Avec Obs.',
  var: 'Visa À Resoumettre',
  closed: 'Clôturée',
  blocked: 'Bloquée'
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  in_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  vso: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  vao: 'bg-orange-100 text-orange-800 border-orange-200',
  var: 'bg-rose-100 text-rose-800 border-rose-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  blocked: 'bg-purple-100 text-purple-800 border-purple-200'
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const BORDER_COLORS: Record<string, string> = {
  open: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  vso: 'bg-emerald-500',
  vao: 'bg-orange-500',
  var: 'bg-rose-500',
  closed: 'bg-gray-400',
  blocked: 'bg-purple-500'
};

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status: authStatus } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'executor' | 'validator'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Tri
  const [sortBy, setSortBy] = useState<'deadline' | 'project' | 'name'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (authStatus === 'authenticated' && user?.id) {
      loadTasks();
    }
  }, [user?.id, authStatus]);

  const loadTasks = async () => {
    if (authStatus !== 'authenticated' || !user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_assignments_view')
        .select('*');
        
      if (error) throw error;
      
      // Filtrer les tâches où l'utilisateur est soit exécuteur soit validateur
      const userTasks = (data || []).filter((t: any) => 
        t.assigned_to?.includes(user.id) || 
        (t.validators || []).some((v: any) => v.user_id === user.id)
      );
      
      setTasks(userTasks as Task[]);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
    } finally {
      setLoading(false);
    }
  };

  const projects = useMemo(() => {
    const uniqueProjects = new Set<string>();
    const projectList: { id: string, name: string }[] = [];
    
    tasks.forEach(task => {
      if (!uniqueProjects.has(task.project_id)) {
        uniqueProjects.add(task.project_id);
        projectList.push({ id: task.project_id, name: task.project_name });
      }
    });
    
    return projectList.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(task => {
      const matchesSearch = 
        task.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.section_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesType = typeFilter === 'all' || task.assignment_type === typeFilter;
      const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
      
      const isExecutor = task.assigned_to?.includes(user?.id || '');
      const isValidator = (task.validators || []).some((v: any) => v.user_id === user?.id);
      
      const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'executor' && isExecutor) || 
                        (roleFilter === 'validator' && isValidator);
      
      return matchesSearch && matchesStatus && matchesType && matchesProject && matchesRole;
    });

    // Tri
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'deadline') {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (sortBy === 'project') {
        comparison = (a.project_name || '').localeCompare(b.project_name || '');
      } else if (sortBy === 'name') {
        comparison = (a.task_name || '').localeCompare(b.task_name || '');
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchTerm, statusFilter, typeFilter, projectFilter, roleFilter, sortBy, sortOrder, user?.id]);

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status] || status;
  };

  const getTaskDetailsPath = (task: Task) => {
    return `/dashboard/tasks/${task.id}`;
  };

  const toggleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* En-tête ultra-simplifié */}
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-aps-navy tracking-tight">Mes Tâches</h1>
          <p className="text-slate-500 mt-1">Gérez vos interventions et validations en un coup d'œil.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-4xl font-light text-aps-teal">{filteredAndSortedTasks.length}</span>
          <span className="text-xs uppercase tracking-widest text-slate-400 block font-semibold">Tâches actives</span>
        </div>
      </div>

      <Tabs defaultValue="all" value={typeFilter} onValueChange={setTypeFilter} className="space-y-6">
        {/* Barre d'outils simplifiée */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une tâche, un projet..."
              className="pl-10 h-11 bg-slate-50 border-none shadow-sm focus-visible:ring-aps-teal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="lg:col-span-8 flex flex-wrap gap-2 items-center justify-end">
            <div className="bg-slate-100 p-1 rounded-lg">
              <TabsList className="h-9 bg-transparent">
                <TabsTrigger value="all" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Toutes</TabsTrigger>
                <TabsTrigger value="standard" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Standard</TabsTrigger>
                <TabsTrigger value="workflow" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Workflows</TabsTrigger>
              </TabsList>
            </div>

            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger className="h-11 w-[140px] bg-white border-slate-200">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="executor">Exécuteur</SelectItem>
                <SelectItem value="validator">Validateur</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[150px] bg-white border-slate-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-11 w-[160px] bg-white border-slate-200">
                <SelectValue placeholder="Projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous projets</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || projectFilter !== 'all' || typeFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                  setProjectFilter('all');
                  setTypeFilter('all');
                }}
                className="h-11 px-4 text-slate-500 hover:text-red-500 hover:bg-red-50"
              >
                Effacer
              </Button>
            )}
          </div>
        </div>

        <TabsContent value={typeFilter} className="mt-0">
          {loading ? (
          <TaskListSkeleton />
        ) : filteredAndSortedTasks.length > 0 ? (
          <div className="grid gap-3">
            {filteredAndSortedTasks.map((task) => {
              const isExecutor = task.assigned_to?.includes(user?.id || '');
              const isValidator = (task.validators || []).some((v: any) => v.user_id === user?.id);
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
                              !['approved', 'vso', 'closed'].includes(task.status);

              return (
                <div 
                  key={task.id}
                  onClick={() => navigate(getTaskDetailsPath(task))}
                  className={cn(
                    "group flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-aps-teal hover:shadow-md transition-all cursor-pointer relative overflow-hidden",
                    isOverdue && "border-red-200 bg-red-50/30"
                  )}
                >
                  {/* Rôle - Très visible à gauche */}
                  <div className="flex sm:flex-col gap-2 shrink-0 sm:w-24">
                    {isExecutor && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                        <PenTool className="h-3 w-3" />
                        <span>Exécuteur</span>
                      </div>
                    )}
                    {isValidator && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
                        <UserCheck className="h-3 w-3" />
                        <span>Validateur</span>
                      </div>
                    )}
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-aps-teal transition-colors truncate">
                        {task.task_name}
                      </h3>
                      <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase border-0", getStatusColor(task.status))}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="font-bold text-aps-navy uppercase tracking-tight">{task.project_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate opacity-80">
                        {task.section_name} {task.subsection_name && `› ${task.subsection_name}`}
                      </span>
                    </div>
                  </div>

                  {/* Infos de fin de ligne */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className={cn(
                      "flex flex-col items-end",
                      isOverdue ? "text-red-600" : "text-slate-500"
                    )}>
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Échéance</span>
                      <div className="flex items-center gap-1.5 font-bold tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '--'}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-full group-hover:bg-aps-teal group-hover:text-white transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <ClipboardCheck className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Aucune tâche</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-1">
                Aucune tâche ne correspond à vos critères de recherche actuels.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                  setProjectFilter('all');
                  setTypeFilter('all');
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tasks;

