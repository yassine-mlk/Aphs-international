import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, 
  Search, 
  Filter, 
  PenTool, 
  Eye, 
  Download, 
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';

const MesSignatures: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingDocs, signedDocs, loading, signDocument, rejectDocument } = usePendingDocuments();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Extraire les projets uniques pour le filtre
  const projects = useMemo(() => {
    const allDocs = [...pendingDocs, ...signedDocs];
    const uniqueProjects = [...new Map(allDocs.map(d => [d.project_id, { id: d.project_id, name: d.project_name }])).values()];
    return uniqueProjects;
  }, [pendingDocs, signedDocs]);

  // Filtrer les documents
  const filteredPending = useMemo(() => {
    return pendingDocs.filter(doc => {
      const matchesSearch = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.uploaded_by_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = selectedProject === 'all' || doc.project_id === selectedProject;
      return matchesSearch && matchesProject;
    });
  }, [pendingDocs, searchQuery, selectedProject]);

  const filteredSigned = useMemo(() => {
    return signedDocs.filter(doc => {
      const matchesSearch = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.uploaded_by_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = selectedProject === 'all' || doc.project_id === selectedProject;
      return matchesSearch && matchesProject;
    });
  }, [signedDocs, searchQuery, selectedProject]);

  const handleSign = async () => {
    if (!selectedDoc) return;
    
    setProcessing(true);
    const success = await signDocument(selectedDoc.id, comment);
    setProcessing(false);
    
    if (success) {
      setIsSignDialogOpen(false);
      setComment('');
      setSelectedDoc(null);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectReason.trim()) return;
    
    setProcessing(true);
    const success = await rejectDocument(selectedDoc.id, rejectReason);
    setProcessing(false);
    
    if (success) {
      setIsRejectDialogOpen(false);
      setRejectReason('');
      setSelectedDoc(null);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  const DocumentCard = ({ doc, isPending }: { doc: any, isPending: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-lg">{doc.document_name}</h3>
            {isPending ? (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <Clock className="h-3 w-3 mr-1" />
                En attente
              </Badge>
            ) : doc.status === 'signed' ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Signé
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Refusé
              </Badge>
            )}
          </div>
          
          {doc.document_description && (
            <p className="text-gray-600 text-sm mb-3">{doc.document_description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {doc.project_name}
            </span>
            <span>•</span>
            <span>Par: {doc.uploaded_by_name}</span>
            <span>•</span>
            <span>{formatDate(doc.uploaded_at)}</span>
          </div>
          
          {!isPending && doc.signed_at && (
            <p className="text-sm text-gray-500">
              Traité le: {formatDate(doc.signed_at)}
            </p>
          )}
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
          
          {isPending && (
            <>
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                <Mail className="h-4 w-4 inline mr-1" />
                Signature par email uniquement
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Mes Signatures</h1>
              <p className="text-gray-500">Documents à signer électroniquement</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {pendingDocs.length} en attente
            </Badge>
          </div>
        </div>

        {/* Filtres */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un document, projet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les projets</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents en attente */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Documents en attente ({filteredPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : filteredPending.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-400" />
                  <p className="text-lg">Aucun document en attente de signature</p>
                  <p className="text-sm">Vous avez signé tous vos documents !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPending.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} isPending={true} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Documents signés/refusés */}
        {filteredSigned.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Documents traités ({filteredSigned.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSigned.map(doc => (
                  <DocumentCard key={doc.id} doc={doc} isPending={false} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de signature */}
        <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Signature électronique
              </DialogTitle>
              <DialogDescription>
                Vous êtes sur le point de signer "{selectedDoc?.document_name}".
                Cette action est définitive.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <label className="text-sm font-medium">Commentaire (optionnel)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire si nécessaire..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSign}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
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

        {/* Dialog de refus */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Refuser le document
              </DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison du refus.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <label className="text-sm font-medium">Motif du refus *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indiquez pourquoi vous refusez ce document..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                variant="destructive"
              >
                {processing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirmer le refus
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MesSignatures;
