import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Info, 
  Layers, 
  ArrowLeft, 
  Users,
  FileCheck,
  Loader2,
  TrendingUp
} from 'lucide-react';
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
import ProjectDocumentsTab from '@/components/project/ProjectDocumentsTab';
import ProjectInfoTab from '@/components/project/ProjectInfoTab';
import ProjectStructureTab from '@/components/project/ProjectStructureTab';
import ProjectMembersTab from '@/components/project/ProjectMembersTab';
import ProjectGanttTab from '@/components/project/ProjectGanttTab';
import ProjectInfoSheetsTab from '@/components/project/ProjectInfoSheetsTab';
import { ProjectStructureManager } from '@/components/project/ProjectStructureManager';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStructure } from '@/hooks/useProjectStructure';

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
  tenant_id?: string;
  created_at: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  joined_at?: string;
  added_at?: string;
  can_view_info_sheets: boolean;
  can_view_project_details: boolean;
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

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, role, status } = useAuth();
  const { supabase } = useSupabase();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserMember, setCurrentUserMember] = useState<ProjectMember | null>(null);
  const [intervenantsInfo, setIntervenantsInfo] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'info');

  // Synchroniser l'URL avec l'onglet actif
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [tenantId, setTenantId] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  const {
    customProjectStructure,
    customRealizationStructure,
    refreshStructure
  } = useProjectStructure(id || '');

  useEffect(() => {
    if (!id || status !== 'authenticated') return;
    fetchProjectDetails();
    fetchProjectMembers();

    // S'abonner aux changements Realtime pour ce projet
    const projectChannel = supabase
      .channel(`project-details-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects', 
        filter: `id=eq.${id}` 
      }, () => fetchProjectDetails())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'membre', 
        filter: `project_id=eq.${id}` 
      }, () => fetchProjectMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
    };
  }, [id, status]);

  useEffect(() => {
    if (!id || status !== 'authenticated') return;
    supabase.from('projects').select('tenant_id').eq('id', id).maybeSingle()
      .then(({ data }) => { if (data?.tenant_id) setTenantId(data.tenant_id); });
  }, [id, status]);

  const fetchProjectDetails = async () => {
    if (status !== 'authenticated') return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setProject(data);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails du projet',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembers = async () => {
    if (!id || status !== 'authenticated') return;

    try {
      const { data, error } = await supabase
        .from('membre')
        .select('*')
        .eq('project_id', id);

      if (error) throw error;
      if (data) {
        setMembers(data);
        const currentMember = data.find(m => m.user_id === user?.id);
        setCurrentUserMember(currentMember || null);
        fetchIntervenantsInfo(data.map(m => m.user_id));
      }
    } catch (error) {
    }
  };

  const fetchIntervenantsInfo = async (userIds: string[]) => {
    if (userIds.length === 0 || status !== 'authenticated') return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, company, specialty')
        .in('user_id', userIds);

      if (error) throw error;

      const infoMap: Record<string, any> = {};
      data?.forEach((profile: any) => {
        infoMap[profile.user_id] = profile;
      });

      setIntervenantsInfo(infoMap);
    } catch (error) {
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Projet supprimé avec succès'
      });

      navigate('/dashboard/projets');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le projet',
        variant: 'destructive'
      });
    }
  };

  const handleMembersChanged = () => {
    fetchProjectMembers();
  };

  const handleAddMembers = () => {
    // Handled by ProjectMembersTab
  };

  const handleRemoveMember = (member: ProjectMember) => {
    // Handled by ProjectMembersTab
  };

  const handleViewMemberDetails = (member: ProjectMember) => {
    // Handled by ProjectMembersTab
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p>Projet non trouvé</p>
        <Button onClick={() => navigate('/dashboard/projets')} className="mt-4">
          Retour aux projets
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ position: 'relative', width: '100%' }}>
      <Button 
        variant="outline" 
        onClick={() => navigate('/dashboard/projets')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux projets
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          {(isAdmin || currentUserMember?.can_view_project_details) && (
            <>
              <TabsTrigger value="info" className="data-[state=active]:bg-white">
                <Info className="h-4 w-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="avancement" className="data-[state=active]:bg-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Avancement
              </TabsTrigger>
            </>
          )}
          
          {(isAdmin || currentUserMember?.can_view_info_sheets) && (
            <TabsTrigger value="info-sheets" className="data-[state=active]:bg-white">
              <FileCheck className="h-4 w-4 mr-2" />
              Fiches Informatives
            </TabsTrigger>
          )}

          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 mr-2" />
            Assignement des tâches
          </TabsTrigger>

          {isAdmin && (
            <>
              <TabsTrigger value="members" className="data-[state=active]:bg-white">
                <Users className="h-4 w-4 mr-2" />
                Membres
              </TabsTrigger>
              <TabsTrigger value="manage-structure" className="data-[state=active]:bg-white">
                <Layers className="h-4 w-4 mr-2" />
                Structure du projet
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="documents" className="data-[state=active]:bg-white">
            <FileCheck className="h-4 w-4 mr-2" />
            Document/e-signature
          </TabsTrigger>
        </TabsList>

        {(isAdmin || currentUserMember?.can_view_project_details) && (
          <>
            <TabsContent value="info">
              <ProjectInfoTab 
                project={project}
                isAdmin={isAdmin}
                onEdit={() => {}}
                onDelete={() => setIsDeleteDialogOpen(true)}
                conceptionStructure={customProjectStructure}
                realizationStructure={customRealizationStructure}
              />
            </TabsContent>

            <TabsContent value="avancement">
              <ProjectGanttTab 
                project={project}
                conceptionStructure={customProjectStructure}
                realizationStructure={customRealizationStructure}
              />
            </TabsContent>
          </>
        )}

        {(isAdmin || currentUserMember?.can_view_info_sheets) && (
          <TabsContent value="info-sheets">
            <ProjectInfoSheetsTab 
              projectId={id || ''}
              isAdmin={isAdmin}
              conceptionStructure={customProjectStructure}
              realizationStructure={customRealizationStructure}
            />
          </TabsContent>
        )}

        <TabsContent value="structure">
          <ProjectStructureTab 
            conceptionStructure={customProjectStructure}
            realizationStructure={customRealizationStructure}
            projectId={id || ''}
            projectName={project?.name}
            tenantId={tenantId || project?.tenant_id}
            isAdmin={isAdmin}
            onStructureChange={refreshStructure}
            onlyAssignedTasks={!isAdmin && !currentUserMember?.can_view_project_details}
          />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="members">
              <ProjectMembersTab 
                projectId={id || ''} 
                projectName={project.name}
                members={members}
                intervenantsInfo={intervenantsInfo}
                tenantId={tenantId}
                onMembersChanged={handleMembersChanged}
              />
            </TabsContent>
            <TabsContent value="manage-structure">
              <ProjectStructureManager 
              projectId={id || ''} 
              tenantId={tenantId}
              onStructureChange={refreshStructure}
            />
            </TabsContent>
          </>
        )}

        <TabsContent value="documents">
          <ProjectDocumentsTab projectId={id || ''} isAdmin={isAdmin} tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;
