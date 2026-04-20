import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  Clock, CheckCircle, XCircle, ArrowRight, RotateCcw,
  AlertTriangle, PauseCircle, UserCheck 
} from "lucide-react";
import { VisaInstance, VisaStep } from "@/types/visa";

interface VisaStatusBadgeProps {
  instance?: VisaInstance | null;
  steps?: VisaStep[];
  compact?: boolean;
}

export const VisaStatusBadge: React.FC<VisaStatusBadgeProps> = ({
  instance,
  steps = [],
  compact = false,
}) => {
  if (!instance) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <Clock className="h-3 w-3 mr-1" />
        Non démarré
      </Badge>
    );
  }

  const currentStep = steps.find(s => s.step_order === instance.current_step_index && !s.completed_at);
  const completedSteps = steps.filter(s => s.completed_at).length;

  // Configuration selon le statut
  const configs: Record<string, { color: string; icon: any; label: string }> = {
    en_cours: { 
      color: 'bg-blue-100 text-blue-800 border-blue-300', 
      icon: ArrowRight,
      label: compact ? `Étape ${instance.current_step_index + 1}/${instance.total_steps}` : 'En cours'
    },
    valide: { 
      color: 'bg-green-100 text-green-800 border-green-300', 
      icon: CheckCircle,
      label: 'Validé'
    },
    refuse: { 
      color: 'bg-red-100 text-red-800 border-red-300', 
      icon: RotateCcw,
      label: 'À refaire'
    },
    suspendu: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
      icon: PauseCircle,
      label: 'Suspendu'
    },
  };

  const config = configs[instance.status] || configs.en_cours;
  const Icon = config.icon;

  // Si c'est un step spécifique avec visa
  if (currentStep?.visa_status && !compact) {
    const visaColors: Record<string, string> = {
      VSO: 'bg-green-100 text-green-800 border-green-500',
      VAO: 'bg-yellow-100 text-yellow-800 border-yellow-500',
      VAR: 'bg-red-100 text-red-800 border-red-500',
    };

    return (
      <div className="flex items-center gap-2">
        <Badge className={`${config.color}`}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        <Badge className={`${visaColors[currentStep.visa_status]} text-xs`}>
          {currentStep.visa_status}
        </Badge>
        {currentStep.opinion && (
          <Badge variant="outline" className="text-xs">
            {currentStep.opinion}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Badge className={`${config.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Badge pour la file d'attente validateur
export const ValidatorQueueBadge: React.FC<{ 
  deadlineAt?: string | null;
  isLate?: boolean;
}> = ({ deadlineAt, isLate }) => {
  if (!deadlineAt) {
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Sans deadline
      </Badge>
    );
  }

  const deadline = new Date(deadlineAt);
  const now = new Date();
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (isLate || daysLeft < 0) {
    return (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        En retard ({Math.abs(daysLeft)}j)
      </Badge>
    );
  }

  if (daysLeft <= 2) {
    return (
      <Badge className="bg-orange-100 text-orange-800">
        <Clock className="h-3 w-3 mr-1" />
        {daysLeft}j restant{daysLeft > 1 ? 's' : ''}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-green-700 border-green-300">
      <Clock className="h-3 w-3 mr-1" />
      {daysLeft}j restants
    </Badge>
  );
};
