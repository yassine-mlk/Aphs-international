import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import { TaskAssignment as DbTaskAssignment } from '@/types/taskAssignment';
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
  specialty?: string;
  company?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

// Interface for task assignment
// Utilisation de l'interface LegacyTaskAssignment importée
type TaskAssignment = LegacyTaskAssignment;

type AdminQuickFilter = 'all' | 'overdue' | 'unassigned' | 'to_validate' | 'blocked';

type AdminSortField = 'deadline' | 'validation_deadline' | 'task_name' | 'project' | 'status';

// Types pour la navigation intervenant
type IntervenantView = 'all' | 'execution' | 'validation';
type ExecutionTab = 'not_started' | 'started' | 'waiting' | 'finished';
type ValidationTab = 'pending_validation' | 'pending_resubmission' | 'validated' | 'rejected';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, supabase } = useSupabase();
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

  // États pour la navigation intervenant
  const [intervenantView, setIntervenantView] = useState<IntervenantView>('all');
  const [executionTab, setExecutionTab] = useState<ExecutionTab>('not_started');
  const [validationTab, setValidationTab] = useState<ValidationTab>('pending_validation');

  // Projects list for filter
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Check user role
  const userRole = user?.user_metadata?.role || '';
  const isIntervenant = userRole === 'intervenant' || userRole === 'maitre_ouvrage';
  const isAdmin = userRole === 'admin' || user?.email === 'admin@aps.com' || JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  // Redirect unknown roles
  if (user && !isIntervenant && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin state
  const [adminTasks, setAdminTasks] = useState<DbTaskAssignment[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminQuickFilter, setAdminQuickFilter] = useState<AdminQuickFilter>('all');
  const [adminAssignedToFilter, setAdminAssignedToFilter] = useState<string>('all');
  const [adminSpecialtyFilter, setAdminSpecialtyFilter] = useState<string>('all');
  const [adminDeadlineFrom, setAdminDeadlineFrom] = useState<string>('');
  const [adminDeadlineTo, setAdminDeadlineTo] = useState<string>('');
  const [adminPage, setAdminPage] = useState(0);
  const [adminHasMore, setAdminHasMore] = useState(true);
  const [adminSortField, setAdminSortField] = useState<AdminSortField>('deadline');
  const [adminSortOrder, setAdminSortOrder] = useState<'asc' | 'desc'>('asc');

  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [adminIntervenants, setAdminIntervenants] = useState<Intervenant[]>([]);
  const [projectMemberMap, setProjectMemberMap] = useState<Record<string, Set<string>>>({});
  
  const loadAdminTasks = useCallback(async (reset: boolean) => {
    if (!user?.id) return;
    setAdminLoading(true);
    try {
      const pageSize = 50;
      const nextPage = reset ? 0 : adminPage;
      const rangeStart = nextPage * pageSize;
      const rangeEnd = rangeStart + pageSize - 1;

      const filters: { column: string; operator: string; value: any }[] = [];

      if (statusFilter !== 'all') {
        filters.push({ column: 'status', operator: 'eq', value: statusFilter });
      }
      if (phaseFilter !== 'all') {
        filters.push({ column: 'phase_id', operator: 'eq', value: phaseFilter });
      }
      if (projectFilter !== 'all') {
        filters.push({ column: 'project_id', operator: 'eq', value: projectFilter });
      }
      if (adminDeadlineFrom) {
        filters.push({ column: 'deadline', operator: 'gte', value: adminDeadlineFrom });
      }
      if (adminDeadlineTo) {
        filters.push({ column: 'deadline', operator: 'lte', value: adminDeadlineTo });
      }
      if (adminAssignedToFilter !== 'all') {
        filters.push({ column: 'assigned_to', operator: 'cs', value: `{${adminAssignedToFilter}}` });
      }

      const dbTasks = await fetchData<DbTaskAssignment>('task_assignments', {
        columns: '*',
        filters: filters.length > 0 ? filters : undefined,
        order: { column: adminSortField, ascending: adminSortOrder === 'asc' },
        range: [rangeStart, rangeEnd]
      });

      const newTasks = reset ? dbTasks : [...adminTasks, ...dbTasks];
      setAdminTasks(newTasks);
      setAdminHasMore(dbTasks.length === pageSize);
      setAdminPage(reset ? 1 : adminPage + 1);

      const projectIds = Array.from(new Set(newTasks.map(t => t.project_id).filter(Boolean)));
      const userIds = Array.from(new Set(newTasks.flatMap(t => [...(t.assigned_to || []), ...(t.validators || [])]).filter(Boolean)));

      if (projectIds.length > 0) {
        const proj = await fetchData<Project>('projects', {
          columns: 'id,name',
          filters: [{ column: 'id', operator: 'in', value: projectIds }]
        });
        setAdminProjects(proj || []);

        const members = await fetchData<any>('membre', {
          columns: 'project_id,user_id',
          filters: [{ column: 'project_id', operator: 'in', value: projectIds }]
        });
        const map: Record<string, Set<string>> = {};
        for (const row of members || []) {
          if (!map[row.project_id]) map[row.project_id] = new Set();
          map[row.project_id].add(row.user_id);
        }
        setProjectMemberMap(map);
      }

      if (userIds.length > 0) {
        const profs = await fetchData<Intervenant>('profiles', {
          columns: 'user_id,email,first_name,last_name,role,specialty,company',
          filters: [{ column: 'user_id', operator: 'in', value: userIds }]
        });
        setAdminIntervenants(profs || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tâches (admin):', error);
      toast({
        title: t.messages.error,
        description: t.messages.errorLoadingTasks,
        variant: 'destructive',
      });
    } finally {
      setAdminLoading(false);
    }
  }, [adminAssignedToFilter, adminDeadlineFrom, adminDeadlineTo, adminPage, adminSortField, adminSortOrder, fetchData, phaseFilter, projectFilter, statusFilter, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);

    if (!user?.id) {
      if (!silent) setLoading(false);
      return;
    }

    if (isAdmin) {
      await loadAdminTasks(true);
      if (!silent) setLoading(false);
      return;
    }

    try {
      const userTasks = await fetchTasksForUser(user.id);

      const allAssignedIds = userTasks.flatMap(task => task.assigned_to || []);
      const userIds = Array.from(new Set(allAssignedIds)).filter(id => id);

      if (userIds.length > 0) {
        const profiles = await fetchData<Intervenant>('profiles', {
          columns: 'user_id,email,first_name,last_name,role',
          filters: [{ column: 'user_id', operator: 'in', value: userIds }]
        });

        const tasksWithUsers = userTasks.map(task => {
          const taskAssignedUsers = profiles.filter(profile =>
            task.assigned_to && task.assigned_to.includes(profile.id)
          ).map(profile => ({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role
          }));

          return {
            ...task,
            assigned_users: taskAssignedUsers
          };
        });

        setTasks(tasksWithUsers);
      } else {
        setTasks(userTasks);
      }

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

      if (taskMigrationError && !silent) {
        toast({
          title: t.messages.warning,
          description: taskMigrationError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
      if (!silent) {
        toast({
          title: t.messages.error,
          description: t.messages.errorLoadingTasks,
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id, isAdmin, loadAdminTasks, fetchTasksForUser, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Ref pour stabiliser sans recréer la subscription
  const loadTasksRef = useRef(loadTasks);
  useEffect(() => {
    loadTasksRef.current = loadTasks;
  }, [loadTasks]);

  // Souscription realtime: mise à jour silencieuse et debouncée
  const tasksRealtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user?.id) return;

    const schedule = () => {
      if (tasksRealtimeTimerRef.current) clearTimeout(tasksRealtimeTimerRef.current);
      tasksRealtimeTimerRef.current = setTimeout(() => {
        loadTasksRef.current({ silent: true });
      }, 600);
    };

    const channel = supabase
      .channel(`tasks-page-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignments' },
        schedule
      )
      .subscribe();

    return () => {
      if (tasksRealtimeTimerRef.current) clearTimeout(tasksRealtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    setAdminPage(0);
    setAdminHasMore(true);
    setAdminTasks([]);
    loadAdminTasks(true);
  }, [adminAssignedToFilter, adminDeadlineFrom, adminDeadlineTo, adminSortField, adminSortOrder, isAdmin, phaseFilter, projectFilter, statusFilter, loadAdminTasks]);

  const adminProjectsById = useMemo(() => {
    return new Map(adminProjects.map(p => [p.id, p]));
  }, [adminProjects]);

  const adminIntervenantsById = useMemo(() => {
    return new Map(adminIntervenants.map(i => [i.id, i]));
  }, [adminIntervenants]);

  const adminSpecialties = useMemo(() => {
    const set = new Set<string>();
    for (const i of adminIntervenants) {
      if (i.specialty) set.add(i.specialty);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [adminIntervenants]);

  const adminExceptionFlags = useMemo(() => {
    const now = new Date();

    return adminTasks.map(task => {
      const assignedTo = task.assigned_to || [];
      const validators = task.validators || [];

      const noAssignee = assignedTo.length === 0;
      const noValidator = validators.length === 0;

      const projectMembers = projectMemberMap[task.project_id];
      const hasAssigneeNotMember = !!projectMembers && assignedTo.some(uid => !projectMembers.has(uid));

      const deadline = task.deadline ? new Date(task.deadline) : null;
      const validationDeadline = task.validation_deadline ? new Date(task.validation_deadline) : null;
      const isDeadlineOverdue = !!deadline && !isNaN(deadline.getTime()) && deadline < now && task.status !== 'validated' && task.status !== 'finalized';
      const isValidationDeadlineOverdue = !!validationDeadline && !isNaN(validationDeadline.getTime()) && validationDeadline < now && task.status !== 'validated' && task.status !== 'finalized';

      const isMissingSubmission = !!deadline && !isNaN(deadline.getTime()) && deadline < now && !task.file_url && task.status !== 'submitted' && task.status !== 'validated' && task.status !== 'finalized';
      const isBlocked = noValidator || hasAssigneeNotMember;

      return {
        taskId: task.id || '',
        noAssignee,
        noValidator,
        hasAssigneeNotMember,
        isDeadlineOverdue,
        isValidationDeadlineOverdue,
        isMissingSubmission,
        isBlocked
      };
    });
  }, [adminTasks, projectMemberMap]);

  const adminExceptionsByTaskId = useMemo(() => {
    const map: Record<string, ReturnType<(typeof adminExceptionFlags)[number]>> = {};
    for (const f of adminExceptionFlags) {
      if (f.taskId) map[f.taskId] = f;
    }
    return map;
  }, [adminExceptionFlags]);

  const filteredAdminTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let list = adminTasks;

    if (adminSpecialtyFilter !== 'all') {
      list = list.filter(task => {
        const assigned = (task.assigned_to || []).map(id => adminIntervenantsById.get(id)).filter(Boolean);
        const validators = (task.validators || []).map(id => adminIntervenantsById.get(id)).filter(Boolean);
        return [...assigned, ...validators].some(p => p?.specialty === adminSpecialtyFilter);
      });
    }

    if (adminQuickFilter !== 'all') {
      list = list.filter(task => {
        const flags = task.id ? adminExceptionsByTaskId[task.id] : undefined;
        if (!flags) return false;
        if (adminQuickFilter === 'overdue') return flags.isDeadlineOverdue || flags.isValidationDeadlineOverdue;
        if (adminQuickFilter === 'unassigned') return flags.noAssignee;
        if (adminQuickFilter === 'to_validate') return task.status === 'submitted';
        if (adminQuickFilter === 'blocked') return flags.isBlocked;
        return true;
      });
    }

    if (!query) return list;

    return list.filter(task => {
      const projectName = adminProjectsById.get(task.project_id)?.name || '';
      const assigned = (task.assigned_to || []).map(id => adminIntervenantsById.get(id)).filter(Boolean);
      const validators = (task.validators || []).map(id => adminIntervenantsById.get(id)).filter(Boolean);

      const peopleStrings = [...assigned, ...validators].flatMap(p => [
        p?.email || '',
        `${p?.first_name || ''} ${p?.last_name || ''}`.trim(),
        p?.company || '',
        p?.specialty || ''
      ]);

      const fields = [
        task.task_name,
        task.section_id,
        task.subsection_id,
        task.phase_id,
        task.status,
        projectName,
        ...(peopleStrings as string[])
      ].filter(Boolean);

      return fields.some(f => f.toLowerCase().includes(query));
    });
  }, [adminExceptionsByTaskId, adminIntervenantsById, adminProjectsById, adminQuickFilter, adminSpecialtyFilter, adminTasks, searchQuery]);

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    // Search query
    const searchFields = [
      task.task_name,
      task.phase_id,
      task.section_id,
      task.subsection_id,
      task.project?.name || '',
      task.assigned_users && task.assigned_users.length > 0 ?
        task.assigned_users.map(u => (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email)).join(', ') :
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

  // Nouvelle logique: séparer les tâches par rôle (exécutant vs validateur)
  const executionTasks = useMemo(() => {
    return tasks.filter(task => task.assigned_to?.includes(user?.id || ''));
  }, [tasks, user?.id]);

  const validationTasksList = useMemo(() => {
    return tasks.filter(task => task.validators?.includes(user?.id || ''));
  }, [tasks, user?.id]);

  // Filtrer les tâches d'exécution selon l'onglet actif
  const filteredExecutionTasks = useMemo(() => {
    return executionTasks.filter(task => {
      switch (executionTab) {
        case 'not_started':
          return task.status === 'assigned';
        case 'started':
          return task.status === 'in_progress';
        case 'waiting':
          return task.status === 'submitted';
        case 'finished':
          return task.status === 'validated' || task.status === 'rejected';
        default:
          return true;
      }
    });
  }, [executionTasks, executionTab]);

  // Filtrer les tâches de validation selon l'onglet actif
  const filteredValidationTasks = useMemo(() => {
    return validationTasksList.filter(task => {
      switch (validationTab) {
        case 'pending_validation':
          return task.status === 'submitted';
        case 'pending_resubmission':
          return task.status === 'rejected';
        case 'validated':
          return task.status === 'validated';
        case 'rejected':
          return task.status === 'rejected';
        default:
          return true;
      }
    });
  }, [validationTasksList, validationTab]);

  // Tâches à afficher selon la vue active
  const displayedTasks = useMemo(() => {
    switch (intervenantView) {
      case 'execution':
        return filteredExecutionTasks;
      case 'validation':
        return filteredValidationTasks;
      case 'all':
      default:
        return filteredTasks;
    }
  }, [intervenantView, filteredExecutionTasks, filteredValidationTasks, filteredTasks]);
  
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

  if (isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Tâches (Admin)</h1>
          <p className="text-muted-foreground">
            Pilotage par alertes et exceptions
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Recherche globale</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Projet, tâche, intervenant, email, société..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="assigned">Assignée</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="submitted">Soumise</SelectItem>
                  <SelectItem value="validated">Validée</SelectItem>
                  <SelectItem value="rejected">Rejetée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Phase</label>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="conception">Conception</SelectItem>
                  <SelectItem value="realisation">Réalisation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Projet</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {adminProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Intervenant</label>
              <Select value={adminAssignedToFilter} onValueChange={setAdminAssignedToFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {adminIntervenants.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {(i.first_name || i.last_name) ? `${i.first_name || ''} ${i.last_name || ''}`.trim() : i.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Spécialité</label>
              <Select value={adminSpecialtyFilter} onValueChange={setAdminSpecialtyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {adminSpecialties.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Deadline du</label>
              <Input type="date" value={adminDeadlineFrom} onChange={(e) => setAdminDeadlineFrom(e.target.value)} />
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Deadline au</label>
              <Input type="date" value={adminDeadlineTo} onChange={(e) => setAdminDeadlineTo(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
            <Button variant={adminQuickFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setAdminQuickFilter('all')}>Tout</Button>
            <Button variant={adminQuickFilter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setAdminQuickFilter('overdue')}>En retard</Button>
            <Button variant={adminQuickFilter === 'unassigned' ? 'default' : 'outline'} size="sm" onClick={() => setAdminQuickFilter('unassigned')}>Sans assignation</Button>
            <Button variant={adminQuickFilter === 'blocked' ? 'default' : 'outline'} size="sm" onClick={() => setAdminQuickFilter('blocked')}>Bloqué</Button>
            <Button variant={adminQuickFilter === 'to_validate' ? 'default' : 'outline'} size="sm" onClick={() => setAdminQuickFilter('to_validate')}>À valider</Button>

            <div className="ml-auto flex items-center gap-2">
              <Select value={adminSortField} onValueChange={(v) => setAdminSortField(v as AdminSortField)}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Trier: Deadline</SelectItem>
                  <SelectItem value="validation_deadline">Trier: Deadline validation</SelectItem>
                  <SelectItem value="task_name">Trier: Nom tâche</SelectItem>
                  <SelectItem value="status">Trier: Statut</SelectItem>
                </SelectContent>
              </Select>
              <Select value={adminSortOrder} onValueChange={(v) => setAdminSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPhaseFilter('all');
                setProjectFilter('all');
                setAdminAssignedToFilter('all');
                setAdminSpecialtyFilter('all');
                setAdminDeadlineFrom('');
                setAdminDeadlineTo('');
                setAdminQuickFilter('all');
              }}>Réinitialiser</Button>
            </div>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Liste (exceptions) ({filteredAdminTasks.length})</CardTitle>
            <CardDescription>
              Affiche les tâches filtrées; clique une ligne pour ouvrir le détail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredAdminTasks.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tâche</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Alertes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminTasks.map((task) => {
                      const flags = task.id ? adminExceptionsByTaskId[task.id] : undefined;
                      return (
                        <TableRow
                          key={task.id}
                          onClick={() => task.id && handleTaskClick(task.id)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{task.task_name}</span>
                              <span className="text-xs text-gray-500">
                                {task.phase_id === 'conception' ? 'Conception' : 'Réalisation'} &gt; {(task.section_id || '').slice(0,8)}... &gt; {(task.subsection_id || '').slice(0,8)}...
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{adminProjectsById.get(task.project_id)?.name || '-'}</TableCell>
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
                            <div className="flex flex-wrap gap-1">
                              {flags?.noAssignee && <Badge className="bg-orange-600">Sans exécuteur</Badge>}
                              {flags?.noValidator && <Badge className="bg-orange-600">Sans validateur</Badge>}
                              {flags?.hasAssigneeNotMember && <Badge className="bg-red-600">Exécuteur hors projet</Badge>}
                              {flags?.isValidationDeadlineOverdue && <Badge className="bg-red-600">Validation en retard</Badge>}
                              {flags?.isMissingSubmission && <Badge className="bg-red-600">Fichier manquant</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">Aucune tâche</h3>
                <p className="text-gray-500 max-w-md mx-auto">Aucun résultat pour les filtres actuels.</p>
              </div>
            )}

            {adminHasMore && !adminLoading && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => loadAdminTasks(false)}>
                  Charger plus
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Composant de rendu de la liste de tâches
  const renderTaskList = (tasksToRender: TaskAssignment[], showRole: boolean = false) => {
    if (tasksToRender.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium mb-1">{t.empty.noTasks}</h3>
          <p className="text-gray-500 max-w-md mx-auto">{t.empty.noTasksDesc}</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.card.task}</TableHead>
              <TableHead>{t.card.project}</TableHead>
              {showRole && <TableHead>Rôle</TableHead>}
              <TableHead>{t.filters.statusLabel}</TableHead>
              <TableHead>{t.card.deadline}</TableHead>
              <TableHead>{t.card.type}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksToRender.map((task) => (
              <TableRow
                key={task.id}
                onClick={() => handleTaskClick(task.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{task.task_name}</span>
                    <span className="text-xs text-gray-500">
                      {task.phase_id === 'conception' ? 'Conception' : 'Réalisation'} &gt; {(task.section_id || '').slice(0,8)}... &gt; {(task.subsection_id || '').slice(0,8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>{task.project?.name || '-'}</TableCell>
                {showRole && (
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {task.assigned_to?.includes(user?.id || '') && task.validators?.includes(user?.id || '')
                        ? 'Exécuteur & Validateur'
                        : task.validators?.includes(user?.id || '')
                        ? 'Validateur'
                        : 'Exécuteur'}
                    </Badge>
                  </TableCell>
                )}
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
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Menu de navigation principale */}
      <div className="bg-card rounded-lg shadow-sm border p-2 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={intervenantView === 'all' ? 'default' : 'outline'}
            onClick={() => setIntervenantView('all')}
            className="flex-1 min-w-[180px]"
          >
            Toutes mes tâches
            <Badge variant="secondary" className="ml-2">{tasks.length}</Badge>
          </Button>
          <Button
            variant={intervenantView === 'execution' ? 'default' : 'outline'}
            onClick={() => setIntervenantView('execution')}
            className="flex-1 min-w-[180px]"
          >
            Tâches à exécuter
            <Badge variant="secondary" className="ml-2">{executionTasks.length}</Badge>
          </Button>
          <Button
            variant={intervenantView === 'validation' ? 'default' : 'outline'}
            onClick={() => setIntervenantView('validation')}
            className="flex-1 min-w-[180px]"
          >
            Tâches à valider
            <Badge variant="secondary" className="ml-2">{validationTasksList.length}</Badge>
          </Button>
        </div>
      </div>

      {/* Onglets pour Tâches à exécuter */}
      {intervenantView === 'execution' && (
        <div className="bg-card rounded-lg shadow-sm border p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={executionTab === 'not_started' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExecutionTab('not_started')}
            >
              Pas encore démarré
              <Badge variant="secondary" className="ml-2">
                {executionTasks.filter(t => t.status === 'assigned').length}
              </Badge>
            </Button>
            <Button
              variant={executionTab === 'started' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExecutionTab('started')}
            >
              Débuté
              <Badge variant="secondary" className="ml-2">
                {executionTasks.filter(t => t.status === 'in_progress').length}
              </Badge>
            </Button>
            <Button
              variant={executionTab === 'waiting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExecutionTab('waiting')}
            >
              En attente
              <Badge variant="secondary" className="ml-2">
                {executionTasks.filter(t => t.status === 'submitted').length}
              </Badge>
            </Button>
            <Button
              variant={executionTab === 'finished' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExecutionTab('finished')}
            >
              Terminé
              <Badge variant="secondary" className="ml-2">
                {executionTasks.filter(t => t.status === 'validated' || t.status === 'rejected').length}
              </Badge>
            </Button>
          </div>
        </div>
      )}

      {/* Onglets pour Tâches à valider */}
      {intervenantView === 'validation' && (
        <div className="bg-card rounded-lg shadow-sm border p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={validationTab === 'pending_validation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValidationTab('pending_validation')}
            >
              En attente de validation
              <Badge variant="secondary" className="ml-2">
                {validationTasksList.filter(t => t.status === 'submitted').length}
              </Badge>
            </Button>
            <Button
              variant={validationTab === 'pending_resubmission' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValidationTab('pending_resubmission')}
            >
              En attente de resoumission
              <Badge variant="secondary" className="ml-2">
                {validationTasksList.filter(t => t.status === 'rejected').length}
              </Badge>
            </Button>
            <Button
              variant={validationTab === 'validated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValidationTab('validated')}
            >
              Validé
              <Badge variant="secondary" className="ml-2">
                {validationTasksList.filter(t => t.status === 'validated').length}
              </Badge>
            </Button>
            <Button
              variant={validationTab === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValidationTab('rejected')}
            >
              Non validé
              <Badge variant="secondary" className="ml-2">
                {validationTasksList.filter(t => t.status === 'rejected').length}
              </Badge>
            </Button>
          </div>
        </div>
      )}

      {/* Filtres (uniquement pour la vue "Toutes") */}
      {intervenantView === 'all' && (
        <div className="bg-card rounded-lg shadow-sm border p-5 mb-6">
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
      )}

      {/* Liste des tâches */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>
            {intervenantView === 'all' && `${t.card.taskList} (${sortedTasks.length})`}
            {intervenantView === 'execution' && `Tâches à exécuter (${filteredExecutionTasks.length})`}
            {intervenantView === 'validation' && `Tâches à valider (${filteredValidationTasks.length})`}
          </CardTitle>
          <CardDescription>
            {displayedTasks.length === 0 ? t.search.noResults : t.card.taskListDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTaskList(displayedTasks, intervenantView === 'all')}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks; 