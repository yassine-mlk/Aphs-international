import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  FileText,
  Euro,
  User,
  Edit,
  Trash2
} from 'lucide-react';

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
}

const statusLabels: Record<string, string> = {
  'planning': 'En planification',
  'in_progress': 'En cours',
  'completed': 'Terminé',
  'on_hold': 'En pause',
  'cancelled': 'Annulé'
};

const statusColors: Record<string, string> = {
  'planning': 'bg-blue-100 text-blue-700',
  'in_progress': 'bg-green-100 text-green-700',
  'completed': 'bg-gray-100 text-gray-700',
  'on_hold': 'bg-yellow-100 text-yellow-700',
  'cancelled': 'bg-red-100 text-red-700'
};

const ProjectInfoTab: React.FC<ProjectInfoTabProps> = ({ 
  project, 
  isAdmin, 
  onEdit, 
  onDelete 
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatBudget = (budget?: number) => {
    if (!budget) return 'Non défini';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(budget);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-6">
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
              <Badge className={statusColors[project.status] || 'bg-gray-100'}>
                {statusLabels[project.status] || project.status}
              </Badge>
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

          {project.description && (
            <p className="text-gray-600">{project.description}</p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations générales
              </h3>
              
              <div className="space-y-3">
                {project.project_type && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Type de projet</p>
                      <p className="font-medium">{project.project_type}</p>
                    </div>
                  </div>
                )}
                
                {(project.address || project.city) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium">
                        {[project.address, project.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Dates</p>
                    <p className="font-medium">
                      Du {formatDate(project.start_date)} au {formatDate(project.end_date)}
                    </p>
                  </div>
                </div>

                {project.budget && (
                  <div className="flex items-center gap-3">
                    <Euro className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-medium">{formatBudget(project.budget)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </h3>
              
              <div className="space-y-3">
                {project.client_name && (
                  <div>
                    <p className="text-sm text-gray-500">Nom</p>
                    <p className="font-medium">{project.client_name}</p>
                  </div>
                )}
                
                {project.client_contact && (
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="font-medium">{project.client_contact}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInfoTab;
