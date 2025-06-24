// TODO: Traduction arabe complète du composant fiche projet intervenant.
// Copie la structure de IntervenantProjectDetails.tsx et traduit tous les textes en arabe.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  Calendar, 
  Info, 
  Layers, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Users,
  Eye,
  Download,
  FileText,
  Circle,
  CheckCircle2
} from "lucide-react";
import { useSupabase } from "../hooks/useSupabase";
import { useAuth } from "../contexts/AuthContext";
import { projectStructure, realizationStructure } from "../data/project-structure";
import { projectStructureTranslations } from "../data/project-structure-translations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// أنواع البيانات
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
  status?: string;
}

interface TaskAssignment {
  id?: string;
  project_id: string;
  phase_id: string; // "تصميم" أو "تنفيذ"
  section_id: string; // "A", "B", "C", إلخ
  subsection_id: string; // "A1", "A2", "B1", إلخ
  task_name: string;
  assigned_to: string; // معرف المتخصص
  deadline: string;
  validation_deadline: string;
  validators: string[];
  file_extension: string;
  comment?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  created_at?: string;
  updated_at?: string;
  file_url?: string;
  validation_comment?: string;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
}

interface Intervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty?: string;
}

interface TaskInfoSheet {
  id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  info_sheet: string;
  language: string; // 'fr', 'en', 'es', 'ar'
  created_at: string;
  updated_at: string;
}

const IntervenantProjectDetailsAr: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, getUsers } = useSupabase();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  const [isMember, setIsMember] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(true);

  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskAssignment | null>(null);

  const [isInfoSheetDialogOpen, setIsInfoSheetDialogOpen] = useState(false);
  const [selectedInfoSheet, setSelectedInfoSheet] = useState<TaskInfoSheet | null>(null);
  const [loadingInfoSheet, setLoadingInfoSheet] = useState(false);

  // Get translations
  const translations = projectStructureTranslations.ar;

  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!id || !user) return;
      setLoadingMembership(true);
      try {
        const memberData = await fetchData<any>('membre', {
          columns: '*',
          filters: [
            { column: 'project_id', operator: 'eq', value: id },
            { column: 'user_id', operator: 'eq', value: user.id }
          ]
        });
        if (memberData && memberData.length > 0) {
          setIsMember(true);
        } else {
          const taskData = await fetchData<any>('task_assignments', {
            columns: '*',
            filters: [
              { column: 'project_id', operator: 'eq', value: id },
              { column: 'assigned_to', operator: 'eq', value: user.id }
            ]
          });
          if (taskData && taskData.length > 0) {
            setIsMember(true);
          } else {
            setIsMember(true);
          }
        }
      } catch (error) {
        setIsMember(true);
      } finally {
        setLoadingMembership(false);
      }
    };
    checkProjectAccess();
  }, [id, user, fetchData, toast, navigate]);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id || !isMember) return;
      setLoading(true);
      try {
        const data = await fetchData<Project>('projects', {
          columns: '*',
          filters: [{ column: 'id', operator: 'eq', value: id }]
        });
        if (data && data.length > 0) {
          setProject(data[0]);
        } else {
          toast({
            title: "خطأ",
            description: "المشروع غير موجود",
            variant: "destructive",
          });
          navigate('/dashboard/intervenant/projets');
        }
      } catch (error) {
        toast({
          title: "خطأ",
          description: "تعذر تحميل تفاصيل المشروع",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [id, isMember, fetchData, toast, navigate]);

  useEffect(() => {
    const fetchTaskAssignments = async () => {
      if (!id || !isMember) return;
      setLoadingTasks(true);
      try {
        const data = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: id }]
        });
        if (data) {
          setTaskAssignments(data);
        }
      } catch (error) {
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTaskAssignments();
  }, [id, isMember, fetchData]);

  useEffect(() => {
    const fetchIntervenants = async () => {
      try {
        const userData = await getUsers();
        if (userData && userData.users) {
          const specialists = userData.users
            .filter((user: any) => user.user_metadata?.role !== 'admin')
            .map((user: any) => ({
              id: user.id,
              email: user.email,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              role: user.user_metadata?.role || 'متخصص',
              specialty: user.user_metadata?.specialty || ''
            }));
          setIntervenants(specialists);
        }
      } catch (error) {}
    };
    fetchIntervenants();
  }, [getUsers]);

  const getIntervenantName = (userId: string) => {
    const specialist = intervenants.find(s => s.id === userId);
    return specialist ? `${specialist.first_name} ${specialist.last_name}` : 'غير معروف';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Circle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'submitted': return <CheckCircle2 className="h-4 w-4" />;
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'مُسندة';
      case 'in_progress': return 'قيد التنفيذ';
      case 'submitted': return 'تم الإرسال';
      case 'validated': return 'تم التحقق';
      case 'rejected': return 'مرفوضة';
      default: return status;
    }
  };

  const handleBackToProjects = () => {
    navigate('/dashboard/intervenant/projets');
  };

  const handleViewTaskDetails = (assignment: TaskAssignment) => {
    setSelectedTaskDetails(assignment);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleViewInfoSheet = async (phase: string, section: string, subsection: string, taskName: string) => {
    setLoadingInfoSheet(true);
    try {
      const data = await fetchData<TaskInfoSheet>('task_info_sheets', {
        columns: '*',
        filters: [
          { column: 'phase_id', operator: 'eq', value: phase },
          { column: 'section_id', operator: 'eq', value: section },
          { column: 'subsection_id', operator: 'eq', value: subsection },
          { column: 'task_name', operator: 'eq', value: taskName },
          { column: 'language', operator: 'eq', value: 'ar' }
        ]
      });
      if (data && data.length > 0) {
        setSelectedInfoSheet(data[0]);
        setIsInfoSheetDialogOpen(true);
      } else {
        toast({
          title: "معلومات",
          description: "لا توجد ورقة معلومات لهذه المهمة",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر تحميل ورقة المعلومات",
        variant: "destructive",
      });
    } finally {
      setLoadingInfoSheet(false);
    }
  };

  if (loadingMembership) {
    return (
      <div className="flex justify-center items-center py-12" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="text-center py-12" dir="rtl">
        <h3 className="text-lg font-medium mb-4">تم رفض الوصول</h3>
        <p className="text-gray-500 mb-4">ليس لديك صلاحية الوصول لهذا المشروع.</p>
        <Button onClick={handleBackToProjects}>العودة إلى المشاريع</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12" dir="rtl">
        <h3 className="text-lg font-medium mb-4">المشروع غير موجود</h3>
        <Button onClick={handleBackToProjects}>العودة إلى المشاريع</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToProjects}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة إلى المشاريع
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">تفاصيل المشروع</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">معلومات المشروع</TabsTrigger>
          <TabsTrigger value="structure">هيكل المشروع</TabsTrigger>
          <TabsTrigger value="tasks">مهامي</TabsTrigger>
        </TabsList>

        {/* معلومات المشروع */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                معلومات عامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">الوصف</Label>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">تاريخ البدء</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(project.start_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">الحالة</Label>
                  <p className="text-sm text-gray-600 mt-1">{project.status || 'نشط'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* هيكل المشروع */}
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                هيكل المشروع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {/* مرحلة التصميم */}
                <AccordionItem value="conception">
                  <AccordionTrigger>{translations.conception}</AccordionTrigger>
                  <AccordionContent>
                    {projectStructure.map((section) => {
                      const sectionTranslation = translations.sections[section.id as keyof typeof translations.sections];
                      return (
                        <div key={section.id} className="mb-4">
                          <h4 className="font-medium mb-2">القسم {section.id}: {sectionTranslation?.title || section.title}</h4>
                          {section.items.map((subsection) => {
                            const subsectionTranslation = sectionTranslation?.items?.[subsection.id as keyof typeof sectionTranslation.items];
                            return (
                              <div key={subsection.id} className="ml-4 mb-2">
                                <h5 className="text-sm font-medium mb-1">القسم الفرعي {subsection.id}: {subsectionTranslation?.title || subsection.title}</h5>
                                <ul className="ml-4 space-y-1">
                                  {subsection.tasks.map((task, index) => {
                                    const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                    return (
                                      <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                        <span>{translatedTask}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleViewInfoSheet('conception', section.id, subsection.id, task)}
                                        >
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>

                {/* مرحلة التنفيذ */}
                <AccordionItem value="realization">
                  <AccordionTrigger>{translations.realization}</AccordionTrigger>
                  <AccordionContent>
                    {realizationStructure.map((section) => {
                      const sectionTranslation = translations.sections[section.id as keyof typeof translations.sections];
                      return (
                        <div key={section.id} className="mb-4">
                          <h4 className="font-medium mb-2">القسم {section.id}: {sectionTranslation?.title || section.title}</h4>
                          {section.items.map((subsection) => {
                            const subsectionTranslation = sectionTranslation?.items?.[subsection.id as keyof typeof sectionTranslation.items];
                            return (
                              <div key={subsection.id} className="ml-4 mb-2">
                                <h5 className="text-sm font-medium mb-1">القسم الفرعي {subsection.id}: {subsectionTranslation?.title || subsection.title}</h5>
                                <ul className="ml-4 space-y-1">
                                  {subsection.tasks.map((task, index) => {
                                    const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                    return (
                                      <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                        <span>{translatedTask}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleViewInfoSheet('realization', section.id, subsection.id, task)}
                                        >
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* مهامي */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                مهامي المعينة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aphs-teal"></div>
                </div>
              ) : taskAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">لا توجد مهام معينة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{assignment.task_name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>المرحلة: {assignment.phase_id}</span>
                            <span>القسم: {assignment.section_id}</span>
                            <span>القسم الفرعي: {assignment.subsection_id}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>الموعد: {new Date(assignment.deadline).toLocaleDateString('ar-SA')}</span>
                            <span>موعد التحقق: {new Date(assignment.validation_deadline).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(assignment.status)}>
                            {getStatusIcon(assignment.status)}
                            <span className="ml-1">{getStatusLabel(assignment.status)}</span>
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTaskDetails(assignment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* تفاصيل المهمة */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل المهمة</DialogTitle>
          </DialogHeader>
          {selectedTaskDetails && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">اسم المهمة</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.task_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">المرحلة</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.phase_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">القسم</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.section_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">القسم الفرعي</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.subsection_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">الحالة</Label>
                  <p className="text-sm text-gray-600 mt-1">{getStatusLabel(selectedTaskDetails.status)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">الموعد</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedTaskDetails.deadline).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">موعد التحقق</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
              {selectedTaskDetails.comment && (
                <div>
                  <Label className="text-sm font-medium">تعليق</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.comment}</p>
                </div>
              )}
              {selectedTaskDetails.file_url && (
                <div>
                  <Label className="text-sm font-medium">الملف</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4" />
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      تحميل
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsTaskDetailsDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ورقة المعلومات */}
      <Dialog open={isInfoSheetDialogOpen} onOpenChange={setIsInfoSheetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>ورقة معلومات</DialogTitle>
          </DialogHeader>
          {loadingInfoSheet ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aphs-teal"></div>
            </div>
          ) : selectedInfoSheet ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">المهمة</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedInfoSheet.task_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">ورقة المعلومات</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{selectedInfoSheet.info_sheet}</pre>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  آخر تحديث: {new Date(selectedInfoSheet.updated_at).toLocaleDateString('ar-SA')}
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  تحميل
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد ورقة معلومات متاحة</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsInfoSheetDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntervenantProjectDetailsAr; 