import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DeadlineCalendarProps {
  tasks: any[];
}

export const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ tasks }) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  // Filtrer les tâches qui ont une deadline
  const tasksWithDeadlines = tasks.filter(task => task.deadline);
  
  // Dates ayant des échéances pour l'affichage sur le calendrier
  const deadlineDates = tasksWithDeadlines.map(task => parseISO(task.deadline));

  // Tâches pour la date sélectionnée
  const selectedDateTasks = tasksWithDeadlines.filter(task => 
    date && isSameDay(parseISO(task.deadline), date)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'submitted': return 'bg-purple-100 text-purple-700';
      case 'validated': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-white rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-gray-50 pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl font-black text-black">
          <div className="p-2 bg-blue-600 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          Calendrier des Échéances
        </CardTitle>
        <CardDescription className="text-gray-500 font-medium text-base">
          Visualisez vos dates limites et organisez votre travail
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex justify-center border rounded-2xl p-4 bg-gray-50/30">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={fr}
              className="rounded-md"
              modifiers={{
                hasDeadline: deadlineDates
              }}
              modifiersStyles={{
                hasDeadline: { 
                  fontWeight: 'bold', 
                  textDecoration: 'underline',
                  color: '#2563eb' 
                }
              }}
            />
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-lg flex items-center gap-2">
              {date ? format(date, 'EEEE d MMMM', { locale: fr }) : 'Sélectionnez une date'}
              <Badge variant="secondary" className="ml-2">
                {selectedDateTasks.length} tâche(s)
              </Badge>
            </h4>
            
            <ScrollArea className="h-[300px] pr-4">
              {selectedDateTasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                      className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-black group-hover:text-blue-600 transition-colors line-clamp-1">
                          {task.task_name}
                        </h5>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {task.project_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(task.deadline), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                  <Clock className="h-12 w-12 mb-2 opacity-20" />
                  <p>Aucune échéance ce jour</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
