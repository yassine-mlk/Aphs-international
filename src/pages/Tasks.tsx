import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr, enUS, es, ar } from 'date-fns/locale';
import { useSupabase } from '@/hooks/useSupabase';
import { useTaskMigration } from '@/hooks/useTaskMigration';
import { LegacyTaskAssignment } from '../types/legacy-migration';
import {
  Search,
  Calendar,
  FileUp,
  User,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

// Interface for project
interface Project {
  id: string;
  name: string;
}

// Interface for user/intervenant
interface Intervenant {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

// Interface for task assignment
// Utilisation de l'interface LegacyTaskAssignment importée
type TaskAssignment = LegacyTaskAssignment;

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { fetchTasksForUser, loading: taskMigrationLoading, error: taskMigrationError } = useTaskMigration();
  
  const t = translations[language as keyof typeof translations].tasks;
  
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Projects list for filter
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Check user role
  const userRole = user?.user_metadata?.role || '';
  const isIntervenant = userRole === 'intervenant' || userRole === 'maitre_ouvrage';
  
  // Redirect admins to another page
  if (user && !isIntervenant) {
    return <Navigate to="/dashboard" replace />;
  }
  
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        // Utiliser le nouveau hook de migration pour récupérer les tâches
        const userTasks = await fetchTasksForUser(user.id);
        
        // Récupérer les profils des utilisateurs assignés
        const userIds = Array.from(new Set(
          userTasks.map(task => task.assigned_to)
        )).filter(id => id);
        
        if (userIds.length > 0) {
          const profiles = await fetchData<Intervenant>('profiles', {
            columns: 'user_id,email,first_name,last_name,role',
            filters: userIds.map(id => ({ column: 'user_id', operator: 'eq', value: id }))
          });
          
          // Mapper les profils aux tâches
          const tasksWithUsers = userTasks.map(task => {
            const userProfile = profiles.find(profile => profile.id === task.assigned_to);
            return {
              ...task,
              assigned_user: userProfile ? {
                id: userProfile.id,
                email: userProfile.email,
                first_name: userProfile.first_name,
                last_name: userProfile.last_name,
                role: userProfile.role
              } : undefined
            };
          });
          
          setTasks(tasksWithUsers);
        } else {
          setTasks(userTasks);
        }
        
        // Récupérer la liste des projets pour le filtre
        const projectIds = Array.from(new Set(
          userTasks.map(task => task.project_id)
        )).filter(Boolean);
        
        if (projectIds.length > 0) {
          try {
            const projectsData = await fetchData<Project>('projects', {
              columns: 'id,name',
              filters: [{ column: 'id', operator: 'in', value: projectIds }]
            });
            
            if (projectsData && projectsData.length > 0) {
              setProjects(projectsData);
            }
          } catch (error) {
            console.error('Erreur lors de la récupération des projets:', error);
          }
        }
        
        // Afficher l'erreur de migration si elle existe
        if (taskMigrationError) {
          toast({
            title: t.messages.warning,
            description: taskMigrationError,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        toast({
          title: t.messages.error,
          description: t.messages.errorLoadingTasks,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [fetchTasksForUser, fetchData, toast, user, taskMigrationError]);
  
  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    // Search query
    const searchFields = [
      task.task_name,
      task.phase_id,
      task.section_id,
      task.subsection_id,
      task.project?.name || '',
      task.assigned_user ? 
        (task.assigned_user.first_name && task.assigned_user.last_name ?
          `${task.assigned_user.first_name} ${task.assigned_user.last_name}` :
          task.assigned_user.email) :
        ''
    ];
    
    const matchesSearch = searchQuery === '' || 
      searchFields.some(field => 
        field.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    // Phase filter
    const matchesPhase = phaseFilter === 'all' || task.phase_id === phaseFilter;
    
    // Project filter
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
    
    return matchesSearch && matchesStatus && matchesPhase && matchesProject;
  });
  
  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'deadline':
        aValue = new Date(a.deadline);
        bValue = new Date(b.deadline);
        break;
      case 'task_name':
        aValue = a.task_name.toLowerCase();
        bValue = b.task_name.toLowerCase();
        break;
      case 'project':
        aValue = (a.project?.name || '').toLowerCase();
        bValue = (b.project?.name || '').toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        aValue = new Date(a.deadline);
        bValue = new Date(b.deadline);
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
  
  const handleTaskClick = (taskId: string) => {
    navigate(`/dashboard/tasks/${taskId}`);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-yellow-500">{t.status.assigned}</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">{t.status.inProgress}</Badge>;
      case 'submitted':
        return <Badge className="bg-orange-500">{t.status.submitted}</Badge>;
      case 'validated':
        return <Badge className="bg-green-500">{t.status.validated}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">{t.status.rejected}</Badge>;
      default:
        return <Badge className="bg-gray-500">{t.status.unknown}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const localeMap = {
        fr: fr,
        en: enUS,
        es: es,
        ar: ar
      };
      const locale = localeMap[language as keyof typeof localeMap] || enUS;
      return format(new Date(dateString), 'dd MMM yyyy', { locale });
    } catch (error) {
      return t.dateFormat.invalidDate;
    }
  };
  
  const getRemainingDays = (deadlineDate: string) => {
    try {
      const deadline = new Date(deadlineDate).getTime();
      const today = new Date().getTime();
      const diff = deadline - today;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days;
    } catch (error) {
      return 0;
    }
  };
  
  const getDeadlineLabel = (deadlineDate: string) => {
    const days = getRemainingDays(deadlineDate);
    
    if (days < 0) {
      return <Badge variant="destructive">{t.dateFormat.overdue} {Math.abs(days)} {t.dateFormat.daysOverdue}</Badge>;
    } else if (days === 0) {
      return <Badge variant="destructive">{t.dateFormat.today}</Badge>;
    } else if (days <= 3) {
      return <Badge variant="destructive">{days} {t.dateFormat.daysRemaining}</Badge>;
    } else if (days <= 7) {
      return <Badge variant="default" className="bg-orange-500">{days} {t.dateFormat.daysRemaining}</Badge>;
    } else {
      return <Badge variant="outline">{days} {t.dateFormat.daysRemaining}</Badge>;
    }
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPhaseFilter('all');
    setProjectFilter('all');
    setSortBy('deadline');
    setSortOrder('asc');
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.subtitle}
        </p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">{t.search.label}</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder={t.search.placeholder}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full">
            <label className="block text-sm font-medium mb-1">{t.filters.statusLabel}</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t.filters.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.all}</SelectItem>
                <SelectItem value="assigned">{t.filters.assigned}</SelectItem>
                <SelectItem value="in_progress">{t.filters.inProgress}</SelectItem>
                <SelectItem value="submitted">{t.filters.submitted}</SelectItem>
                <SelectItem value="validated">{t.filters.validated}</SelectItem>
                <SelectItem value="rejected">{t.filters.rejected}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full">
            <label className="block text-sm font-medium mb-1">{t.filters.phase}</label>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t.filters.allPhases} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.allPhases}</SelectItem>
                <SelectItem value="conception">{t.filters.conception}</SelectItem>
                <SelectItem value="realisation">{t.filters.realization}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full">
            <label className="block text-sm font-medium mb-1">Projet</label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Sort controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium mb-1">Trier par</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Échéance</SelectItem>
                <SelectItem value="task_name">Nom de la tâche</SelectItem>
                <SelectItem value="project">Projet</SelectItem>
                <SelectItem value="status">Statut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium mb-1">Ordre</label>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Croissant</SelectItem>
                <SelectItem value="desc">Décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(searchQuery || statusFilter !== 'all' || phaseFilter !== 'all' || projectFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="flex items-center gap-1 h-10"
            >
              <X className="h-4 w-4" />
              <span>{t.filters.clear}</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Task List */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>{t.card.taskList} ({sortedTasks.length})</CardTitle>
          <CardDescription>
            {sortedTasks.length === 0 ? 
              t.search.noResults : 
              t.card.taskListDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTasks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.card.task}</TableHead>
                    <TableHead>{t.card.project}</TableHead>
                    <TableHead>{t.filters.statusLabel}</TableHead>
                    <TableHead>{t.card.deadline}</TableHead>
                    <TableHead>{t.card.type}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => (
                    <TableRow 
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{task.task_name}</span>
                          <span className="text-xs text-gray-500">
                            {task.phase_id === 'conception' ? t.filters.conception : t.filters.realization} &gt; {task.section_id} &gt; {task.subsection_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{task.project?.name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-xs">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="mt-1">
                            {getDeadlineLabel(task.deadline)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileUp className="h-4 w-4 text-gray-500" />
                          <span className="text-xs uppercase">
                            {task.file_extension === 'pdf' && 'PDF'}
                            {task.file_extension === 'doc' && 'WORD'}
                            {task.file_extension === 'xls' && 'EXCEL'}
                            {task.file_extension === 'ppt' && 'POWERPOINT'}
                            {task.file_extension === 'txt' && 'TEXTE'}
                            {task.file_extension === 'jpg' && 'JPEG'}
                            {task.file_extension === 'png' && 'PNG'}
                            {task.file_extension === 'zip' && 'ZIP'}
                            {task.file_extension === 'dwg' && 'AUTOCAD'}
                            {task.file_extension === 'other' && 'AUTRE'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">{t.empty.noTasks}</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' || phaseFilter !== 'all' || projectFilter !== 'all' ? 
                  t.empty.noResultsDesc : 
                  t.empty.noTasksDesc}
              </p>
              {(searchQuery || statusFilter !== 'all' || phaseFilter !== 'all' || projectFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-4"
                >
                  {t.filters.clearFilters}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks; 