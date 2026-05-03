import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CreateUserForm from "@/components/CreateUserForm";
import EditUserForm from "@/components/EditUserForm";
import { useSupabase, SPECIALTIES } from '../hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowUpDown, 
  Users, 
  Search, 
  UserPlus, 
  Building2, 
  GraduationCap, 
  Mail, 
  Calendar as CalendarIcon, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserCog
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

// Type pour un intervenant
interface Intervenant {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  company?: string;
  status: 'active' | 'inactive';
  joinDate: string;
  joinDateRaw: Date; // Pour le tri
}

interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
}

interface TaskAssignmentRow {
  id: string;
  project_id: string;
  phase_id: string;
  section_id: string;
  section_name?: string;
  subsection_id: string;
  subsection_name?: string;
  task_name: string;
  assigned_to: string[];
  validators: string[];
  deadline: string;
  validation_deadline: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected' | 'finalized';
  file_url?: string;
}

// Type pour les données d'utilisateur de Supabase
interface SupabaseUser {
  id: string;
  email: string;
  created_at: string;
  banned?: boolean;
  user_metadata?: {
    role?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    specialty?: string;
    company?: string;
    [key: string]: any;
  };
  [key: string]: any;
}



// Type pour les options de tri
type SortField = 'name' | 'date' | 'specialty';
type SortOrder = 'asc' | 'desc';

const Intervenants: React.FC = () => {
  const { toast } = useToast();
  const { adminDeleteUser, supabase: supabaseHook } = useSupabase();
  const { user: authUser, status } = useAuth();
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntervenant, setSelectedIntervenant] = useState<Intervenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [selectedIntervenantSummary, setSelectedIntervenantSummary] = useState<Intervenant | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryProjects, setSummaryProjects] = useState<ProjectRow[]>([]);
  const [summaryTasks, setSummaryTasks] = useState<TaskAssignmentRow[]>([]);
  

  
  // Options de tri et filtrage
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('');

  useEffect(() => {
    if (status === 'authenticated' && authUser?.id) {
      fetchIntervenants();
    }
  }, [authUser?.id, status]);

  const fetchIntervenants = async () => {
    if (status !== 'authenticated' || !authUser) return;
    setLoading(true);
    try {

      // Récupérer le tenant_id du user connecté
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!myProfile?.tenant_id) {
        setIntervenants([]);
        return;
      }

      // Récupérer uniquement les membres du même tenant, hors admins
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, role, specialty, company, status, created_at')
        .eq('tenant_id', myProfile.tenant_id)
        .neq('role', 'admin')
        .neq('is_super_admin', true);

      if (error) throw error;

      const formattedUsers: Intervenant[] = (profiles || []).map(p => {
        const joinDateRaw = new Date(p.created_at);
        return {
          id: p.user_id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          role: p.role || 'intervenant',
          specialty: p.specialty || '',
          company: p.company || 'Indépendant',
          status: p.status === 'inactive' ? 'inactive' as const : 'active' as const,
          joinDate: joinDateRaw.toLocaleDateString('fr-FR'),
          joinDateRaw
        };
      });

      setIntervenants(formattedUsers);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id: string) => {
    // À implémenter avec Supabase
    // API bannir/débannir un utilisateur
    toast({
      title: "Information",
      description: "La modification du statut sera bientôt disponible",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { success, error } = await adminDeleteUser(id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "L'intervenant a été supprimé avec succès",
        });
        
        // Rafraîchir la liste des intervenants
        fetchIntervenants();
      } else if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'intervenant. Veuillez réessayer.",
        variant: "destructive",
      });
    }
    
    // Fermer la boîte de dialogue
    setDeleteDialogOpen(false);
    setSelectedIntervenant(null);
  };
  
  // Helper pour obtenir le nom complet
  const getDisplayName = (intervenant: Intervenant) => {
    if (intervenant.first_name && intervenant.last_name) {
      return `${intervenant.first_name} ${intervenant.last_name}`;
    }
    return intervenant.name || 'Sans nom';
  };

  // Préparer la suppression d'un intervenant
  const prepareDelete = (intervenant: Intervenant) => {
    setSelectedIntervenant(intervenant);
    setDeleteDialogOpen(true);
  };
  
  // Préparer la modification d'un intervenant
  const prepareEdit = (intervenant: Intervenant) => {
    setSelectedIntervenant(intervenant);
    setEditDialogOpen(true);
  };

  // Inversion de l'ordre de tri lorsqu'on clique sur le même champ
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Fermer le dialogue après avoir ajouté ou modifié un utilisateur
  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    fetchIntervenants();
  };

  const openIntervenantSummary = (intervenant: Intervenant) => {
    setSelectedIntervenantSummary(intervenant);
    setSummaryDialogOpen(true);
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!summaryDialogOpen || !selectedIntervenantSummary?.id) return;
      setSummaryLoading(true);
      try {
        const userId = selectedIntervenantSummary.id;

        const { data: members, error: memberError } = await supabase
          .from('membre')
          .select('id,project_id,user_id,role,added_at')
          .eq('user_id', userId);

        if (memberError) throw memberError;
        const projectIds = Array.from(new Set((members || []).map(m => m.project_id).filter(Boolean)));

        let projects: ProjectRow[] = [];
        if (projectIds.length > 0) {
          const { data: proj, error: projError } = await supabase
            .from('projects')
            .select('id,name,description,status,start_date')
            .in('id', projectIds);
          if (projError) throw projError;
          projects = (proj || []) as ProjectRow[];
        }
        setSummaryProjects(projects);

        // Récupérer les tâches où l'utilisateur est impliqué (via la vue)
        const { data: tasks, error: taskError } = await supabase
          .from('task_assignments_view')
          .select('*');

        if (taskError) throw taskError;
        
        // Filtrer côté client pour les performances et la simplicité avec les tableaux/JSONB
        const userTasks = (tasks || []).filter((t: any) => 
          (t.assigned_to || []).includes(userId) || 
          (t.validators || []).some((v: any) => v.user_id === userId)
        );
        
        setSummaryTasks(userTasks as TaskAssignmentRow[]);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: "Impossible de charger le résumé de l'intervenant",
          variant: 'destructive',
        });
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [selectedIntervenantSummary?.id, summaryDialogOpen, supabase, toast]);

  const summaryExecutionTasks = useMemo(() => {
    if (!selectedIntervenantSummary?.id) return [] as TaskAssignmentRow[];
    return summaryTasks.filter(t => (t.assigned_to || []).includes(selectedIntervenantSummary.id));
  }, [selectedIntervenantSummary?.id, summaryTasks]);

  const summaryValidationTasks = useMemo(() => {
    if (!selectedIntervenantSummary?.id) return [] as TaskAssignmentRow[];
    return summaryTasks.filter(t => (t.validators || []).some((v: any) => v.user_id === selectedIntervenantSummary.id));
  }, [selectedIntervenantSummary?.id, summaryTasks]);

  const statusColors = {
    assigned: '#f59e0b',
    in_progress: '#3b82f6',
    submitted: '#f97316',
    validated: '#22c55e',
    rejected: '#ef4444',
    finalized: '#10b981'
  } as const;

  const taskKpis = useMemo(() => {
    const now = new Date();
    const all = summaryExecutionTasks;
    const toValidate = summaryValidationTasks;

    const execTotal = all.length;
    const execValidated = all.filter(t => t.status === 'validated' || t.status === 'finalized').length;
    const execRejected = all.filter(t => t.status === 'rejected').length;
    const execOverdue = all.filter(t => {
      const d = t.deadline ? new Date(t.deadline) : null;
      return !!d && !isNaN(d.getTime()) && d < now && t.status !== 'validated' && t.status !== 'finalized';
    }).length;

    const valTotal = toValidate.length;
    const valValidated = toValidate.filter(t => t.status === 'validated' || t.status === 'finalized').length;
    const valOverdue = toValidate.filter(t => {
      const d = t.validation_deadline ? new Date(t.validation_deadline) : null;
      return !!d && !isNaN(d.getTime()) && d < now && t.status !== 'validated' && t.status !== 'finalized';
    }).length;

    const execCompletionRate = execTotal > 0 ? Math.round((execValidated / execTotal) * 100) : 0;
    const valCompletionRate = valTotal > 0 ? Math.round((valValidated / valTotal) * 100) : 0;

    return {
      execTotal,
      execValidated,
      execRejected,
      execOverdue,
      execCompletionRate,
      valTotal,
      valValidated,
      valOverdue,
      valCompletionRate
    };
  }, [summaryExecutionTasks, summaryValidationTasks]);

  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of summaryExecutionTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: (statusColors as any)[name] || '#6b7280' }))
      .filter(d => d.value > 0);
  }, [summaryExecutionTasks]);

  const perfBarData = useMemo(() => {
    return [
      { name: 'Exécution', completion: taskKpis.execCompletionRate, overdue: taskKpis.execOverdue },
      { name: 'Validation', completion: taskKpis.valCompletionRate, overdue: taskKpis.valOverdue }
    ];
  }, [taskKpis.execCompletionRate, taskKpis.execOverdue, taskKpis.valCompletionRate, taskKpis.valOverdue]);

  // Fonctions pour la gestion des contacts


  // Fusion du filtrage et du tri en une seule opération
  const filteredAndSortedIntervenants = useMemo(() => {
    // Étape 1: Filtrer par terme de recherche
    let result = intervenants.filter(
      intervenant => 
        (getDisplayName(intervenant).toLowerCase().includes(searchTerm.toLowerCase())) || 
        intervenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (intervenant.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );

    // Étape 2: Filtrer par spécialité si sélectionnée
    if (specialtyFilter && specialtyFilter !== 'all') {
      result = result.filter(intervenant => intervenant.specialty === specialtyFilter);
    }

    // Étape 3: Trier selon le champ et l'ordre sélectionnés
    const sortedResult = [...result].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = getDisplayName(a).localeCompare(getDisplayName(b));
      } else if (sortField === 'date') {
        comparison = a.joinDateRaw.getTime() - b.joinDateRaw.getTime();
      } else if (sortField === 'specialty') {
        comparison = (a.specialty || '').localeCompare(b.specialty || '');
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sortedResult;
  }, [intervenants, searchTerm, specialtyFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedIntervenants.length / itemsPerPage);
  
  const currentIntervenants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedIntervenants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedIntervenants, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, specialtyFilter, sortField]);

  // Liste unique des spécialités présentes dans les intervenants pour le filtre
  const availableSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    intervenants.forEach(intervenant => {
      if (intervenant.specialty) {
        specialties.add(intervenant.specialty);
      }
    });
    return Array.from(specialties).sort();
  }, [intervenants]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des Intervenants</h1>
          <p className="text-gray-500 mt-1">Gérez les comptes et suivez l'activité des intervenants de votre plateforme.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-4xl font-light text-blue-600">{intervenants.length}</span>
            <span className="text-xs uppercase tracking-widest text-gray-400 block font-semibold">Total Membres</span>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm h-11 px-6 rounded-xl font-bold gap-2">
                <UserPlus className="h-5 w-5" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel intervenant</DialogTitle>
                <DialogDescription>
                  Créez un compte pour un nouvel intervenant. Celui-ci pourra ensuite se connecter avec ces identifiants.
                </DialogDescription>
              </DialogHeader>
              <CreateUserForm onSuccess={handleDialogClose} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
        <div className="xl:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un nom, email, spécialité..."
            className="pl-10 h-11 bg-white border-gray-200 shadow-sm focus-visible:ring-blue-500 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="xl:col-span-8 flex flex-wrap gap-2 items-center justify-end">
          <Select 
            value={specialtyFilter} 
            onValueChange={setSpecialtyFilter}
          >
            <SelectTrigger className="h-11 w-[180px] bg-white border-gray-200 rounded-xl">
              <SelectValue placeholder="Spécialités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes spécialités</SelectItem>
              {availableSpecialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toggleSort('name')}
              className={cn(
                "h-9 px-4 text-xs font-bold rounded-lg transition-all",
                sortField === 'name' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
              )}
            >
              Nom {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toggleSort('date')}
              className={cn(
                "h-9 px-4 text-xs font-bold rounded-lg transition-all",
                sortField === 'date' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
              )}
            >
              Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toggleSort('specialty')}
              className={cn(
                "h-9 px-4 text-xs font-bold rounded-lg transition-all",
                sortField === 'specialty' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
              )}
            >
              Spécialité {sortField === 'specialty' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Chargement des membres...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentIntervenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Users className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Aucun intervenant trouvé</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-1">
                Aucun membre ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentIntervenants.map((intervenant) => (
                  <Card 
                    key={intervenant.id}
                    className="group border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-600"
                    onClick={() => openIntervenantSummary(intervenant)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl">
                            {intervenant.first_name?.[0]}{intervenant.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {getDisplayName(intervenant)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{intervenant.email}</span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => openIntervenantSummary(intervenant)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              prepareEdit(intervenant);
                            }}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(intervenant.id);
                            }}>
                              {intervenant.status === 'active' ? (
                                <><ShieldAlert className="h-4 w-4 mr-2 text-orange-500" /> Désactiver</>
                              ) : (
                                <><ShieldCheck className="h-4 w-4 mr-2 text-green-500" /> Activer</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                prepareDelete(intervenant);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Entreprise</span>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{intervenant.company || 'Indépendant'}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Spécialité</span>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                            <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{intervenant.specialty || 'Non spécifiée'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>Depuis le {intervenant.joinDate}</span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] font-bold uppercase px-2 h-5 border-0",
                            intervenant.status === 'active' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          )}
                        >
                          {intervenant.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-8 mt-4">
                  <div className="text-sm text-gray-500">
                    Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedIntervenants.length)}</span> sur <span className="font-medium">{filteredAndSortedIntervenants.length}</span> membres
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0 rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1;
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && <span className="text-gray-400 px-1">...</span>}
                              <Button
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "h-9 w-9 p-0 rounded-xl font-bold",
                                  currentPage === page ? "bg-blue-600 border-blue-600" : "text-gray-600 border-gray-200"
                                )}
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          );
                        })
                      }
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0 rounded-xl"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dialogue résumé & historique */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Résumé intervenant</DialogTitle>
            <DialogDescription>
              {selectedIntervenantSummary ? `${getDisplayName(selectedIntervenantSummary)} • ${selectedIntervenantSummary.email}` : ''}
            </DialogDescription>
          </DialogHeader>

          {summaryLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm text-gray-500">Projets</div>
                  <div className="text-2xl font-bold">{summaryProjects.length}</div>
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm text-gray-500">Tâches (exécution)</div>
                  <div className="text-2xl font-bold">{taskKpis.execTotal}</div>
                  <div className="text-xs text-gray-500">Complétion: {taskKpis.execCompletionRate}%</div>
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm text-gray-500">Tâches (validation)</div>
                  <div className="text-2xl font-bold">{taskKpis.valTotal}</div>
                  <div className="text-xs text-gray-500">Complétion: {taskKpis.valCompletionRate}%</div>
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm text-gray-500">Retards</div>
                  <div className="text-2xl font-bold">{taskKpis.execOverdue + taskKpis.valOverdue}</div>
                  <div className="text-xs text-gray-500">Exéc: {taskKpis.execOverdue} • Valid: {taskKpis.valOverdue}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm font-medium text-gray-700 mb-2">Répartition (tâches d’exécution)</div>
                  <div className="h-72">
                    {statusPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                            {statusPieData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500">Aucune donnée</div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm font-medium text-gray-700 mb-2">Performance</div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perfBarData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="completion" name="Complétion (%)" fill="#0f766e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="overdue" name="Retards" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-white">
                <div className="text-sm font-medium text-gray-700 mb-3">Projets où il est membre</div>
                {summaryProjects.length === 0 ? (
                  <div className="text-sm text-gray-500">Aucun projet</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {summaryProjects.map(p => (
                      <Badge key={p.id} variant="secondary" className="bg-gray-100 text-gray-800">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm font-medium text-gray-700 mb-3">Tâches à exécuter</div>
                  <div className="space-y-2">
                    {summaryExecutionTasks.length === 0 ? (
                      <div className="text-sm text-gray-500">Aucune tâche</div>
                    ) : (
                      summaryExecutionTasks.slice(0, 30).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.task_name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {t.phase_id} • {t.section_name || `Section ${t.section_id}`} • {t.subsection_name || `Sous-section ${t.subsection_id}`}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-white"
                            style={{ backgroundColor: (statusColors as any)[t.status] || '#6b7280' }}
                          >
                            {t.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-sm font-medium text-gray-700 mb-3">Tâches à valider</div>
                  <div className="space-y-2">
                    {summaryValidationTasks.length === 0 ? (
                      <div className="text-sm text-gray-500">Aucune tâche</div>
                    ) : (
                      summaryValidationTasks.slice(0, 30).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.task_name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {t.phase_id} • {t.section_name || `Section ${t.section_id}`} • {t.subsection_name || `Sous-section ${t.subsection_id}`}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-white"
                            style={{ backgroundColor: (statusColors as any)[t.status] || '#6b7280' }}
                          >
                            {t.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de modification */}
      {selectedIntervenant && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'intervenant</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'intervenant ainsi que son mot de passe si nécessaire.
              </DialogDescription>
            </DialogHeader>
            <EditUserForm 
              userId={selectedIntervenant.id}
              userData={{
                email: selectedIntervenant.email,
                role: selectedIntervenant.role,
                first_name: selectedIntervenant.first_name,
                last_name: selectedIntervenant.last_name,
                specialty: selectedIntervenant.specialty,
                company: selectedIntervenant.company
              }}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'intervenant {selectedIntervenant ? getDisplayName(selectedIntervenant) : ''} ?
              <br />
              Cette action est irréversible et supprimera définitivement cet utilisateur et toutes ses données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedIntervenant(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedIntervenant && handleDelete(selectedIntervenant.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
};

export default Intervenants;
