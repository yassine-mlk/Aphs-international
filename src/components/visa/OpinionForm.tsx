import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ThumbsUp, ThumbsDown, Pause, Ban, 
  CheckCircle, AlertCircle, RotateCcw,
  FileText, Clock, User 
} from "lucide-react";
import { OpinionType, VisaStatus, VisaStep } from "@/types/visa";

interface OpinionFormProps {
  step: VisaStep;
  fileUrl: string;
  fileName: string;
  projectName: string;
  circuitName: string;
  versionIndex: string;
  onSubmit: (opinion: OpinionType, visaStatus: VisaStatus, comments: string) => void;
  onCancel: () => void;
}

const OPINION_OPTIONS: Array<{ 
  value: OpinionType; 
  label: string; 
  description: string;
  icon: any;
  color: string;
}> = [
  { 
    value: 'F', 
    label: 'Favorable', 
    description: 'Conformité aux normes applicables',
    icon: ThumbsUp,
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  { 
    value: 'D', 
    label: 'Défavorable', 
    description: 'Non-conformité nécessitant une reprise',
    icon: ThumbsDown,
    color: 'bg-red-100 text-red-800 border-red-300'
  },
  { 
    value: 'S', 
    label: 'Suspendu', 
    description: 'Attente d\'éléments complémentaires',
    icon: Pause,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  { 
    value: 'HM', 
    label: 'Hors Mission', 
    description: 'Document en dehors du périmètre contractuel',
    icon: Ban,
    color: 'bg-gray-100 text-gray-800 border-gray-300'
  },
];

const VISA_OPTIONS: Array<{
  value: VisaStatus;
  label: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    value: 'VSO',
    label: 'VSO',
    description: 'Visa Sans Observations - Validé définitivement',
    icon: CheckCircle,
    color: 'bg-green-500 text-white hover:bg-green-600'
  },
  {
    value: 'VAO',
    label: 'VAO',
    description: 'Visa Avec Observations - Validé sous réserve',
    icon: AlertCircle,
    color: 'bg-yellow-500 text-white hover:bg-yellow-600'
  },
  {
    value: 'VAR',
    label: 'VAR',
    description: 'Visa À Resoumettre - Refusé, nouvelle version requise',
    icon: RotateCcw,
    color: 'bg-red-500 text-white hover:bg-red-600'
  },
];

export const OpinionForm: React.FC<OpinionFormProps> = ({
  step,
  fileUrl,
  fileName,
  projectName,
  circuitName,
  versionIndex,
  onSubmit,
  onCancel,
}) => {
  const [selectedOpinion, setSelectedOpinion] = useState<OpinionType | null>(null);
  const [selectedVisa, setSelectedVisa] = useState<VisaStatus | null>(null);
  const [comments, setComments] = useState('');
  const [stepNumber, setStepNumber] = useState(1); // 1=avis, 2=visa

  const handleOpinionSelect = (opinion: OpinionType) => {
    setSelectedOpinion(opinion);
    setStepNumber(2);
  };

  const handleVisaSelect = (visa: VisaStatus) => {
    setSelectedVisa(visa);
  };

  const handleSubmit = () => {
    if (selectedOpinion && selectedVisa) {
      onSubmit(selectedOpinion, selectedVisa, comments);
    }
  };

  const canSubmit = selectedOpinion && selectedVisa && 
    (selectedVisa === 'VSO' || comments.trim().length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header document */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-lg">{fileName}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>{projectName}</span>
                <span>•</span>
                <span>{circuitName}</span>
                <Badge variant="outline">Version {versionIndex}</Badge>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-1" />
                Ouvrir
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${stepNumber >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            stepNumber >= 1 ? 'bg-teal-100' : 'bg-gray-100'
          }`}>
            1
          </div>
          <span className="font-medium">Avis technique</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-200" />
        <div className={`flex items-center gap-2 ${stepNumber >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            stepNumber >= 2 ? 'bg-teal-100' : 'bg-gray-100'
          }`}>
            2
          </div>
          <span className="font-medium">Visa</span>
        </div>
      </div>

      {/* Étape 1: Avis technique */}
      {stepNumber === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Votre avis technique</CardTitle>
            <CardDescription>
              Sélectionnez l'avis correspondant à votre expertise sur ce document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {OPINION_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleOpinionSelect(option.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                      selectedOpinion === option.value 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-sm font-medium mb-2 ${option.color}`}>
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Visa */}
      {stepNumber === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Votre visa</CardTitle>
                <CardDescription>
                  Déterminez le statut final de validation pour ce document
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStepNumber(1)}>
                ← Modifier l'avis
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Récap avis */}
            {selectedOpinion && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">Avis sélectionné:</span>
                <Badge className={OPINION_OPTIONS.find(o => o.value === selectedOpinion)?.color}>
                  {OPINION_OPTIONS.find(o => o.value === selectedOpinion)?.label}
                </Badge>
              </div>
            )}

            {/* Options visa */}
            <div className="grid grid-cols-3 gap-4">
              {VISA_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedVisa === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleVisaSelect(option.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      isSelected 
                        ? 'border-teal-500 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${option.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-lg mb-1">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Commentaires */}
            <div className="space-y-2">
              <Label htmlFor="comments">
                Commentaires {selectedVisa !== 'VSO' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  selectedVisa === 'VSO' 
                    ? 'Observations optionnelles...' 
                    : 'Détaillez les observations ou corrections requises...'
                }
                rows={4}
              />
              {selectedVisa !== 'VSO' && !comments.trim() && (
                <p className="text-sm text-red-500">
                  Requis pour VAO et VAR
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!canSubmit}
                className={
                  selectedVisa === 'VAR' ? 'bg-red-500 hover:bg-red-600' :
                  selectedVisa === 'VAO' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-green-500 hover:bg-green-600'
                }
              >
                {selectedVisa === 'VAR' ? 'Refuser (VAR)' :
                 selectedVisa === 'VAO' ? 'Valider avec obs (VAO)' :
                 'Valider (VSO)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
