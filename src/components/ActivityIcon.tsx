import React from 'react';
import { 
  Briefcase, 
  CheckCircle, 
  Users, 
  ClipboardCheck, 
  AlertTriangle,
  FileUp,
  Clock,
  UserPlus,
  MessageSquare
} from 'lucide-react';

interface ActivityIconProps {
  type: string;
  className?: string;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ type, className = "h-4 w-4" }) => {
  switch (type) {
    case 'task_assigned':
      return <ClipboardCheck className={`${className} text-blue-500`} />;
    case 'task_validated':
      return <CheckCircle className={`${className} text-green-500`} />;
    case 'project_added':
      return <Briefcase className={`${className} text-purple-500`} />;
    case 'file_uploaded':
      return <FileUp className={`${className} text-orange-500`} />;
    case 'meeting_request':
      return <Users className={`${className} text-blue-600`} />;
    case 'meeting_invitation':
      return <Clock className={`${className} text-indigo-500`} />;
    case 'meeting_started':
      return <Users className={`${className} text-green-600`} />;
    case 'new_message':
      return <MessageSquare className={`${className} text-teal-500`} />;
    case 'task_validation_request':
      return <AlertTriangle className={`${className} text-yellow-500`} />;
    default:
      return <CheckCircle className={`${className} text-gray-500`} />;
  }
}; 