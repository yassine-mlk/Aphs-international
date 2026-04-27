import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Calendar, 
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('project_id', project.id);
      
      setAssignments(data || []);
    };
    fetchAssignments();
  }, [project.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateProgress = (items: ProjectItem[]) => {
    if (items.length === 0) return 0;
    const taskIds = items.flatMap(i => i.tasks.map(t => t.id));
    if (taskIds.length === 0) return 0;
    
    const relevantAssignments = assignments.filter(a => taskIds.includes(a.task_id));
    if (relevantAssignments.length === 0) return 0;

    const validatedCount = relevantAssignments.filter(a => a.status === 'validated').length;
    return Math.round((validatedCount / relevantAssignments.length) * 100);
  };

  const allSections = [...conceptionStructure, ...realizationStructure];

  const getOverallProgress = () => {
    const allItems = allSections.flatMap(s => s.items);
    return calculateProgress(allItems);
  };

  const overallProgress = getOverallProgress();
  const totalTasks = assignments.length;
  const validatedTasks = assignments.filter(a => a.status === 'validated').length;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-8">
          {project.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={project.image_url} 
                alt={project.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {project.description && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-gray-700">
                  <FileText className="h-4 w-4" />
                  Description du projet
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-gray-700">
                <Building2 className="h-4 w-4" />
                Informations générales
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date de début
                  </p>
                  <p className="font-medium text-sm">{formatDate(project.start_date)}</p>
                </div>

                {project.project_type && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Type
                    </p>
                    <p className="font-medium text-sm">{project.project_type}</p>
                  </div>
                )}
              </div>

              {/* Statistiques rapides */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">Avancement Global</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-blue-700">{overallProgress}%</span>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 font-semibold mb-1 uppercase tracking-wider">Tâches Validées</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-green-700">{validatedTasks}</span>
                    <span className="text-xs text-green-600 mb-1">/ {totalTasks}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInfoTab;
