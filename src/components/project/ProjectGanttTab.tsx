import React, { useEffect, useState, useMemo, useRef } from 'react';

// Composant de contournement pour éviter les avertissements sur data-lov-id avec React.Fragment
const SafeFragment = ({ children }: { children: React.ReactNode }) => <>{children}</>;

import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronRight, 
  ChevronDown,
  Clock,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, isSameDay, addDays, endOfWeek, eachWeekOfInterval, parseISO, isBefore, startOfDay } from 'date-fns';

const safeParseDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return null;
  // On ignore la partie heure/timezone pour éviter les décalages
  const pureDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return parseISO(pureDate);
};

const getStatusColor = (status: string, deadline?: string) => {
  const isTerminee = ['approved', 'vso', 'vao', 'closed'].includes(status);
  if (isTerminee) return '#388E3C'; // Vert
  
  if (status === 'in_review') return '#F57C00'; // Orange
  
  const today = startOfDay(new Date());
  if (deadline) {
    const d = startOfDay(parseISO(deadline.split('T')[0]));
    if (isBefore(d, today)) return '#D32F2F'; // Rouge (En retard)
  }
  
  if (status === 'in_progress' || status === 'started') return '#1976D2'; // Bleu (En cours)
  
  return '#B0BEC5'; // Gris (Non commencée)
};
import { fr } from 'date-fns/locale';

interface ProjectSection {
  id: string;
  title: string;
  phase: string;
  order_index: number;
  items: ProjectItem[];
  deadline?: string;
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'started' | 'completed';
  actual_start_date?: string;
  planned_end_date?: string;
}

interface ProjectItem {
  id: string;
  section_id: string;
  title: string;
  order_index: number;
  tasks: ProjectTask[];
  deadline?: string;
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'started' | 'completed';
  actual_start_date?: string;
  planned_end_date?: string;
}

interface ProjectTask {
  id: string;
  item_id: string;
  title: string;
  order_index: number;
}

interface Project {
  id: string;
  name: string;
  start_date?: string;
}

interface ProjectGanttTabProps {
  project: Project;
  conceptionStructure: ProjectSection[];
  realizationStructure: ProjectSection[];
}

const ProjectGanttTab: React.FC<ProjectGanttTabProps> = ({ 
  project, 
  conceptionStructure,
  realizationStructure
}) => {
  const [activePhase, setActivePhase] = useState<'conception' | 'realisation'>('conception');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const timelineRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data } = await supabase
        .from('task_assignments_view')
        .select('*')
        .eq('project_id', project.id);
      
      setAssignments(data || []);
    };
    fetchAssignments();
  }, [project.id, conceptionStructure, realizationStructure]);

  const allSections = useMemo(() => {
    return (activePhase === 'conception' ? conceptionStructure : realizationStructure)
      .filter(s => s.status === 'started' || s.status === 'completed') // On garde les étapes débutées ou terminées
      .map(s => ({
        ...s,
        items: s.items.filter(i => i.status === 'started' || i.status === 'completed') // Idem pour les sous-étapes
      }))
      .sort((a, b) => a.order_index - b.order_index);
  }, [activePhase, conceptionStructure, realizationStructure]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Timeline logic
  const startDate = useMemo(() => {
    const d = safeParseDate(project.start_date);
    if (d) return d;
    return startOfMonth(new Date());
  }, [project.start_date]);

  const endDate = useMemo(() => {
    const deadlines = [
      ...allSections.flatMap(s => [
        safeParseDate(s.deadline),
        safeParseDate(s.end_date),
        safeParseDate(s.planned_end_date),
        ...s.items.map(i => [
          safeParseDate(i.deadline),
          safeParseDate(i.end_date),
          safeParseDate(i.planned_end_date)
        ]).flat()
      ]),
      ...assignments.map(a => safeParseDate(a.end_date) || safeParseDate(a.deadline))
    ].filter(d => d !== null) as Date[];

    if (deadlines.length === 0) return addMonths(startDate, 3);
    const maxDeadline = new Date(Math.max(...deadlines.map(d => d.getTime())));
    return endOfMonth(addMonths(maxDeadline, 1));
  }, [allSections, startDate, assignments]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: startDate, end: endDate }, { locale: fr });
  }, [startDate, endDate]);

  const calculateProgress = (sectionOrItem: ProjectSection | ProjectItem) => {
    let tasks: ProjectTask[] = [];
    let isSection = 'items' in sectionOrItem;
    
    // Si l'objet est explicitement marqué comme 'completed', on retourne 100%
    if (sectionOrItem.status === 'completed') return 100;

    if (isSection) {
      const section = sectionOrItem as ProjectSection;
      if (section.items.length === 0) return 0;
      
      const completedItems = section.items.filter(item => {
        // Une sous-étape est terminée si son statut est 'completed' OU si toutes ses tâches sont 'terminee'
        return item.status === 'completed' || calculateProgress(item) === 100;
      }).length;
      return Math.round((completedItems / section.items.length) * 100);
    } else {
      const item = sectionOrItem as ProjectItem;
      tasks = item.tasks;
      
      if (tasks.length === 0) return 0;
      
      const completedTasksCount = tasks.filter(task => {
        const taskAssignment = assignments.find(a => 
          a.task_id === task.id
        );
        // Une tâche est terminée si son statut est 'approved' (standard) ou 'vso'/'vao' (workflow)
        return taskAssignment?.status === 'approved' || taskAssignment?.status === 'vso' || taskAssignment?.status === 'vao';
      }).length;

      return Math.round((completedTasksCount / tasks.length) * 100);
    }
  };

  const getTaskDates = (sectionOrItem: ProjectSection | ProjectItem | string, itemStart?: string, itemEnd?: string, itemDeadline?: string) => {
    // Si c'est un ID de tâche (string), on cherche l'assignation
    if (typeof sectionOrItem === 'string') {
      const assignment = assignments.find(a => a.id === sectionOrItem || a.task_id === sectionOrItem);
      const as = safeParseDate(assignment?.start_date);
      const ae = safeParseDate(assignment?.end_date || assignment?.deadline);
      return {
        start: as || startDate,
        end: ae || addDays(as || startDate, 7),
        actualStart: as,
        actualEnd: ae
      };
    }

    // Sinon c'est une section ou un item
    const obj = sectionOrItem;
    
    // Dates réelles (terrain)
    const as = safeParseDate(obj.actual_start_date);
    const ae = safeParseDate(obj.planned_end_date);

    // Dates théoriques
    const s = safeParseDate(obj.start_date || itemStart);
    const e = safeParseDate(obj.end_date || obj.deadline || itemDeadline || itemEnd);
    
    return { 
      // Si on a une date réelle de début, on l'utilise, sinon la théorique, sinon la date du projet
      start: as || s || startDate, 
      // Si on a une date de fin prévue (saisie au démarrage), on l'utilise en priorité
      end: ae || e || addDays(as || s || startDate, 7),
      actualStart: as,
      actualEnd: ae
    };
  };

  const syncScroll = (e: React.UIEvent<HTMLDivElement>, target: React.RefObject<HTMLDivElement>) => {
    if (target.current) {
      target.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <Card 
      className="border-0 shadow-lg overflow-hidden h-[calc(100vh-250px)]"
      style={{ position: 'relative', width: '100%' }}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header toolbar */}
        <div className="bg-slate-800 text-white p-2 flex items-center justify-between border-b border-slate-700 z-30">
          <div className="flex items-center gap-4">
            <h3 className="font-bold flex items-center gap-2 px-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Diagramme de Gantt APS
            </h3>
            <div className="h-6 w-px bg-slate-600 mx-2" />
            
            {/* Phase Toggle Buttons */}
            <div className="flex bg-slate-900/50 p-1 rounded-md border border-slate-700">
              <button
                onClick={() => setActivePhase('conception')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  activePhase === 'conception' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conception
              </button>
              <button
                onClick={() => setActivePhase('realisation')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  activePhase === 'realisation' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Réalisation
              </button>
            </div>

            <div className="h-6 w-px bg-slate-600 mx-2" />
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Calendar className="h-4 w-4" />
              {format(startDate, 'MMM yyyy', { locale: fr })} - {format(endDate, 'MMM yyyy', { locale: fr })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Filtrer">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Table Section (Sidebar) */}
          <div 
            ref={tableRef}
            className="w-[320px] min-w-[320px] flex-shrink-0 border-r border-slate-300 overflow-y-auto overflow-x-hidden bg-white z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] scrollbar-hide"
            onScroll={(e) => syncScroll(e, timelineRef)}
          >
            <table className="w-full text-[12px] border-collapse table-fixed">
              <thead className="sticky top-0 bg-slate-100 z-30 shadow-sm">
                <tr className="border-b border-slate-300 h-12">
                  <th className="w-[30px] px-1 text-center font-bold text-slate-700 border-r border-slate-200">#</th>
                  <th className="w-[170px] px-2 text-left font-bold text-slate-700 border-r border-slate-200">Nom</th>
                  <th className="w-[40px] px-1 text-center font-bold text-slate-700 border-r border-slate-200">Dur.</th>
                  <th className="w-[40px] px-1 text-center font-bold text-slate-700 border-r border-slate-200">Déb.</th>
                  <th className="w-[40px] px-1 text-center font-bold text-slate-700">Fin</th>
                </tr>
              </thead>
              <tbody>
                {allSections.map((section, sIdx) => {
                  const isExpanded = expandedSections[section.id];
                  const { start, end } = getTaskDates(section);
                  const duration = differenceInDays(end, start) + 1;

                  return (
                    <SafeFragment key={section.id}>
                      <tr className="hover:bg-blue-50/30 border-b border-slate-100 group transition-colors bg-[#F0F4F8] h-[40px]">
                        <td className="w-[30px] p-1 text-center text-slate-400 font-mono border-r border-slate-100">{sIdx + 1}</td>
                        <td className="w-[170px] p-1 font-bold flex items-center gap-1 border-r border-slate-100 overflow-hidden h-[40px]">
                          <button onClick={() => toggleSection(section.id)} className="p-0.5 hover:bg-slate-200 rounded shrink-0">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                          <span className="truncate text-[13px]">{section.title}</span>
                        </td>
                        <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-600">{duration}j</td>
                        <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-600 text-[10px]">{format(start, 'dd/MM')}</td>
                        <td className="w-[40px] p-1 text-center text-slate-600 text-[10px]">{format(end, 'dd/MM')}</td>
                      </tr>

                      {isExpanded && section.items.map((item, iIdx) => {
                        const isItemExpanded = expandedItems[item.id];
                        const { start: iStart, end: iEnd } = getTaskDates(item);
                        const iDuration = differenceInDays(iEnd, iStart) + 1;

                        return (
                          <SafeFragment key={item.id}>
                            <tr className="hover:bg-blue-50/30 border-b border-slate-100 group transition-colors bg-white h-[38px]">
                              <td className="w-[30px] p-1 text-center text-slate-400 font-mono border-r border-slate-100">{sIdx + 1}.{iIdx + 1}</td>
                              <td className="w-[170px] p-1 pl-4 flex items-center gap-1 border-r border-slate-100 overflow-hidden h-[38px]">
                                <button onClick={() => toggleItem(item.id)} className="p-0.5 hover:bg-slate-200 rounded shrink-0">
                                  {isItemExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                                <span className="truncate font-semibold text-slate-700 text-[12px]">{item.title}</span>
                              </td>
                              <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-500">{iDuration}j</td>
                              <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-500 text-[10px]">{format(iStart, 'dd/MM')}</td>
                              <td className="w-[40px] p-1 text-center text-slate-500 text-[10px]">{format(iEnd, 'dd/MM')}</td>
                            </tr>

                            {isItemExpanded && item.tasks.map((task, tIdx) => {
                              const { start: tStart, end: tEnd } = getTaskDates(task.id);
                              const tDuration = differenceInDays(tEnd, tStart) + 1;

                              return (
                                <tr key={task.id} className="hover:bg-blue-50/50 border-b border-slate-100 group transition-colors bg-[#FAFAFA] h-[36px]">
                                  <td className="w-[30px] p-1 text-center text-slate-300 font-mono border-r border-slate-100 italic">{sIdx + 1}.{iIdx + 1}.{tIdx + 1}</td>
                                  <td className="w-[170px] p-1 pl-8 border-r border-slate-100 truncate text-slate-500 text-[12px] h-[36px]">
                                    {task.title}
                                  </td>
                                  <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-400">{tDuration}j</td>
                                  <td className="w-[40px] p-1 text-center border-r border-slate-100 text-slate-400 text-[10px]">{format(tStart, 'dd/MM')}</td>
                                  <td className="w-[40px] p-1 text-center text-slate-400 text-[10px]">{format(tEnd, 'dd/MM')}</td>
                                </tr>
                              );
                            })}
                          </SafeFragment>
                        );
                      })}
                    </SafeFragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Timeline Section */}
          <div 
            ref={timelineRef}
            className="flex-1 overflow-auto relative bg-slate-50"
            onScroll={(e) => syncScroll(e, tableRef)}
          >
            <div 
              className="relative" 
              style={{ width: `${days.length * 30}px` }}
            >
              {/* Timeline Grid Background */}
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map((day, i) => (
                  <div 
                    key={i} 
                    className={`h-full border-r ${isSameDay(day, new Date()) ? 'bg-yellow-50/50 border-yellow-200' : 'border-slate-200'}`}
                    style={{ width: '30px' }}
                  />
                ))}
              </div>

              {/* Today Line */}
              {(() => {
                const today = new Date();
                if (isBefore(today, startDate) || isBefore(endDate, today)) return null;
                const offset = differenceInDays(today, startDate);
                return (
                  <div 
                    className="absolute top-0 bottom-0 z-20 border-l-2 border-red-500 border-dashed pointer-events-none"
                    style={{ left: `${offset * 30 + 15}px` }}
                    title="Aujourd'hui"
                  />
                );
              })()}

              {/* Timeline Headers */}
              <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 h-12">
                <div className="flex border-b border-slate-200 h-6">
                  {weeks.map((week, i) => {
                    const weekEnd = endOfWeek(week, { locale: fr });
                    const weekDays = eachDayOfInterval({ 
                      start: week < startDate ? startDate : week, 
                      end: weekEnd > endDate ? endDate : weekEnd 
                    });
                    return (
                      <div 
                        key={i} 
                        className="flex items-center justify-center font-bold text-slate-600 border-r border-slate-200 truncate bg-slate-200/50 text-[10px]"
                        style={{ width: `${weekDays.length * 30}px` }}
                      >
                        {format(week, 'dd MMM yyyy', { locale: fr })}
                      </div>
                    );
                  })}
                </div>
                <div className="flex h-6">
                  {days.map((day, i) => (
                    <div 
                      key={i} 
                      className={`h-6 flex items-center justify-center text-[9px] font-medium border-r border-slate-200 shrink-0 ${[0, 6].includes(day.getDay()) ? 'bg-slate-200/30 text-slate-400' : 'text-slate-500'}`}
                      style={{ width: '30px' }}
                    >
                      {format(day, 'eeeee', { locale: fr })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Rows */}
              <div className="flex flex-col">
                {allSections.map((section) => {
                  const isExpanded = expandedSections[section.id];
                  const { start, end, actualStart, actualEnd } = getTaskDates(section);
                  const progress = calculateProgress(section);
                  const startOffset = differenceInDays(start, startDate);
                  const duration = differenceInDays(end, start) + 1;
                  
                  const barColor = getStatusColor(section.status, section.deadline);

                  return (
                    <SafeFragment key={section.id}>
                      <div className="h-[40px] relative border-b border-slate-100 group">
                        {/* Barre théorique (fond) */}
                        <div 
                          className="absolute top-2.5 h-5 bg-slate-200 rounded-sm shadow-sm flex items-center overflow-hidden border border-slate-300 opacity-60"
                          style={{ 
                            left: `${startOffset * 30}px`, 
                            width: `${Math.max(duration * 30, 20)}px` 
                          }}
                          title="Prévu"
                        />
                        
                        {/* Barre réelle / Progression (dessus) */}
                        {actualStart && (
                          <div 
                            className="absolute top-3 h-4 rounded-sm shadow-sm flex items-center overflow-hidden z-10"
                            style={{ 
                              left: `${differenceInDays(actualStart, startDate) * 30}px`, 
                              width: `${Math.max((actualEnd ? differenceInDays(actualEnd, actualStart) + 1 : 1) * 30, 20)}px`,
                              backgroundColor: barColor
                            }}
                            title="Réel"
                          >
                            <div 
                              className="h-full bg-black/10 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {isExpanded && section.items.map((item) => {
                        const isItemExpanded = expandedItems[item.id];
                        const { start: iStart, end: iEnd, actualStart: iActualStart, actualEnd: iActualEnd } = getTaskDates(item);
                        const iProgress = calculateProgress(item);
                        const iStartOffset = differenceInDays(iStart, startDate);
                        const iDuration = differenceInDays(iEnd, iStart) + 1;
                        
                        const iBarColor = getStatusColor(item.status, item.deadline);

                        return (
                          <SafeFragment key={item.id}>
                            <div className="h-[38px] relative border-b border-slate-100 group bg-slate-50/30">
                              {/* Barre théorique */}
                              <div 
                                className="absolute top-2.5 h-4 bg-slate-200 rounded-sm shadow-sm flex items-center overflow-hidden border border-slate-300 opacity-60"
                                style={{ 
                                  left: `${iStartOffset * 30}px`, 
                                  width: `${Math.max(iDuration * 30, 20)}px` 
                                }}
                                title="Prévu"
                              />
                              
                              {/* Barre réelle / Progression */}
                              {iActualStart && (
                                <div 
                                  className="absolute top-3 h-3 rounded-sm shadow-sm flex items-center overflow-hidden z-10"
                                  style={{ 
                                    left: `${differenceInDays(iActualStart, startDate) * 30}px`, 
                                    width: `${Math.max((iActualEnd ? differenceInDays(iActualEnd, iActualStart) + 1 : 1) * 30, 20)}px`,
                                    backgroundColor: iBarColor
                                  }}
                                  title="Réel"
                                >
                                  <div 
                                    className="h-full bg-black/10 transition-all duration-500"
                                    style={{ width: `${iProgress}%` }}
                                  />
                                </div>
                              )}
                            </div>

                            {isItemExpanded && item.tasks.map((task) => {
                              const { start: tStart, end: tEnd, actualStart: tActualStart, actualEnd: tActualEnd } = getTaskDates(task.id);
                              const taskAssignment = assignments.find(a => 
                                a.task_name === task.title && 
                                a.subsection_id === item.id
                              );
                              const tProgress = ['approved', 'vso', 'vao', 'closed'].includes(taskAssignment?.status) ? 100 : 0;
                              const tStartOffset = differenceInDays(tStart, startDate);
                              const tDuration = differenceInDays(tEnd, tStart) + 1;
                              
                              const tBarColor = taskAssignment ? getStatusColor(taskAssignment.status, taskAssignment.deadline) : '#B0BEC5';

                              return (
                                <div key={task.id} className="h-[36px] relative border-b border-slate-100 group bg-[#FAFAFA]">
                                  {/* Barre théorique */}
                                  <div 
                                    className="absolute top-3 h-2.5 bg-slate-200 rounded-sm shadow-sm opacity-40 border border-slate-300"
                                    style={{ 
                                      left: `${tStartOffset * 30}px`, 
                                      width: `${Math.max(tDuration * 30, 15)}px` 
                                    }}
                                  />
                                  
                                  {/* Barre réelle */}
                                  {tActualStart && (
                                    <div 
                                      className="absolute top-3.5 h-2 rounded-sm shadow-sm z-10"
                                      style={{ 
                                        left: `${differenceInDays(tActualStart, startDate) * 30}px`, 
                                        width: `${Math.max((tActualEnd ? differenceInDays(tActualEnd, tActualStart) + 1 : 1) * 30, 15)}px`,
                                        backgroundColor: tBarColor
                                      }}
                                    >
                                      <div 
                                        className="h-full bg-black/10 transition-all duration-500"
                                        style={{ width: `${tProgress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </SafeFragment>
                        );
                      })}
                    </SafeFragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectGanttTab;
