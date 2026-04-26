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
import { ArrowUpDown, Users } from "lucide-react";
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
  subsection_id: string;
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

        const { data: tasks, error: taskError } = await supabase
          .from('task_assignments')
          .select('id,project_id,phase_id,section_id,subsection_id,task_name,assigned_to,validators,deadline,validation_deadline,status,file_url')
          .or(`assigned_to.cs.{${userId}},validators.cs.{${userId}}`);
        if (taskError) throw taskError;
        setSummaryTasks((tasks || []) as TaskAssignmentRow[]);
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
    return summaryTasks.filter(t => (t.validators || []).includes(selectedIntervenantSummary.id));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intervenants</h1>
          <p className="text-muted-foreground">
            Gérez les comptes des intervenants de votre plateforme.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">Ajouter un intervenant</Button>
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

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Rechercher un intervenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <Select 
              value={specialtyFilter} 
              onValueChange={setSpecialtyFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Toutes spécialités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {availableSpecialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('name')}
              className={sortField === 'name' ? 'border-teal-500' : ''}
            >
              Nom
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'name' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('date')}
              className={sortField === 'date' ? 'border-teal-500' : ''}
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'date' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleSort('specialty')}
              className={sortField === 'specialty' ? 'border-teal-500' : ''}
            >
              Spécialité
              <ArrowUpDown className="ml-2 h-4 w-4" />
              {sortField === 'specialty' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <span className="text-sm text-gray-500">
          {filteredAndSortedIntervenants.length} intervenants
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900">Nom</th>
                <th className="px-4 py-3 font-medium text-gray-900">Email</th>
                <th className="px-4 py-3 font-medium text-gray-900">Entreprise</th>
                <th className="px-4 py-3 font-medium text-gray-900">Spécialité</th>

                <th className="px-4 py-3 font-medium text-gray-900">Date d'ajout</th>
                <th className="px-4 py-3 font-medium text-gray-900">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedIntervenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500">
                    Aucun intervenant trouvé
                  </td>
                </tr>
              ) : (
                filteredAndSortedIntervenants.map((intervenant) => (
                  <tr
                    key={intervenant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openIntervenantSummary(intervenant)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{getDisplayName(intervenant)}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.email}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.company || 'Indépendant'}</td>
                    <td className="px-4 py-3 text-gray-500">{intervenant.specialty || 'Non spécifié'}</td>

                    <td className="px-4 py-3 text-gray-500">{intervenant.joinDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        intervenant.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {intervenant.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prepareEdit(intervenant);
                        }}
                        className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        Modifier
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(intervenant.id);
                        }}
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          intervenant.status === 'active'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {intervenant.status === 'active' ? 'Désactiver' : 'Activer'}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          prepareDelete(intervenant);
                        }}
                        className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                            <div className="text-xs text-gray-500 truncate">{t.phase_id} • {t.section_id} • {t.subsection_id}</div>
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
                            <div className="text-xs text-gray-500 truncate">{t.phase_id} • {t.section_id} • {t.subsection_id}</div>
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
