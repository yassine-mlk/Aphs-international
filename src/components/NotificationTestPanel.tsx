import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Send, TestTube, Users, File, MessageSquare, Target } from 'lucide-react';

const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const {
    notifyTaskAssigned,
    notifyFileUploaded,
    notifyTaskValidated,
    notifyProjectAdded,
    notifyNewMessage,
    notifyTaskValidationRequest,
    notifyFileValidationRequest
  } = useNotificationTriggers();

  // Paramètres de test
  const [testParams, setTestParams] = useState({
    taskName: 'Conception structurelle',
    projectName: 'Résidence Horizon',
    assignerName: 'Jean Dupont',
    fileName: 'plan-structure.pdf',
    uploaderName: 'Marie Curie',
    validatorName: 'Pierre Durand',
    senderName: 'Sophie Martin',
    intervenantName: 'Alice Moreau',
    adminName: 'Admin APS',
    subject: 'Révision des plans'
  });

  const testNotifications = [
    {
      type: 'task_assigned',
      title: 'Tâche assignée',
      icon: <Target className="h-4 w-4" />,
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Test des Notifications
          </h2>
          <p className="text-gray-600">
            Testez l'envoi des notifications système
          </p>
        </div>
      </div>

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
              <Label htmlFor="senderName">Nom de l'expéditeur</Label>
              <Input
                id="senderName"
                value={testParams.senderName}
                onChange={(e) => setTestParams({...testParams, senderName: e.target.value})}
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
    </div>
  );
};

export default NotificationTestPanel;