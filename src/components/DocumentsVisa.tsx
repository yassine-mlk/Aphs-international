import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  FileText, 
  Eye, 
  HardHat,
  Filter,
  Search,
  Upload,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ProjectDocument, 
  DocumentStatus,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  STATUS_COLORS 
} from '@/types/visa';

// Mock data
const MOCK_DOCUMENTS: ProjectDocument[] = [
  {
    id: '1',
    projectId: 'proj-1',
    name: 'Plan architectural - Résidence Les Lilas',
    type: 'plan',
    version: 2,
    fileUrl: '#',
    fileName: 'plan_v2.pdf',
    status: 'en_cours',
    workflowTemplateId: 'tpl-1',
    workflow: [
      { id: 'step-1', order: 1, role: 'Architecte', userId: 'user-1', userName: 'Jean Dupont', status: 'valide', validatedAt: '2024-01-15' },
      { id: 'step-2', order: 2, role: 'BET', userId: 'user-2', userName: 'Marie Martin', status: 'en_attente' },
      { id: 'step-3', order: 3, role: 'Client', status: 'en_attente' }
    ],
    createdBy: 'user-1',
    createdByName: 'Jean Dupont',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    projectId: 'proj-1',
    name: 'DOE - Phase 2',
    type: 'doe',
    version: 1,
    fileUrl: '#',
    fileName: 'doe.pdf',
    status: 'en_attente',
    workflowTemplateId: 'tpl-2',
    workflow: [
      { id: 'step-1', order: 1, role: 'MOE', userId: 'user-3', userName: 'Pierre Bernard', status: 'en_attente' },
      { id: 'step-2', order: 2, role: 'Contrôleur', status: 'en_attente' }
    ],
    createdBy: 'user-3',
    createdByName: 'Pierre Bernard',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20'
  },
  {
    id: '3',
    projectId: 'proj-1',
    name: 'Rapport mensuel - Janvier',
    type: 'rapport',
    version: 1,
    fileUrl: '#',
    fileName: 'rapport.pdf',
    status: 'valide',
    workflowTemplateId: 'tpl-3',
    workflow: [
      { id: 'step-1', order: 1, role: 'Chef de projet', userId: 'user-5', userName: 'Lucas Moreau', status: 'valide', validatedAt: '2024-01-10' }
    ],
    createdBy: 'user-6',
    createdByName: 'Emma Garcia',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-10'
  },
  {
    id: '4',
    projectId: 'proj-1',
    name: 'Note de calcul',
    type: 'note',
    version: 3,
    fileUrl: '#',
    fileName: 'note_v3.pdf',
    status: 'refuse',
    workflowTemplateId: 'tpl-1',
    workflow: [
      { id: 'step-1', order: 1, role: 'BET', userId: 'user-2', userName: 'Marie Martin', status: 'refuse', validatedAt: '2024-01-12', comment: 'Erreur dans les calculs de charges' }
    ],
    createdBy: 'user-7',
    createdByName: 'Thomas Richard',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-12'
  }
];

const MOCK_WORKFLOW_TEMPLATES = [
  { id: 'tpl-1', name: 'Validation Standard' },
  { id: 'tpl-2', name: 'Validation Rapide' },
  { id: 'tpl-3', name: 'Simple Validation' }
];

interface DocumentsVisaProps {
  projectId: string;
  isAdmin: boolean;
}

const DocumentsVisa: React.FC<DocumentsVisaProps> = ({ projectId, isAdmin }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ProjectDocument[]>(MOCK_DOCUMENTS);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add document modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('plan');
  const [newDocTemplate, setNewDocTemplate] = useState('');

  const getStatusBadge = (status: DocumentStatus) => {
    const colors = STATUS_COLORS[status];
    const label = DOCUMENT_STATUS_LABELS[status];
    return (
      <Badge className={colors}>
        {label}
      </Badge>
    );
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'valide':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'refuse':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'en_cours':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getProgressBadge = (document: ProjectDocument) => {
    const validated = document.workflow.filter(s => s.status === 'valide' || s.status === 'valide_avec_reserves').length;
    const total = document.workflow.length;
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${(validated / total) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-600">{validated}/{total}</span>
      </div>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const handleAddDocument = () => {
    if (!newDocName.trim() || !newDocTemplate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      projectId,
      name: newDocName,
      type: newDocType,
      version: 1,
      fileUrl: '#',
      fileName: `${newDocName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      status: 'en_attente',
      workflowTemplateId: newDocTemplate,
      workflow: MOCK_WORKFLOW_TEMPLATES.find(t => t.id === newDocTemplate)?.id === 'tpl-1' 
        ? [
            { id: 'step-1', order: 1, role: 'Architecte', status: 'en_attente' },
            { id: 'step-2', order: 2, role: 'BET', status: 'en_attente' },
            { id: 'step-3', order: 3, role: 'Client', status: 'en_attente' }
          ]
        : [{ id: 'step-1', order: 1, role: 'Chef de projet', status: 'en_attente' }],
      createdBy: 'current-user',
      createdByName: 'Utilisateur',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocuments([newDoc, ...documents]);
    setIsAddModalOpen(false);
    setNewDocName('');
    setNewDocType('plan');
    setNewDocTemplate('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-blue-600" />
            Documents & Visa
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les documents et leurs workflows de validation
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-xl">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="valide">Validé</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
              <SelectItem value="doe">DOE</SelectItem>
              <SelectItem value="rapport">Rapport</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun document trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Document</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Version</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Progression</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Mise à jour</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocuments.map((doc) => (
                    <tr 
                      key={doc.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <HardHat className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-500">{doc.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {DOCUMENT_TYPE_LABELS[doc.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">V{doc.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          {getStatusBadge(doc.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getProgressBadge(doc)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/documents/${doc.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Document Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du document *</Label>
              <Input 
                placeholder="Ex: Plan architectural - Phase 2"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de document *</Label>
              <Select value={newDocType} onValueChange={(v) => setNewDocType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="doe">DOE</SelectItem>
                  <SelectItem value="rapport">Rapport</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Cliquez pour uploader ou glissez-déposez</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template de workflow *</Label>
              <Select value={newDocTemplate} onValueChange={setNewDocTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un template" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_WORKFLOW_TEMPLATES.map(tpl => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Créer et lancer le workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsVisa;
