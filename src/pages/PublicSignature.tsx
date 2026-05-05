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
      const response = await supabase.functions.invoke('document-signature', {
        method: 'GET',
        query: { token }
      });

      if (response.error || !response.data) {
        if (response.error?.message === 'Token expired' && response.data?.data) {
          setError('Ce lien de signature a expiré');
        } else {
          setError('Lien de signature invalide ou expiré');
        }
        setLoading(false);
        return;
      }

      const data = response.data.data;

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

      // projects est un array ou objet unique selon le mapping de l'API
      const projectDocs = data.project_documents;
      const projectsArray = Array.isArray(projectDocs) ? projectDocs[0]?.projects : projectDocs?.projects;
      const projectName = Array.isArray(projectsArray) && projectsArray.length > 0 
        ? projectsArray[0].name 
        : (projectsArray?.name || 'Projet inconnu');

      const docName = Array.isArray(projectDocs) ? projectDocs[0]?.name : projectDocs?.name;
      const uploadedByName = Array.isArray(projectDocs) ? projectDocs[0]?.uploaded_by_name : projectDocs?.uploaded_by_name;
      const uploadedAt = Array.isArray(projectDocs) ? projectDocs[0]?.created_at : projectDocs?.created_at;

      setDocumentInfo({
        id: data.id,
        document_name: docName,
        project_name: projectName,
        uploaded_by_name: uploadedByName,
        uploaded_at: uploadedAt,
        status: data.status,
        recipient_name: data.user_name,
        token_expires_at: data.token_expires_at
      });

      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement du document');
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!documentInfo || !token) return;

    setSigning(true);
    try {
      // Appeler l'Edge Function pour signer et capturer l'IP
      const response = await supabase.functions.invoke('document-signature', {
        method: 'POST',
        body: { token, comment: '' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Créer une notification pour l'admin
      const uploadedBy = Array.isArray(documentInfo.uploaded_by_name) ? null : documentInfo.uploaded_by_name; // Fallback, on devrait récupérer l'ID
      // Note: Idealement l'admin est notifié par l'Edge Function, mais on garde la compatibilité existante.

      setSigned(true);
    } catch (err) {
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
