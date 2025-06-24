import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Download, 
  Clock, 
  FileVideo, 
  Calendar,
  HardDrive,
  Eye,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVideoMeetingsImproved, MeetingRecording } from '@/hooks/useVideoMeetingsImproved';

interface MeetingRecordingsProps {
  meetingId: string;
  meetingTitle: string;
  isVisible: boolean;
  onClose: () => void;
}

export function MeetingRecordings({ meetingId, meetingTitle, isVisible, onClose }: MeetingRecordingsProps) {
  const { getMeetingRecordings } = useVideoMeetingsImproved();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecording | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Charger les enregistrements
  useEffect(() => {
    if (isVisible && meetingId) {
      loadRecordings();
    }
  }, [isVisible, meetingId]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const data = await getMeetingRecordings(meetingId);
      setRecordings(data);
    } catch (error) {
      console.error('Erreur lors du chargement des enregistrements:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les enregistrements',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePlayRecording = (recording: MeetingRecording) => {
    setSelectedRecording(recording);
    setIsPlayerOpen(true);
  };

  const handleDownloadRecording = (recording: MeetingRecording) => {
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = recording.fileUrl;
    link.download = `recording-${meetingTitle}-${recording.startedAt.toISOString().split('T')[0]}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Téléchargement démarré',
      description: 'Le fichier va être téléchargé dans quelques instants'
    });
  };

  if (!isVisible) return null;

  return (
    <>
      <Dialog open={isVisible} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileVideo className="h-5 w-5" />
              Enregistrements - {meetingTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Chargement des enregistrements...</span>
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8">
                <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun enregistrement disponible
                </h3>
                <p className="text-gray-500">
                  Cette réunion n'a pas été enregistrée ou les enregistrements ne sont pas encore traités.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {recordings.map((recording, index) => (
                  <Card key={recording.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Enregistrement {index + 1}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {recording.startedAt.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span>Durée: {formatDuration(recording.durationSeconds)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-green-500" />
                              <span>Taille: {formatFileSize(recording.fileSizeBytes)}</span>
                            </div>
                          </div>

                          {recording.thumbnailUrl && (
                            <div className="mt-3">
                              <img 
                                src={recording.thumbnailUrl} 
                                alt="Aperçu de l'enregistrement"
                                className="w-32 h-18 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePlayRecording(recording)}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Lire
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadRecording(recording)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lecteur vidéo */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Lecture - {meetingTitle}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsPlayerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedRecording && (
            <div className="space-y-4">
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[70vh]"
                  poster={selectedRecording.thumbnailUrl}
                >
                  <source src={selectedRecording.fileUrl} type="video/webm" />
                  <source src={selectedRecording.fileUrl} type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedRecording.durationSeconds)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedRecording.startedAt.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadRecording(selectedRecording)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 