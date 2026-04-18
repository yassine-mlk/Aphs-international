import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PriorityTasksProps {
  tasks: any[];
}

export const PriorityTasks: React.FC<PriorityTasksProps> = ({ tasks }) => {
  const navigate = useNavigate();

  // Définir les priorités
  const getPriorityInfo = (task: any) => {
    const deadline = parseISO(task.deadline);
    const now = new Date();
    const diff = differenceInDays(deadline, now);

    if (task.status === 'validated') return { score: 0, label: 'Terminé', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> };
    if (diff < 0) return { score: 100, label: 'Critique (Retard)', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-4 w-4" /> };
    if (diff === 0) return { score: 90, label: 'Urgent (Aujourd\'hui)', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> };
    if (diff === 1) return { score: 80, label: 'Important (Demain)', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> };
    if (diff <= 3) return { score: 70, label: 'Prioritaire (3 jours)', color: 'bg-blue-100 text-blue-700', icon: <TrendingUp className="h-4 w-4" /> };
    
    return { score: 50, label: 'Standard', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> };
  };

  // Trier les tâches par score de priorité décroissant
  const sortedTasks = tasks
    .filter(task => task.status !== 'validated') // On ne montre que les tâches à faire
    .map(task => ({ ...task, priorityInfo: getPriorityInfo(task) }))
    .sort((a, b) => b.priorityInfo.score - a.priorityInfo.score)
    .slice(0, 10);

  return (
    <Card className="border-0 shadow-2xl bg-white rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-gray-50 pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl font-black text-black">
          <div className="p-2 bg-red-600 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          Tâches Prioritaires
        </CardTitle>
        <CardDescription className="text-gray-500 font-medium text-base">
          Les tâches nécessitant votre attention immédiate
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[400px] pr-4">
          {sortedTasks.length > 0 ? (
            <div className="space-y-4">
              {sortedTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                  className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-red-600 hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4"
                >
                  <div className={`p-3 rounded-xl ${task.priorityInfo.color} flex-shrink-0`}>
                    {task.priorityInfo.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-black group-hover:text-red-600 transition-colors truncate text-lg">
                        {task.task_name}
                      </h5>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        {task.priorityInfo.label}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {format(parseISO(task.deadline), 'd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-red-600 group-hover:text-white transition-all">
                    <TrendingUp className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <CheckCircle2 className="h-20 w-20 mb-4 opacity-10" />
              <p className="text-xl font-bold">Toutes vos priorités sont à jour !</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
