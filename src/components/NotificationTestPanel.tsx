import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Send, TestTube, Languages, Users, File, Video, MessageSquare } from 'lucide-react';

const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const {
    notifyTaskAssigned,
    notifyFileUploaded,
    notifyTaskValidated,
    notifyMeetingRequest,
    notifyProjectAdded,
    notifyNewMessage,
    notifyTaskValidationRequest,
    notifyFileValidationRequest,
    notifyMeetingInvitation,
    notifyMeetingRequestResponse
  } = useNotificationTriggers();

  // Paramètres de test
  const [testParams, setTestParams] = useState({
    taskName: 'Rénovation cuisine',
    projectName: 'Maison familiale',
    assignerName: 'Jean Dupont',
    fileName: 'plan-cuisine.pdf',
    uploaderName: 'Marie Martin',
    validatorName: 'Pierre Durand',
    meetingTitle: 'Réunion de suivi',
    senderName: 'Sophie Leblanc',
    organizerName: 'Thomas Petit',
    intervenantName: 'Alice Moreau',
    adminName: 'Admin Principal',
    subject: 'Validation du projet',
    responseMessage: 'Approuvé avec commentaires'
  });

  const testNotifications = [
    {
      type: 'task_assigned',
      title: 'Tâche assignée',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-blue-500',
      action: () => notifyTaskAssigned(
        user?.id || 'test-user',
        testParams.taskName,
        testParams.projectName,
        testParams.assignerName
      )
    },
    {
      type: 'file_uploaded',
      title: 'Fichier uploadé',
      icon: <File className="h-4 w-4" />,
      color: 'bg-green-500',
      action: () => notifyFileUploaded(
        testParams.fileName,
        testParams.uploaderName,
        testParams.projectName
      )
    },
    {
      type: 'task_validated',
      title: 'Tâche validée',
      icon: <TestTube className="h-4 w-4" />,
      color: 'bg-purple-500',
      action: () => notifyTaskValidated(
        testParams.taskName,
        testParams.validatorName,
        testParams.projectName
      )
    },
    {
      type: 'meeting_request',
      title: 'Demande de réunion',
      icon: <Video className="h-4 w-4" />,
      color: 'bg-orange-500',
      action: () => notifyMeetingRequest(
        testParams.meetingTitle,
        testParams.organizerName,
        new Date().toISOString()
      )
    },
    {
      type: 'project_added',
      title: 'Ajouté au projet',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-teal-500',
      action: () => notifyProjectAdded(
        user?.id || 'test-user',
        testParams.projectName,
        testParams.adminName
      )
    },
    {
      type: 'message_received',
      title: 'Message reçu',
      icon: <MessageSquare className="h-4 w-4" />,
      color: 'bg-pink-500',
      action: () => notifyNewMessage(
        user?.id || 'test-user',
        testParams.senderName,
        testParams.subject
      )
    },
    {
      type: 'task_validation_request',
      title: 'Demande de validation',
      icon: <TestTube className="h-4 w-4" />,
      color: 'bg-yellow-500',
      action: () => notifyTaskValidationRequest(
        user?.id || 'test-user',
        testParams.taskName,
        testParams.intervenantName,
        testParams.projectName
      )
    },
    {
      type: 'file_validation_request',
      title: 'Fichier à valider',
      icon: <File className="h-4 w-4" />,
      color: 'bg-red-500',
      action: () => notifyFileValidationRequest(
        user?.id || 'test-user',
        testParams.fileName,
        testParams.uploaderName,
        testParams.projectName
      )
    },
    {
      type: 'meeting_invitation',
      title: 'Invitation réunion',
      icon: <Video className="h-4 w-4" />,
      color: 'bg-indigo-500',
      action: () => notifyMeetingInvitation(
        user?.id || 'test-user',
        testParams.meetingTitle,
        testParams.organizerName,
        new Date().toISOString()
      )
    },
    {
      type: 'meeting_approved',
      title: 'Réunion approuvée',
      icon: <Video className="h-4 w-4" />,
      color: 'bg-green-600',
      action: () => notifyMeetingRequestResponse(
        user?.id || 'test-user',
        testParams.meetingTitle,
        true,
        testParams.adminName,
        testParams.responseMessage
      )
    },
    {
      type: 'meeting_rejected',
      title: 'Réunion refusée',
      icon: <Video className="h-4 w-4" />,
      color: 'bg-red-600',
      action: () => notifyMeetingRequestResponse(
        user?.id || 'test-user',
        testParams.meetingTitle,
        false,
        testParams.adminName,
        testParams.responseMessage
      )
    }
  ];

  const handleTestNotification = async (notification: any) => {
    setLoading(true);
    try {
      await notification.action();
      toast({
        title: '✅ Notification créée',
        description: `Notification "${notification.title}" envoyée avec succès`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Erreur lors du test de notification:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de créer la notification',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Test des Notifications Traduites
          </h2>
          <p className="text-gray-600">
            Testez les notifications dans différentes langues
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Languages className="h-4 w-4 mr-1" />
          Multilingue
        </Badge>
      </div>

      {/* Sélecteur de langue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Langue Actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={language === lang.code ? "default" : "outline"}
                onClick={() => setLanguage(lang.code as any)}
                className="flex items-center gap-2"
              >
                <span>{lang.flag}</span>
                {lang.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Les notifications s'afficheront dans la langue sélectionnée
          </p>
        </CardContent>
      </Card>

      {/* Paramètres de test */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="taskName">Nom de la tâche</Label>
              <Input
                id="taskName"
                value={testParams.taskName}
                onChange={(e) => setTestParams({...testParams, taskName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="projectName">Nom du projet</Label>
              <Input
                id="projectName"
                value={testParams.projectName}
                onChange={(e) => setTestParams({...testParams, projectName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="assignerName">Nom de l'assigneur</Label>
              <Input
                id="assignerName"
                value={testParams.assignerName}
                onChange={(e) => setTestParams({...testParams, assignerName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="fileName">Nom du fichier</Label>
              <Input
                id="fileName"
                value={testParams.fileName}
                onChange={(e) => setTestParams({...testParams, fileName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="uploaderName">Nom de l'uploader</Label>
              <Input
                id="uploaderName"
                value={testParams.uploaderName}
                onChange={(e) => setTestParams({...testParams, uploaderName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="meetingTitle">Titre de la réunion</Label>
              <Input
                id="meetingTitle"
                value={testParams.meetingTitle}
                onChange={(e) => setTestParams({...testParams, meetingTitle: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Tests des Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testNotifications.map((notification) => (
              <div key={notification.type} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${notification.color} text-white`}>
                    {notification.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-500">{notification.type}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleTestNotification(notification)}
                  disabled={loading}
                  className="w-full"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Envoi...' : 'Tester'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. 🌍 <strong>Choisissez une langue</strong> pour voir les notifications traduites</p>
            <p>2. ⚙️ <strong>Modifiez les paramètres</strong> pour personnaliser les notifications</p>
            <p>3. 🧪 <strong>Cliquez sur "Tester"</strong> pour créer une notification</p>
            <p>4. 🔔 <strong>Vérifiez la cloche</strong> de notifications en haut à droite</p>
            <p>5. 🔄 <strong>Changez de langue</strong> et observez le changement automatique</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationTestPanel; 