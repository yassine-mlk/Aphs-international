import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Search, 
  Calendar,
  ArrowRight,
  UserCheck,
  PenTool,
  LayoutGrid,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TaskListSkeleton } from '@/components/Skeletons';
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
import { useTenant } from '@/contexts/TenantContext';

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

const AdminTasks: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  
  // Tri
  const [sortBy, setSortBy] = useState<'deadline' | 'project' | 'name'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (tenant?.id) {
      loadTasks();
    }
  }, [tenant?.id]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_assignments_view')
        .select('*')
        .eq('tenant_id', tenant?.id);
        
      if (error) throw error;
      
      setTasks(data as Task[] || []);
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
      
      let matchesPeriod = true;
      if (periodFilter !== 'all' && task.deadline) {
        const deadline = new Date(task.deadline);
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        if (periodFilter === 'today') {
          matchesPeriod = deadline.toDateString() === new Date().toDateString();
        } else if (periodFilter === 'week') {
          matchesPeriod = deadline >= startOfWeek && deadline <= endOfWeek;
        } else if (periodFilter === 'month') {
          matchesPeriod = deadline >= startOfMonth && deadline <= endOfMonth;
        } else if (periodFilter === 'overdue') {
          matchesPeriod = deadline < new Date() && !['approved', 'vso', 'closed'].includes(task.status);
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesProject && matchesPeriod;
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
  }, [tasks, searchTerm, statusFilter, typeFilter, projectFilter, periodFilter, sortBy, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des Tâches</h1>
          <p className="text-gray-500 mt-1">Supervisez l'ensemble des tâches et workflows de vos projets.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-4xl font-light text-blue-600">{tasks.length}</span>
            <span className="text-xs uppercase tracking-widest text-gray-400 block font-semibold">Total Tâches</span>
          </div>
          <div className="text-right">
            <span className="text-4xl font-light text-red-500">
              {tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !['approved', 'vso', 'closed'].includes(t.status)).length}
            </span>
            <span className="text-xs uppercase tracking-widest text-gray-400 block font-semibold">En retard</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" value={typeFilter} onValueChange={setTypeFilter} className="space-y-6">
        {/* Filters Bar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
          <div className="xl:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une tâche, un projet..."
              className="pl-10 h-11 bg-white border-gray-200 shadow-sm focus-visible:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="xl:col-span-9 flex flex-wrap gap-2 items-center justify-end">
            <div className="bg-gray-100 p-1 rounded-lg">
              <TabsList className="h-9 bg-transparent">
                <TabsTrigger value="all" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Toutes</TabsTrigger>
                <TabsTrigger value="standard" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Standard</TabsTrigger>
                <TabsTrigger value="workflow" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Workflows</TabsTrigger>
              </TabsList>
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-11 w-[180px] bg-white border-gray-200">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[160px] bg-white border-gray-200">
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-11 w-[160px] bg-white border-gray-200">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes périodes</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all' || typeFilter !== 'all' || periodFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setProjectFilter('all');
                  setTypeFilter('all');
                  setPeriodFilter('all');
                }}
                className="h-11 px-4 text-gray-500 hover:text-red-500 hover:bg-red-50"
              >
                Réinitialiser
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
                const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
                                !['approved', 'vso', 'closed'].includes(task.status);

                return (
                  <div 
                    key={task.id}
                    onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                    className={cn(
                      "group flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden",
                      isOverdue && "border-red-200 bg-red-50/30"
                    )}
                  >
                    {/* Icon Type */}
                    <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
                      {task.assignment_type === 'workflow' ? (
                        <LayoutGrid className="h-6 w-6 text-purple-500" />
                      ) : (
                        <ClipboardCheck className="h-6 w-6 text-blue-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {task.task_name}
                        </h3>
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-bold uppercase border-0", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="font-bold text-gray-900 uppercase tracking-tight">{task.project_name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="truncate opacity-80">
                          {task.section_name} {task.subsection_name && `› ${task.subsection_name}`}
                        </span>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Assignés</span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-700">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{task.assigned_to?.length || 0}</span>
                        </div>
                      </div>

                      <div className={cn(
                        "flex flex-col items-end",
                        isOverdue ? "text-red-600" : "text-gray-500"
                      )}>
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Échéance</span>
                        <div className="flex items-center gap-1.5 font-bold tabular-nums">
                          <Calendar className="h-3.5 w-3.5" />
                          {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '--'}
                        </div>
                      </div>

                      <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Filter className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Aucune tâche trouvée</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-1">
                Aucune tâche ne correspond à vos filtres actuels.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setProjectFilter('all');
                  setTypeFilter('all');
                  setPeriodFilter('all');
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

export default AdminTasks;
