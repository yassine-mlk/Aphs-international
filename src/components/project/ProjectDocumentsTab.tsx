import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToR2 } from '@/lib/r2';
import { FileUp, Upload, Send, Users, FileCheck, Clock, CheckCircle2, XCircle, Eye, Download, Trash2, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

interface DocumentRecipient {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_at?: string;
  signature_url?: string;
  comment?: string;
  created_at: string;
}

interface ProjectMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
}

interface ProjectDocumentsTabProps {
  projectId: string;
  isAdmin: boolean;
  tenantId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de signature',
  signed: 'Signé',
  rejected: 'Refusé'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  signed: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200'
};

const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ projectId, isAdmin, tenantId }) => {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [recipients, setRecipients] = useState<Record<string, DocumentRecipient[]>>({});
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Signature dialog state
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signingDocument, setSigningDocument] = useState<ProjectDocument | null>(null);
  const [signatureComment, setSignatureComment] = useState('');
  const [signing, setSigning] = useState(false);

  // View recipients dialog
  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<ProjectDocument | null>(null);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  // Fetch project members
  const fetchProjectMembers = useCallback(async () => {
    try {
      
      // Step 1: Get user_ids from membre table
      const { data: memberData, error: memberError } = await supabase
        .from('membre')
        .select('user_id')
        .eq('project_id', projectId);

      if (memberError) {
        throw memberError;
      }


      if (memberData && memberData.length > 0) {
        const userIds = memberData.map(m => m.user_id);
        
        // Step 2: Fetch profiles one by one (to avoid .in() issues)
        const profiles: ProjectMember[] = [];
        for (const userId of userIds) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email, company')
            .eq('user_id', userId)
            .single();
          
          if (profileError) {
          } else if (profile) {
            profiles.push(profile);
          }
        }
        
        setProjectMembers(profiles);
      } else {
        setProjectMembers([]);
      }
    } catch (error) {
      setProjectMembers([]);
    }
  }, [projectId, supabase]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      let docs: ProjectDocument[] = [];
      
      if (isAdmin) {
        // Admin: voit tous les documents du projet de SON tenant
        let query = supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        // Si tenantId est fourni, filtrer par tenant
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        
        const { data, error } = await query;

        if (error) throw error;
        docs = data || [];
      } else {
        // Non-admin: ne voit que les documents où il est destinataire
        // D'abord, récupérer les IDs des documents où l'utilisateur est destinataire
        const { data: userRecipients, error: recipientsError } = await supabase
          .from('document_recipients')
          .select('document_id')
          .eq('user_id', user?.id)
          .eq('project_id', projectId);

        if (recipientsError) throw recipientsError;

        if (userRecipients && userRecipients.length > 0) {
          const docIds = userRecipients.map(r => r.document_id);
          
          // Récupérer les détails de ces documents du tenant
          let query = supabase
            .from('project_documents')
            .select('*')
            .in('id', docIds)
            .order('created_at', { ascending: false });
          
          // Si tenantId est fourni, filtrer par tenant
          if (tenantId) {
            query = query.eq('tenant_id', tenantId);
          }
          
          const { data, error } = await query;

          if (error) throw error;
          docs = data || [];
        }
      }

      setDocuments(docs);

      // Fetch recipients for each document
      if (docs.length > 0) {
        const docIds = docs.map(d => d.id);
        const { data: recipientsData, error: recipientsError } = await supabase
          .from('document_recipients')
          .select('*')
          .in('document_id', docIds);

        if (recipientsError) throw recipientsError;

        const recipientsByDoc: Record<string, DocumentRecipient[]> = {};
        recipientsData?.forEach(r => {
          if (!recipientsByDoc[r.document_id]) {
            recipientsByDoc[r.document_id] = [];
          }
          recipientsByDoc[r.document_id].push(r);
        });
        setRecipients(recipientsByDoc);
      } else {
        setRecipients({});
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, toast, isAdmin, user?.id, tenantId]);

  useEffect(() => {
    fetchDocuments();
    fetchProjectMembers();
  }, [fetchDocuments, fetchProjectMembers]);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Upload document
  const handleUpload = async () => {
    if (!selectedFile || !documentName || selectedRecipients.length === 0) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez sélectionner un fichier, un nom et au moins un destinataire',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to Cloudflare R2
      const filePath = `project-documents/${projectId}/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      
      const fileUrl = await uploadToR2(selectedFile, filePath);

        // Create document record avec tenant_id
        const { data: docData, error: docError } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            tenant_id: tenantId,
            name: documentName,
            description: documentDescription,
            file_url: fileUrl,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            uploaded_by: user?.id,
            uploaded_by_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || 'Administrateur'
          })
        .select()
        .single();

      if (docError) throw docError;

      // Create recipient records
      const recipientRecords = selectedRecipients.map(userId => {
        const member = projectMembers.find(m => m.user_id === userId);
        return {
          document_id: docData.id,
          user_id: userId,
          user_name: `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || member?.email || 'Utilisateur',
          user_email: member?.email || '',
          status: 'pending'
        };
      });

      const { data: insertedRecipients, error: recipientsError } = await supabase
        .from('document_recipients')
        .insert(recipientRecords)
        .select();

      if (recipientsError) throw recipientsError;

      // Envoyer les emails de demande de signature
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        const recipients = selectedRecipients.map(userId => {
          const member = projectMembers.find(m => m.user_id === userId);
          // Récupérer l'ID du recipient créé
          const insertedRecord = insertedRecipients?.find(r => r.user_id === userId);
          return {
            recipientId: insertedRecord?.id,
            userId: userId,
            email: member?.email || '',
            name: `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || member?.email || 'Utilisateur'
          };
        });

        await supabase.functions.invoke('send-signature-request-email', {
          body: {
            recipients,
            documentName: documentName,
            projectName: projectData?.name || '',
            uploadedByName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || 'Administrateur',
            documentId: docData.id,
            projectId: projectId
          }
        });

        toast({
          title: 'Succès',
          description: `Document envoyé à ${selectedRecipients.length} destinataire(s). Des emails de signature ont été envoyés.`
        });
      } catch (emailError) {
        // Ne pas bloquer si l'email échoue
        toast({
          title: 'Succès',
          description: `Document envoyé à ${selectedRecipients.length} destinataire(s)`,
          variant: 'default'
        });
      }

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentName('');
      setDocumentDescription('');
      setSelectedRecipients([]);
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // Sign document
  const handleSign = async () => {
    if (!signingDocument || !user) return;

    setSigning(true);
    try {
      const { error } = await supabase
        .from('document_recipients')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          comment: signatureComment
        })
        .eq('document_id', signingDocument.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Document signé avec succès'
      });

      setIsSignDialogOpen(false);
      setSigningDocument(null);
      setSignatureComment('');
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de signer le document',
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  // Reject document
  const handleReject = async () => {
    if (!signingDocument || !user) return;

    setSigning(true);
    try {
      const { error } = await supabase
        .from('document_recipients')
        .update({
          status: 'rejected',
          signed_at: new Date().toISOString(),
          comment: signatureComment
        })
        .eq('document_id', signingDocument.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Document refusé',
        description: 'Le document a été marqué comme refusé'
      });

      setIsSignDialogOpen(false);
      setSigningDocument(null);
      setSignatureComment('');
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser le document',
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  // Delete document (admin only)
  const handleDelete = async (document: ProjectDocument) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;

    try {
      // Delete recipients first
      await supabase
        .from('document_recipients')
        .delete()
        .eq('document_id', document.id);

      // Delete document record
      await supabase
        .from('project_documents')
        .delete()
        .eq('id', document.id);

      // Note: The file remains in Cloudflare R2 (orphaned) - cleanup would need to be done via R2 API
      // For now we just remove the database record

      toast({
        title: 'Succès',
        description: 'Document supprimé'
      });

      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive'
      });
    }
  };

  // Get current user's recipient status for a document
  const getUserStatus = (docId: string): DocumentRecipient | undefined => {
    const docRecipients = recipients[docId] || [];
    return docRecipients.find(r => r.user_id === user?.id);
  };

  // Check if user has pending documents to sign
  const hasPendingDocuments = documents.some(doc => {
    const status = getUserStatus(doc.id);
    return status?.status === 'pending';
  });

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Document/e-signature
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {documents.length} document{documents.length > 1 ? 's' : ''} • 
              {documents.filter(d => {
                const r = recipients[d.id] || [];
                return r.some(rec => rec.status === 'pending');
              }).length} en attente de signature
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Envoyer un document
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Pending signature alert */}
      {hasPendingDocuments && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">Documents en attente de signature</p>
            <p className="text-sm text-yellow-600">
              Vous avez des documents qui nécessitent votre signature électronique.
            </p>
          </div>
        </div>
      )}

      {/* Documents list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Chargement des documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun document dans ce projet</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Envoyer votre premier document
              </Button>
            )}
          </div>
        ) : (
          documents.map(doc => {
            const docRecipients = recipients[doc.id] || [];
            const userStatus = getUserStatus(doc.id);
            const signedCount = docRecipients.filter(r => r.status === 'signed').length;
            const totalCount = docRecipients.length;

            return (
              <Card key={doc.id} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{doc.name}</h3>
                        {userStatus && (
                          <Badge className={STATUS_COLORS[userStatus.status]}>
                            {STATUS_LABELS[userStatus.status]}
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-gray-600 text-sm mb-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Par: {doc.uploaded_by_name}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {signedCount}/{totalCount} signé{signedCount > 1 ? 's' : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setViewingDocument(doc);
                            setIsRecipientsDialogOpen(true);
                          }}
                        >
                          Voir les destinataires
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url + '?download', '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>

                      {/* Sign button - only for pending documents */}
                      {userStatus?.status === 'pending' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSigningDocument(doc);
                            setIsSignDialogOpen(true);
                          }}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Signer
                        </Button>
                      )}

                      {/* Admin actions */}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Envoyer un document</DialogTitle>
            <DialogDescription>
              Téléchargez un document et sélectionnez les intervenants qui doivent le signer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File upload */}
            <div className="space-y-2">
              <Label>Fichier</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Cliquez pour sélectionner un fichier'}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Document name */}
            <div className="space-y-2">
              <Label>Nom du document</Label>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ex: Contrat de construction"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder="Description ou instructions pour les signataires..."
                rows={3}
              />
            </div>

            {/* Recipients selection */}
            <div className="space-y-2">
              <Label>Destinataires ({selectedRecipients.length} sélectionné{selectedRecipients.length > 1 ? 's' : ''})</Label>
              {projectMembers.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun membre dans ce projet</p>
              ) : (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {projectMembers.map(member => (
                    <label
                      key={member.user_id}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                        selectedRecipients.includes(member.user_id) ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(member.user_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRecipients(prev => [...prev, member.user_id]);
                          } else {
                            setSelectedRecipients(prev => prev.filter(id => id !== member.user_id));
                          }
                        }}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        {member.company && (
                          <p className="text-xs text-gray-400">{member.company}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !documentName || selectedRecipients.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Signature électronique
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de signer le document "{signingDocument?.name}".
              Cette action est définitive.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Commentaire (optionnel)</Label>
            <Textarea
              value={signatureComment}
              onChange={(e) => setSignatureComment(e.target.value)}
              placeholder="Ajoutez un commentaire si nécessaire..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={signing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Refuser
            </Button>
            <Button
              onClick={handleSign}
              disabled={signing}
              className="bg-green-600 hover:bg-green-700"
            >
              {signing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Signature...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Signer le document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipients Dialog */}
      <Dialog open={isRecipientsDialogOpen} onOpenChange={setIsRecipientsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destinataires</DialogTitle>
            <DialogDescription>
              État des signatures pour "{viewingDocument?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {(recipients[viewingDocument?.id || ''] || []).map(recipient => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(recipient.user_name.split(' ')[0], recipient.user_name.split(' ')[1])}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{recipient.user_name}</p>
                    <p className="text-xs text-gray-500">{recipient.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[recipient.status]}>
                    {STATUS_LABELS[recipient.status]}
                  </Badge>
                  {recipient.signed_at && (
                    <span className="text-xs text-gray-500">
                      {formatDate(recipient.signed_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {(recipients[viewingDocument?.id || ''] || []).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Aucun destinataire
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsRecipientsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDocumentsTab;
