import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  Folder,
  HardHat
} from 'lucide-react';
import { 
  ValidationItem, 
  DocumentStatus, 
  VALIDATION_STATUS_LABELS, 
  DOCUMENT_STATUS_LABELS,
  STATUS_COLORS 
} from '@/types/visa';

// Mock data - À remplacer par données Supabase
const MOCK_VALIDATIONS: ValidationItem[] = [
  {
    document: {
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
    projectName: 'Résidence Les Lilas - Phase 2',
    currentStep: { id: 'step-2', order: 2, role: 'BET', userId: 'user-2', userName: 'Marie Martin', status: 'en_attente' },
    isMyTurn: true,
    totalSteps: 3,
    validatedSteps: 1
  },
  {
    document: {
      id: '2',
      projectId: 'proj-2',
      name: 'DOE - Bureau Centre-Ville',
      type: 'doe',
      version: 1,
      fileUrl: '#',
      fileName: 'doe_v1.pdf',
      status: 'en_attente',
      workflowTemplateId: 'tpl-2',
      workflow: [
        { id: 'step-1', order: 1, role: 'MOE', userId: 'user-3', userName: 'Pierre Bernard', status: 'en_attente' },
        { id: 'step-2', order: 2, role: 'Contrôleur', status: 'en_attente' }
      ],
      createdBy: 'user-4',
      createdByName: 'Sophie Petit',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20'
    },
    projectName: 'Bureau Centre-Ville',
    currentStep: { id: 'step-1', order: 1, role: 'MOE', userId: 'user-3', userName: 'Pierre Bernard', status: 'en_attente' },
    isMyTurn: true,
    totalSteps: 2,
    validatedSteps: 0
  },
  {
    document: {
      id: '3',
      projectId: 'proj-1',
      name: 'Rapport mensuel - Janvier',
      type: 'rapport',
      version: 1,
      fileUrl: '#',
      fileName: 'rapport_jan.pdf',
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
    projectName: 'Résidence Les Lilas - Phase 2',
    currentStep: null,
    isMyTurn: false,
    totalSteps: 1,
    validatedSteps: 1
  }
];

interface ValidationSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  items: ValidationItem[];
  color: string;
}

const Validations: React.FC = () => {
  const navigate = useNavigate();
  const [validations, setValidations] = useState<ValidationItem[]>(MOCK_VALIDATIONS);
  const [activeTab, setActiveTab] = useState<string>('a-valider');

  // Filtrer les validations
  const sections: ValidationSection[] = [
    {
      id: 'a-valider',
      title: 'À valider',
      icon: <Clock className="h-5 w-5" />,
      count: validations.filter(v => v.isMyTurn && v.document.status === 'en_cours').length,
      items: validations.filter(v => v.isMyTurn && v.document.status === 'en_cours'),
      color: 'bg-blue-500'
    },
    {
      id: 'en-attente',
      title: 'En attente des autres',
      icon: <AlertCircle className="h-5 w-5" />,
      count: validations.filter(v => !v.isMyTurn && v.document.status === 'en_cours').length,
      items: validations.filter(v => !v.isMyTurn && v.document.status === 'en_cours'),
      color: 'bg-orange-500'
    },
    {
      id: 'refuses',
      title: 'Refusés',
      icon: <XCircle className="h-5 w-5" />,
      count: validations.filter(v => v.document.status === 'refuse').length,
      items: validations.filter(v => v.document.status === 'refuse'),
      color: 'bg-red-500'
    },
    {
      id: 'valides',
      title: 'Validés récemment',
      icon: <CheckCircle2 className="h-5 w-5" />,
      count: validations.filter(v => v.document.status === 'valide').length,
      items: validations.filter(v => v.document.status === 'valide'),
      color: 'bg-green-500'
    }
  ];

  const currentSection = sections.find(s => s.id === activeTab) || sections[0];

  const getStatusBadge = (status: DocumentStatus) => {
    const colors = STATUS_COLORS[status];
    const label = DOCUMENT_STATUS_LABELS[status];
    return (
      <Badge className={colors}>
        {label}
      </Badge>
    );
  };

  const getProgressBadge = (validated: number, total: number) => {
    const percentage = Math.round((validated / total) * 100);
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600">{validated}/{total}</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-blue-600" />
            Mes validations
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez les documents en attente de validation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
            {sections[0].count} en attente
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
              activeTab === section.id 
                ? 'bg-white shadow-lg border-2 border-blue-500' 
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.color} text-white`}>
              {section.icon}
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">{section.title}</div>
              <div className="text-2xl font-bold">{section.count}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentSection.title}</span>
            <span className="text-sm font-normal text-gray-500">
              {currentSection.items.length} document{currentSection.items.length > 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentSection.items.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun document dans cette catégorie</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentSection.items.map((item) => (
                <div 
                  key={item.document.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/dashboard/documents/${item.document.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <HardHat className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                        {item.document.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Folder className="h-4 w-4" />
                        {item.projectName}
                        <span className="mx-2">•</span>
                        V{item.document.version}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {item.isMyTurn && (
                      <Badge className="bg-blue-100 text-blue-700">
                        Votre tour
                      </Badge>
                    )}
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Progression</div>
                      {getProgressBadge(item.validatedSteps, item.totalSteps)}
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-sm text-gray-500 mb-1">Statut</div>
                      {getStatusBadge(item.document.status)}
                    </div>

                    {item.currentStep && (
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm text-gray-500 mb-1">Étape actuelle</div>
                        <div className="text-sm font-medium">{item.currentStep.role}</div>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/documents/${item.document.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Validations;
