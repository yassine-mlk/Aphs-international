import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye } from 'lucide-react';
import { PHASE_LABELS } from '@/types/taskAssignment';

interface TaskHeaderProps {
  task: any;
  workflow: any;
  statusLabel: string;
  statusColor: string;
  onBack: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  workflow,
  statusLabel,
  statusColor,
  onBack
}) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{task.task_name}</h1>
            {task.assignment_type === 'workflow' && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Indice {workflow?.current_version_label || 'A'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">
              {PHASE_LABELS[task.phase_id as any] || task.phase_id} • {task.section_name || `Section ${task.section_id}`} • {task.subsection_name || `Sous-section ${task.subsection_id}`}
            </p>
            {task.transparency_mode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-5 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Mode Transparence
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Badge className={`${statusColor} text-sm px-3 py-1`}>
        {statusLabel}
      </Badge>
    </div>
  );
};
