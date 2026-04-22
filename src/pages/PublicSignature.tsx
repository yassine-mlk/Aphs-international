import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentInfo {
  id: string;
  document_name: string;
  project_name: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: 'pending' | 'signed' | 'rejected';
  recipient_name: string;
  token_expires_at: string | null;
}

export default function PublicSignature() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Lien de signature invalide');
      setLoading(false);
      return;
    }
    fetchDocumentInfo();
  }, [token]);

  const fetchDocumentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('document_recipients')
        .select(`
          id,
          status,
          signed_at,
          signature_token,
          token_expires_at,
          user_name,
          project_documents!inner(
            id,
            name,
            created_at,
            uploaded_by_name,
            project_id,
            projects(name)
          )
        `)
        .eq('signature_token', token)
        .single();

      if (error || !data) {
        setError('Lien de signature invalide ou expiré');
        setLoading(false);
        return;
      }

      // Vérifier si le token est expiré
      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        setError('Ce lien de signature a expiré');
        setLoading(false);
        return;
      }

      // Vérifier si déjà signé
      if (data.status === 'signed') {
        setSigned(true);
        setLoading(false);
        return;
      }

      if (data.status === 'rejected') {
        setError('Ce document a été refusé');
        setLoading(false);
        return;
      }

      // projects est un array, prendre le premier élément
      const projectsArray = data.project_documents?.projects;
      const projectName = Array.isArray(projectsArray) && projectsArray.length > 0 
        ? projectsArray[0].name 
        : 'Projet inconnu';

      setDocumentInfo({
        id: data.id,
        document_name: data.project_documents.name,
        project_name: projectName,
        uploaded_by_name: data.project_documents.uploaded_by_name,
        uploaded_at: data.project_documents.created_at,
        status: data.status,
        recipient_name: data.user_name,
        token_expires_at: data.token_expires_at
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Erreur lors du chargement du document');
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!documentInfo || !token) return;

    setSigning(true);
    try {
      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('document_recipients')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_token: null, // Invalide le lien
          signature_method: 'email_link',
          signature_ip: null, // Sera récupéré côté serveur si besoin
        })
        .eq('id', documentInfo.id);

      if (updateError) throw updateError;

      // Créer une notification pour l'admin
      const { data: docData } = await supabase
        .from('document_recipients')
        .select('project_documents(uploaded_by)')
        .eq('id', documentInfo.id)
        .single();

      // project_documents peut être un array
      const projectDocs = docData?.project_documents;
      const uploadedBy = Array.isArray(projectDocs) && projectDocs.length > 0 
        ? projectDocs[0].uploaded_by 
        : projectDocs?.uploaded_by;

      if (uploadedBy) {
        await supabase.from('notifications').insert({
          user_id: uploadedBy,
          type: 'document_signed',
          title: 'Document signé par email',
          message: `${documentInfo.recipient_name} a signé le document "${documentInfo.document_name}"`,
          data: {
            documentName: documentInfo.document_name,
            signerName: documentInfo.recipient_name,
            projectId: null,
            signatureMethod: 'email_link'
          },
          read: false
        });

        // Envoyer un email à l'admin
        await supabase.functions.invoke('send-document-signed-email', {
          body: {
            adminId: uploadedBy,
            documentName: documentInfo.document_name,
            signerName: documentInfo.recipient_name,
            projectId: null,
            comment: 'Signé via lien email'
          }
        });
      }

      setSigned(true);
    } catch (err) {
      console.error('Error signing document:', err);
      setError('Erreur lors de la signature du document');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Document signé !</h2>
            <p className="text-gray-600 mb-4">
              Le document a été signé électroniquement avec succès.
            </p>
            <p className="text-sm text-gray-500">
              L'administrateur a été notifié de votre signature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <FileCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Signature électronique</h1>
          <p className="text-gray-600 mt-2">APS - Gestion de projets</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document à signer</CardTitle>
            <CardDescription>
              Vous avez reçu une demande de signature électronique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informations du document */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <span className="text-sm text-gray-500">Document</span>
                <p className="font-medium text-gray-900">{documentInfo?.document_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Projet</span>
                <p className="font-medium text-gray-900">{documentInfo?.project_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Envoyé par</span>
                <p className="font-medium text-gray-900">{documentInfo?.uploaded_by_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Date d'envoi</span>
                <p className="font-medium text-gray-900">
                  {documentInfo?.uploaded_at && 
                    format(new Date(documentInfo.uploaded_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Destinataire</span>
                <p className="font-medium text-gray-900">{documentInfo?.recipient_name}</p>
              </div>
            </div>

            {/* Avertissement légal */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Information légale</h3>
              <p className="text-sm text-blue-800">
                En cliquant sur "Signer électroniquement", vous consentez à signer ce document 
                de manière électronique. Cette signature a la même valeur juridique qu'une 
                signature manuscrite, conformément à la loi n°2000-230 du 13 mars 2000.
              </p>
            </div>

            {/* Bouton de signature */}
            <Button 
              onClick={handleSign} 
              disabled={signing}
              className="w-full h-12 text-lg"
            >
              {signing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-5 w-5" />
                  Signer électroniquement
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Ce lien sécurisé est personnel et ne doit pas être partagé.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
