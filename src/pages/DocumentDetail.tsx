import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Upload,
  FileText,
  Clock,
  MessageSquare,
  HardHat,
  Eye,
  Download,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ProjectDocument, 
  ValidationComment, 
  WorkflowStep,
  VALIDATION_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  STATUS_COLORS 
} from '@/types/visa';

// Mock data
const MOCK_DOCUMENT: ProjectDocument = {
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
    { id: 'step-1', order: 1, role: 'Architecte', userId: 'user-1', userName: 'Jean Dupont', status: 'valide', validatedAt: '2024-01-15', comment: 'Plan conforme aux attentes du client.' },
    { id: 'step-2', order: 2, role: 'BET', userId: 'user-2', userName: 'Marie Martin', status: 'en_attente' },
    { id: 'step-3', order: 3, role: 'Client', status: 'en_attente' }
  ],
  createdBy: 'user-1',
  createdByName: 'Jean Dupont',
  createdAt: '2024-01-10',
  updatedAt: '2024-01-15'
};

const MOCK_COMMENTS: ValidationComment[] = [
  {
    id: 'comment-1',
    documentId: '1',
    userId: 'user-1',
    userName: 'Jean Dupont',
    userRole: 'Architecte',
    content: 'J\'ai revu les plans suite à vos remarques. Les ajustements demandés ont été effectués.',
    createdAt: '2024-01-14T10:30:00Z'
  },
  {
    id: 'comment-2',
    documentId: '1',
    userId: 'user-2',
    userName: 'Marie Martin',
    userRole: 'BET',
    content: 'Merci pour les modifications. Je vais vérifier les calculs structurels et revenir vers vous.',
    createdAt: '2024-01-15T14:20:00Z'
  }
];

const DocumentDetail: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [document, setDocument] = useState<ProjectDocument>(MOCK_DOCUMENT);
  const [comments, setComments] = useState<ValidationComment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [validationComment, setValidationComment] = useState('');
  
  // Current user info from AuthContext
  const currentUserId = user?.id || '';
  const isAdmin = role === 'admin';

  // Find active step
  const activeStep = document.workflow.find(step => step.status === 'en_attente');
  const isMyTurn = activeStep?.userId === currentUserId;

  const getStatusBadge = (status: string) => {
    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700';
    const label = VALIDATION_STATUS_LABELS[status as keyof typeof VALIDATION_STATUS_LABELS] || status;
    return (
      <Badge className={colors}>
        {label}
      </Badge>
    );
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'valide':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'valide_avec_reserves':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'refuse':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleValidate = (action: 'valide' | 'valide_avec_reserves' | 'refuse') => {
    if (action === 'refuse' && !validationComment.trim()) {
      alert('Un commentaire est obligatoire en cas de refus');
      return;
    }

    // Mock update - à remplacer par appel API
    const updatedDocument = { ...document };
    const stepIndex = updatedDocument.workflow.findIndex(s => s.id === activeStep?.id);
    if (stepIndex >= 0) {
      updatedDocument.workflow[stepIndex].status = action;
      updatedDocument.workflow[stepIndex].validatedAt = new Date().toISOString();
      updatedDocument.workflow[stepIndex].comment = validationComment;
    }
    
    // Update document status
    if (action === 'refuse') {
      updatedDocument.status = 'refuse';
    } else {
      // Check if all steps are validated
      const allValidated = updatedDocument.workflow.every(s => s.status === 'valide' || s.status === 'valide_avec_reserves');
      if (allValidated) {
        updatedDocument.status = 'valide';
      }
    }
    
    setDocument(updatedDocument);
    setValidationComment('');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: ValidationComment = {
      id: `comment-${Date.now()}`,
      documentId: document.id,
      userId: currentUserId,
      userName: 'Marie Martin', // Mock
      userRole: 'BET',
      content: newComment,
      createdAt: new Date().toISOString()
    };

    setComments([...comments, comment]);
    setNewComment('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{document.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            <span>V{document.version}</span>
            <span>•</span>
            {getStatusBadge(document.status)}
            <span>•</span>
            <span>Créé par {document.createdByName}</span>
            <span>•</span>
            <span>{formatDate(document.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Document Preview */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-200px)]">
            <CardContent className="p-0 h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <FileText className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{document.fileName}</p>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  Ouvrir le document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Workflow & Comments */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="comments">
                Commentaires ({comments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow de validation</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progression</span>
                      <span>
                        {document.workflow.filter(s => s.status !== 'en_attente').length} / {document.workflow.length} étapes
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ 
                          width: `${(document.workflow.filter(s => s.status !== 'en_attente').length / document.workflow.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-4">
                    {document.workflow.map((step, index) => (
                      <div key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.status === 'valide' ? 'bg-green-100' :
                            step.status === 'valide_avec_reserves' ? 'bg-orange-100' :
                            step.status === 'refuse' ? 'bg-red-100' :
                            step.status === 'en_attente' && step.userId === currentUserId ? 'bg-blue-100' :
                            'bg-gray-100'
                          }`}>
                            {getStepIcon(step)}
                          </div>
                          {index < document.workflow.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 my-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{step.role}</p>
                              {step.userName && (
                                <p className="text-sm text-gray-500">{step.userName}</p>
                              )}
                            </div>
                            {getStatusBadge(step.status)}
                          </div>
                          {step.validatedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(step.validatedAt)}
                            </p>
                          )}
                          {step.comment && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                              "{step.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Validation Actions */}
              {isMyTurn && document.status !== 'refuse' && document.status !== 'valide' && (
                <Card className="mt-4 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-700">
                      Action requise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Vous êtes {activeStep?.role} pour cette étape. Veuillez valider ou refuser ce document.
                    </p>
                    
                    <Textarea
                      placeholder="Commentaire (obligatoire si refus)"
                      value={validationComment}
                      onChange={(e) => setValidationComment(e.target.value)}
                      className="min-h-[80px]"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline"
                        className="border-green-500 text-green-700 hover:bg-green-50"
                        onClick={() => handleValidate('valide')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Valider
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-orange-500 text-orange-700 hover:bg-orange-50"
                        onClick={() => handleValidate('valide_avec_reserves')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Réserves
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-red-500 text-red-700 hover:bg-red-50"
                        onClick={() => handleValidate('refuse')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commentaires</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Comments List */}
                  <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Aucun commentaire
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {comment.userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.userRole}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Add Comment */}
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Ajouter un commentaire..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button 
                      className="w-full"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Commenter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetail;
