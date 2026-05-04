import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Calendar, 
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  User,
  ClipboardCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ProjectSection {
  id: string;
  title: string;
  phase: string;
  order_index: number;
  items: ProjectItem[];
  deadline?: string;
}

interface ProjectItem {
  id: string;
  section_id: string;
  title: string;
  order_index: number;
  tasks: ProjectTask[];
  deadline?: string;
}

interface ProjectTask {
  id: string;
  item_id: string;
  title: string;
  order_index: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  image_url?: string;
  project_type?: string;
  client_name?: string;
  client_contact?: string;
  created_at: string;
}

interface ProjectInfoTabProps {
  project: Project;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  conceptionStructure: ProjectSection[];
  realizationStructure: ProjectSection[];
}

const ProjectInfoTab: React.FC<ProjectInfoTabProps> = ({ 
  project, 
  isAdmin, 
  onEdit, 
  onDelete,
  conceptionStructure,
  realizationStructure
}) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [intervenants, setIntervenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [assignmentsRes, profilesRes] = await Promise.all([
        supabase.from('task_assignments_view').select('*').eq('project_id', project.id),
        supabase.from('profiles').select('user_id, first_name, last_name')
      ]);
      
      setAssignments(assignmentsRes.data || []);
      setIntervenants(profilesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [project.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getIntervenantNames = (userIds: string | string[]) => {
    if (Array.isArray(userIds)) {
      if (userIds.length === 0) return 'Inconnu';
      return userIds.map(userId => {
        const intervenant = intervenants.find(i => i.user_id === userId);
        return intervenant ? `${intervenant.first_name} ${intervenant.last_name}` : 'Inconnu';
      }).join(', ');
    }
    
    const intervenant = intervenants.find(i => i.user_id === userIds);
    return intervenant ? `${intervenant.first_name} ${intervenant.last_name}` : 'Inconnu';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated':
      case 'approved':
      case 'vso':
      case 'vao':
      case 'closed': return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted':
      case 'in_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
      case 'started': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
      case 'open': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected':
      case 'var': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
      case 'approved':
      case 'vso':
      case 'vao':
      case 'closed': return <CheckCircle2 className="h-4 w-4" />;
      case 'submitted':
      case 'in_review': return <Clock className="h-4 w-4" />;
      case 'in_progress':
      case 'started': return <Clock className="h-4 w-4" />;
      case 'assigned':
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'rejected':
      case 'var': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
      case 'approved':
      case 'vso':
      case 'vao':
      case 'closed': return 'Validé';
      case 'submitted':
      case 'in_review': return 'Soumis';
      case 'in_progress':
      case 'started': return 'En cours';
      case 'assigned':
      case 'open': return 'Assigné';
      case 'rejected':
      case 'var': return 'Rejeté';
      default: return status;
    }
  };

  const getTotalAvailableTasks = () => {
    let total = 0;
    conceptionStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    realizationStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    return total;
  };

  const totalTasksInStructure = getTotalAvailableTasks();
  const validatedTasks = assignments.filter(a => 
    ['validated', 'approved', 'vso', 'vao', 'closed'].includes(a.status)
  ).length;

  const progress = totalTasksInStructure > 0 
    ? Math.round((validatedTasks / totalTasksInStructure) * 100) 
    : 0;

  const handleOpenFile = (fileUrl: string) => {
    if (fileUrl) window.open(fileUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-8">
          {project.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={project.image_url} 
                alt={project.name}
                className="w-full h-64 object-cover shadow-sm"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>
              <p className="text-muted-foreground mt-1">Détails et vue d'ensemble du projet</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {project.description && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    <FileText className="h-5 w-5 text-aps-teal" />
                    Description du projet
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Vue d'ensemble des tâches */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-aps-teal" />
                  Vue d'ensemble des tâches
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {assignments.filter(t => ['assigned', 'open'].includes(t.status)).length}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assignées</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        {assignments.filter(t => ['in_progress', 'started'].includes(t.status)).length}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">En cours</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        {assignments.filter(t => ['submitted', 'in_review'].includes(t.status)).length}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Soumises</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {validatedTasks}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Validées</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        {assignments.filter(t => ['rejected', 'var'].includes(t.status)).length}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rejetées</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                        {assignments.filter(t => t.file_url).length}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fichiers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste détaillée des tâches */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-aps-teal" />
                  Liste détaillée des tâches
                </h4>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aps-teal"></div>
                    </div>
                  ) : assignments.length > 0 ? (
                    assignments.map((task) => (
                      <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900 mb-1">{task.task_name}</h5>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="font-semibold uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Phase</span>
                                {task.phase_id === 'conception' ? 'Conception' : 'Réalisation'}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Section</span>
                                {task.section_name || task.section_id}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Sous-section</span>
                                {task.subsection_name || task.subsection_id}
                              </span>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(task.status)} border shadow-none`}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1.5">{getStatusLabel(task.status)}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-t border-gray-50 pt-3 mt-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-500">Assigné à:</span>
                            <span className="font-semibold text-gray-700">{getIntervenantNames(task.assigned_to)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-500">Échéance:</span>
                            <span className="font-semibold text-gray-700">
                              {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR') : 'Non définie'}
                            </span>
                          </div>
                        </div>

                        {task.file_url && (
                          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              <span>Document disponible</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                                className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Voir
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(task.file_url, '_blank')}
                                className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Télécharger
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">Aucune tâche assignée à ce projet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="font-bold text-lg text-gray-800 border-b pb-3">Progression du projet</h3>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Avancement Global</span>
                      <span className="text-2xl font-black text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500 shadow-sm" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 font-medium">
                      {validatedTasks} / {totalTasksInStructure} tâches validées
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Date de début</p>
                        <p className="font-bold text-gray-700">{formatDate(project.start_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Statut du projet</p>
                        <Badge className={`${
                          project.status === 'active' ? 'bg-green-500' : 
                          project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                        } text-white border-0 font-bold capitalize mt-1`}>
                          {project.status === 'active' ? 'Actif' : project.status}
                        </Badge>
                      </div>
                    </div>

                    {project.project_type && (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Type de projet</p>
                          <p className="font-bold text-gray-700">{project.project_type}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistiques rapides (Optionnel) */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInfoTab;
