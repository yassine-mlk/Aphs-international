import React, { useState, useEffect, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Info, 
  Layers, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Trash2,
  ChevronDown,
  CheckCircle2,
  Circle,
  UserPlus,
  FileUp,
  Eye,
  UserMinus,
  XCircle,
  Download
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";

// Project interface
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
}

// Stakeholder interface
interface Intervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Task assignment interface
interface TaskAssignment {
  id?: string;
  project_id: string;
  phase_id: string; // "conception" or "realization"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // Stakeholder ID
  deadline: string;
  validation_deadline: string;
  validators: string[]; // Validator stakeholder IDs
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

// Project structure - Design phase
const projectStructure = [
  {
    id: "A",
    title: "الدراسة الأولية",
    items: [
      {
        id: "A1",
        title: "التحليل الأولي",
        tasks: [
          "الدراسة الأولية",
          "آراء الخدمات الخارجية",
          "دراسة التأثير",
          "البرنامج الأولي"
        ]
      },
      {
        id: "A2",
        title: "دراسة التعريف",
        tasks: [
          "دراسات التعريف"
        ]
      },
      {
        id: "A3",
        title: "البحث عن الموقع / دراسة الجدوى الأولية",
        tasks: [
          "دراسة الجدوى"
        ]
      },
      {
        id: "A4",
        title: "تحرير المنطقة الإقليمية",
        tasks: [
          "تقييم الموقع"
        ]
      },
      {
        id: "A5",
        title: "الغلاف المالي",
        tasks: [
          "الميزانية الأولية"
        ]
      },
      {
        id: "A6",
        title: "جدوى المشروع",
        tasks: [
          "دراسة الجدوى"
        ]
      },
      {
        id: "A7",
        title: "إدارة المنطقة الإقليمية",
        tasks: [
          "اتفاقية شراء الأرض"
        ]
      },
      {
        id: "A8",
        title: "عمليات التجديد/إعادة التأهيل",
        tasks: [
          "التشخيص التقني والاجتماعي"
        ]
      }
    ]
  },
  {
    id: "B",
    title: "البرنامج",
    items: [
      {
        id: "B1",
        title: "عملية التنفيذ",
        tasks: [
          "تنظيم أصحاب المصلحة"
        ]
      },
      {
        id: "B2",
        title: "إدارة المشروع / ملخص المالك",
        tasks: [
          "ملخص المالك للدراسة الأولية",
          "ملخص المالك للبرنامج",
          "ملخص المالك لإدارة المشروع",
          "ملخص المالك للبناء",
          "ملخص المالك للاستلام"
        ]
      },
      {
        id: "B3",
        title: "اختيار المبرمج / البرنامج",
        tasks: [
          "اختيار البرمجة"
        ]
      },
      {
        id: "B4",
        title: "محتوى البرنامج",
        tasks: [
          "البرنامج"
        ]
      },
      {
        id: "B5",
        title: "تسليم المفتاح أو التصميم-البناء",
        tasks: [
          "عقد المجموعة"
        ]
      }
    ]
  },
  {
    id: "C",
    title: "إدارة المشروع",
    items: [
      {
        id: "C1",
        title: "عقود الإدارة / عقد الإدارة",
        tasks: [
          "عقد المهندس"
        ]
      },
      {
        id: "C2",
        title: "مسحوبات الإدارة",
        tasks: [
          "ملف الاستفسار للمهندس",
          "خدمات المهندس/الموقع",
          "رأي المحكم"
        ]
      },
      {
        id: "C3",
        title: "إجراء التنافسي / إجراء معاير",
        tasks: [
          "ملف الاستفسار للمهندس",
          "خدمات المهندس/الموقع",
          "رأي المحكم"
        ]
      },
      {
        id: "C4",
        title: "اختيار مدير المشروع / مهندس",
        tasks: [
          "ملف الاستفسار للمهندس",
          "خدمات المهندس/الموقع",
          "رأي المحكم"
        ]
      },
      {
        id: "C5",
        title: "CCAP",
        tasks: [
          "CCAP"
        ]
      },
      {
        id: "C6",
        title: "مرحلة التصميم CCTP / تصميم CCTP",
        tasks: [
          "تصميم أولي",
          "المواصفات الفنية",
          "رأي المحكم"
        ]
      },
      {
        id: "C7",
        title: "مرحلة التنفيذ CCTP",
        tasks: []
      },
      {
        id: "C8",
        title: "مؤشر التكلفة المالي للعقد / الميزانية",
        tasks: [
          "تصميم أولي مفصل",
          "تكاليف الكمية"
        ]
      },
      {
        id: "C9",
        title: "تنسيق الميزانية / مهمة الميزانية",
        tasks: [
          "مخطط عام للتنسيق",
          "مخطط الدراسات/البناء"
        ]
      }
    ]
  },
  {
    id: "D",
    title: "عقد الدراسة",
    items: [
      {
        id: "D1",
        title: "مهمة التحكم الفني / التحكم الفني",
        tasks: [
          "ملف الاستفسار",
          "رأي العميل"
        ]
      },
      {
        id: "D2",
        title: "عقد التحكم الفني",
        tasks: [
          "عقد التحكم الفني"
        ]
      },
      {
        id: "D3",
        title: "مهمة التنسيق الصحي-الأمني / تنسيق الأمني",
        tasks: [
          "مخطط عام للتنسيق",
          "سجل اليومي",
          "ديو",
          "CISSCT"
        ]
      },
      {
        id: "D4",
        title: "التعاون أو التنازل عن الدراسات / عقد الدراسة",
        tasks: [
          "عقد التعاون على الدراسات",
          "عقد التنازل عن الدراسات"
        ]
      },
      {
        id: "D5",
        title: "تطوير عقد الدراسة / عقد الدراسة",
        tasks: [
          "عقد الدراسة"
        ]
      },
      {
        id: "D6",
        title: "تنفيذ التعاون وإدارة العقد / إدارة العقد",
        tasks: [
          "إدارة العقد"
        ]
      },
      {
        id: "D7",
        title: "تسويق التعاون وتناقش العقد / تسويق التعاون وتناقش العقد",
        tasks: [
          "تسويق التعاون وتناقش العقد"
        ]
      }
    ]
  },
  {
    id: "E",
    title: "الموقع",
    items: [
      {
        id: "E1",
        title: "تحليل البرنامج",
        tasks: [
          "تحليل البرنامج"
        ]
      },
      {
        id: "E2",
        title: "البحث الوثائقي",
        tasks: [
          "البحث الوثائقي"
        ]
      },
      {
        id: "E3",
        title: "محتوى ملف الموقع",
        tasks: [
          "ملف الموقع"
        ]
      },
      {
        id: "E4",
        title: "قبول الموقع",
        tasks: [
          "قبول الموقع"
        ]
      }
    ]
  },
  {
    id: "F",
    title: "تصميم أولي نهائي",
    items: [
      {
        id: "F1",
        title: "رصد جغرافي على الموقع",
        tasks: [
          "البحث الوثائقي"
        ]
      },
      {
        id: "F2",
        title: "تحديد التربة ودراسة التربة",
        tasks: [
          "دراسة التربة"
        ]
      },
      {
        id: "F3",
        title: "دراسة الجدوى والاستطلاعات / دراسة الجدوى/الاستطلاع",
        tasks: [
          "دراسة الجدوى/الاستطلاع"
        ]
      },
      {
        id: "F4",
        title: "تصريح المشاريع المتعلقة بالشبكات / تصريح المشاريع المتعلقة بالشبكات",
        tasks: [
          "تصريح المشاريع المتعلقة بالشبكات",
          "رد الإستجابة لتصريح المشاريع المتعلقة بالشبكات"
        ]
      },
      {
        id: "F5",
        title: "تصميم المهندسين المتكاملين والفني / تصميم المهندسين المتكاملين",
        tasks: [
          "تصميم المهندسين المتكاملين"
        ]
      },
      {
        id: "F6",
        title: "دمج مبادئ الجودة البيئية ونظام الإدارة البيئي",
        tasks: [
          "نظام الإدارة البيئي"
        ]
      },
      {
        id: "F7",
        title: "COP 21",
        tasks: [
          "COP 21"
        ]
      },
      {
        id: "F8",
        title: "التصريح الوصفي المختصر / ملاحظة وصفية مختصرة",
        tasks: [
          "ملاحظة وصفية مختصرة"
        ]
      },
      {
        id: "F9",
        title: "تكييف التربة والبيئة / تكييف التربة/البيئة",
        tasks: [
          "تكييف التربة/البيئة"
        ]
      },
      {
        id: "F10",
        title: "الميزانية الأولية",
        tasks: [
          "الميزانية الأولية"
        ]
      },
      {
        id: "F11",
        title: "قبول الدراسات التصميمية الأولية / قبول التصميم الأولي",
        tasks: [
          "تصميم نهائي",
          "رأي التصميم الأولي"
        ]
      }
    ]
  },
  {
    id: "G",
    title: "التراخيص",
    items: [
      {
        id: "G1",
        title: "نطاق الترخيص / نطاق الترخيص",
        tasks: [
          "نطاق الترخيص"
        ]
      },
      {
        id: "G2",
        title: "طلب وتقديم الترخيص / تقديم الترخيص",
        tasks: [
          "تقديم الترخيص"
        ]
      },
      {
        id: "G3",
        title: "توجيه واستلام الترخيص / توجيه الترخيص",
        tasks: [
          "توجيه الاستلام",
          "قرار"
        ]
      },
      {
        id: "G4",
        title: "طلب وتقديم الترخيص للتدمير / تقديم الترخيص للتدمير",
        tasks: [
          "ترخيص التدمير"
        ]
      },
      {
        id: "G5",
        title: "توجيه واستلام الترخيص للتدمير / توجيه الترخيص للتدمير",
        tasks: [
          "توجيه الاستلام",
          "قرار"
        ]
      },
      {
        id: "G6",
        title: "لوحة التصوير للترخيص / لوحة التصوير للمشروع",
        tasks: [
          "مقياس اللوحة المشروع"
        ]
      },
      {
        id: "G7",
        title: "التصريح المسبق",
        tasks: [
          "التصريح المسبق"
        ]
      }
    ]
  },
  {
    id: "H",
    title: "المشروع",
    items: [
      {
        id: "H1",
        title: "دراسة الهيكل والغلاف / دراسة الهيكل/الغلاف",
        tasks: [
          "دراسة الهيكل",
          "دراسة الغلاف"
        ]
      },
      {
        id: "H2",
        title: "دراسة وتنظيم الفراغات الداخلية / دراسة الفراغ الداخلي",
        tasks: [
          "دراسة الفراغ الداخلي"
        ]
      },
      {
        id: "H3",
        title: "دراسة المعدات الفنية / دراسة المعدات الفنية",
        tasks: [
          "دراسة المعدات الفنية"
        ]
      },
      {
        id: "H4",
        title: "دراسة الرد والتصاميم الخارجية / دراسة الطرق والخدمات",
        tasks: [
          "دراسة الطرق والخدمات"
        ]
      },
      {
        id: "H5",
        title: "المواصفات الفنية (CCTP) / المواصفات الفنية",
        tasks: [
          "المواصفات الفنية المتخصصة"
        ]
      },
      {
        id: "H6",
        title: "حدود الخدمة ما بين الشركات / حدود الخدمة ما بين الشركات",
        tasks: [
          "حدود الخدمة ما بين الشركات"
        ]
      },
      {
        id: "H7",
        title: "تحقق المشروع بالمعايير / تحقق المشروع",
        tasks: [
          "تحقق المشروع"
        ]
      },
      {
        id: "H8",
        title: "خلية التوحيد",
        tasks: [
          "خلايا التوحيد"
        ]
      },
      {
        id: "H9",
        title: "المستندات المالية",
        tasks: [
          "المستندات المالية"
        ]
      },
      {
        id: "H10",
        title: "تقدير التكاليف / التكاليف المقدرة",
        tasks: [
          "التكاليف المقدرة"
        ]
      },
      {
        id: "H11",
        title: "قبول المشروع من قبل العميل / قبول المشروع",
        tasks: [
          "قبول المشروع"
        ]
      },
      {
        id: "H12",
        title: "تطبيق التصنيف الأوروبي للمنتجات / تطبيق التصنيف الأوروبي للمنتجات",
        tasks: [
          "تطبيق التصنيف الأوروبي للمنتجات"
        ]
      },
      {
        id: "H13",
        title: "المعايير المتخصصة للإربات / المعايير المضادة للحريق",
        tasks: [
          "المعايير المضادة للحريق"
        ]
      },
      {
        id: "H14",
        title: "المعايير المتخصصة للمكاتب التجارية / المعايير المتخصصة للمكاتب التجارية",
        tasks: [
          "المعايير المتخصصة للمكاتب التجارية"
        ]
      },
      {
        id: "H15",
        title: "مخطط عام للتنسيق الصحي والأمني / مخطط عام للتنسيق الصحي والأمني SPS",
        tasks: [
          "المعايير المتخصصة للمكاتب التجارية"
        ]
      }
    ]
  }
];

// Project structure - Implementation phase
const realizationStructure = [
  {
    id: "I",
    title: "إعداد العقد",
    items: [
      {
        id: "I1",
        title: "شكل العقد",
        tasks: [
          "شكل العقد"
        ]
      },
      {
        id: "I2",
        title: "محتوى العقد",
        tasks: [
          "محتوى العقد"
        ]
      },
      {
        id: "I3",
        title: "مكتب القرار",
        tasks: [
          "مكتب القرار"
        ]
      },
      {
        id: "I4",
        title: "طريقة التوصيل",
        tasks: [
          "طريقة التوصيل"
        ]
      },
      {
        id: "I5",
        title: "التوعية العامة",
        tasks: [
          "التوعية العامة"
        ]
      },
      {
        id: "I6",
        title: "تنظيم الاستشارات",
        tasks: [
          "تنظيم الاستشارات"
        ]
      },
      {
        id: "I7",
        title: "مستند الاستشارات",
        tasks: [
          "مستند الاستشارات"
        ]
      },
      {
        id: "I8",
        title: "موافقة التعاون",
        tasks: [
          "موافقة التعاون"
        ]
      },
      {
        id: "I9",
        title: "شروط الإدارة الخاصة",
        tasks: [
          "شروط الإدارة الخاصة"
        ]
      },
      {
        id: "I10",
        title: "تحديد مواعيد",
        tasks: [
          "تحديد مواعيد"
        ]
      },
      {
        id: "I11",
        title: "تنظيم CISSCT",
        tasks: [
          "تنظيم CISSCT"
        ]
      },
      {
        id: "I12",
        title: "مخطط تثبيت المشروع",
        tasks: [
          "مخططات تثبيت المشروع"
        ]
      },
      {
        id: "I13",
        title: "بطاقة المشروع الخضراء",
        tasks: [
          "بطاقة المشروع الخضراء"
        ]
      },
      {
        id: "I14",
        title: "التأمين",
        tasks: [
          "التأمين"
        ]
      },
      {
        id: "I15",
        title: "تنشيط الاستشارات",
        tasks: [
          "تنشيط الاستشارات"
        ]
      },
      {
        id: "I16",
        title: "مخطط التأمين",
        tasks: [
          "مخطط التأمين"
        ]
      },
      {
        id: "I17",
        title: "مخطط الجودة",
        tasks: [
          "مخطط الجودة"
        ]
      }
    ]
  },
  {
    id: "J",
    title: "استشارات الشركات",
    items: [
      {
        id: "J1",
        title: "تقديم المتقدم",
        tasks: [
          "تقديم المتقدم"
        ]
      },
      {
        id: "J2",
        title: "تقديم العرض",
        tasks: [
          "تقديم العرض"
        ]
      },
      {
        id: "J3",
        title: "ملف تقني",
        tasks: [
          "ملف تقني"
        ]
      },
      {
        id: "J4",
        title: "التعاون أو التنازل عن العرض",
        tasks: [
          "التعاون أو التنازل عن العرض"
        ]
      },
      {
        id: "J5",
        title: "شروط استلام العرض",
        tasks: [
          "شروط استلام العرض"
        ]
      },
      {
        id: "J6",
        title: "تحليل المتقدم",
        tasks: [
          "تحليل المتقدم"
        ]
      },
      {
        id: "J7",
        title: "تحليل العرض",
        tasks: [
          "تحليل العرض"
        ]
      },
      {
        id: "J8",
        title: "ترجيح المعايير",
        tasks: [
          "ترجيح المعايير"
        ]
      },
      {
        id: "J9",
        title: "تعديل العقد",
        tasks: [
          "تعديل العقد"
        ]
      }
    ]
  },
  {
    id: "K",
    title: "بدء العمل وتحضير المشروع",
    items: [
      {
        id: "K1",
        title: "اجتماع توجيه تقني",
        tasks: [
          "اجتماع توجيه تقني"
        ]
      },
      {
        id: "K2",
        title: "سجل المشروع",
        tasks: [
          "سجل المشروع"
        ]
      },
      {
        id: "K3",
        title: "إدارة المشتركين",
        tasks: [
          "إدارة المشتركين"
        ]
      },
      {
        id: "K4",
        title: "إدارة المشتركين غير المباشرين",
        tasks: [
          "إدارة المشتركين غير المباشرين"
        ]
      },
      {
        id: "K5",
        title: "العمل غير معلن",
        tasks: [
          "العمل غير معلن"
        ]
      },
      {
        id: "K6",
        title: "خطط التنفيذ للهياكل",
        tasks: [
          "خطط التنفيذ للهياكل"
        ]
      },
      {
        id: "K7",
        title: "تنفيذ الهياكل",
        tasks: [
          "تنفيذ الهياكل"
        ]
      },
      {
        id: "K8",
        title: "تنفيذ الرد",
        tasks: [
          "تنفيذ الرد"
        ]
      },
      {
        id: "K9",
        title: "تثبيت المشروع",
        tasks: [
          "تثبيت المشروع"
        ]
      },
      {
        id: "K10",
        title: "خطط السلامة المتخصصة",
        tasks: [
          "خطط السلامة المتخصصة"
        ]
      },
      {
        id: "K11",
        title: "تعريف الفتح",
        tasks: [
          "تعريف الفتح"
        ]
      },
      {
        id: "K12",
        title: "تعريفات متعددة",
        tasks: [
          "تعريفات متعددة"
        ]
      },
      {
        id: "K13",
        title: "نوع التناول المتكرر",
        tasks: [
          "نوع التناول المتكرر"
        ]
      },
      {
        id: "K14",
        title: "اجتماع المشروع",
        tasks: [
          "اجتماع المشروع"
        ]
      },
      {
        id: "K15",
        title: "لوحة المشروع",
        tasks: [
          "لوحة المشروع"
        ]
      },
      {
        id: "K16",
        title: "سجل اليومي",
        tasks: [
          "سجل اليومي"
        ]
      },
      {
        id: "K17",
        title: "مشروع التعاون",
        tasks: [
          "مشروع التعاون"
        ]
      }
    ]
  },
  {
    id: "L",
    title: "تنظيم المشروع",
    items: [
      {
        id: "L1",
        title: "مخطط المشروع",
        tasks: [
          "مخطط المشروع"
        ]
      },
      {
        id: "L2",
        title: "التحقق قبل بدء العمل",
        tasks: [
          "التحقق قبل بدء العمل"
        ]
      },
      {
        id: "L3",
        title: "تنظيم مكتب المشروع",
        tasks: [
          "تنظيم مكتب المشروع"
        ]
      },
      {
        id: "L4",
        title: "مخطط الدراسة التنفيذي",
        tasks: [
          "مخطط الدراسة التنفيذي"
        ]
      },
      {
        id: "L5",
        title: "مخطط العمل",
        tasks: [
          "مخطط العمل"
        ]
      },
      {
        id: "L6",
        title: "العمل بالكميات",
        tasks: [
          "العمل بالكميات"
        ]
      },
      {
        id: "L7",
        title: "مخطط الدفع",
        tasks: [
          "مخطط الدفع"
        ]
      }
    ]
  },
  {
    id: "M",
    title: "مراقبة المشروع",
    items: [
      {
        id: "M1",
        title: "تنظيم المشروع",
        tasks: [
          "تنظيم المشروع"
        ]
      },
      {
        id: "M2",
        title: "نقل البريد/وضعية العمل",
        tasks: [
          "نقل البريد/وضعية العمل"
        ]
      },
      {
        id: "M3",
        title: "دخول المشروع",
        tasks: [
          "دخول المشروع"
        ]
      },
      {
        id: "M4",
        title: "تحديث خطط التنفيذ",
        tasks: [
          "تحديث خطط التنفيذ"
        ]
      },
      {
        id: "M5",
        title: "اجتماع المشروع",
        tasks: [
          "اجتماع المشروع"
        ]
      },
      {
        id: "M6",
        title: "موافقة الاجتماع",
        tasks: [
          "موافقة الاجتماع"
        ]
      },
      {
        id: "M7",
        title: "شروط العمل CISSCT",
        tasks: [
          "شروط العمل CISSCT"
        ]
      },
      {
        id: "M8",
        title: "الخدمات الفنية الخارجية",
        tasks: [
          "الخدمات الفنية الخارجية"
        ]
      },
      {
        id: "M9",
        title: "عينة المشروع",
        tasks: [
          "عينة المشروع"
        ]
      },
      {
        id: "M10",
        title: "منزل/خلية نموذجية",
        tasks: [
          "منزل/خلية نموذجية"
        ]
      },
      {
        id: "M11",
        title: "إدارة المفاتيح",
        tasks: [
          "إدارة المفاتيح"
        ]
      },
      {
        id: "M12",
        title: "إدارة المخلفات",
        tasks: [
          "إدارة المخلفات"
        ]
      },
      {
        id: "M13",
        title: "تحديد المشروع",
        tasks: [
          "تحديد المشروع"
        ]
      },
      {
        id: "M14",
        title: "اختبارات فنية",
        tasks: [
          "اختبارات فنية"
        ]
      },
      {
        id: "M15",
        title: "تفكيك التثبيت للمشروع",
        tasks: [
          "تفكيك التثبيت للمشروع"
        ]
      },
      {
        id: "M16",
        title: "تأخير التنفيذ",
        tasks: [
          "تأخير التنفيذ"
        ]
      }
    ]
  },
  {
    id: "N",
    title: "إدارة المالية",
    items: [
      {
        id: "N1",
        title: "ضمان الدفع",
        tasks: [
          "ضمان الدفع"
        ]
      },
      {
        id: "N2",
        title: "توفير حساب الدفع المتراكم",
        tasks: [
          "توفير حساب الدفع المتراكم"
        ]
      },
      {
        id: "N3",
        title: "إدارة الحساب المتراكم",
        tasks: [
          "إدارة الحساب المتراكم"
        ]
      },
      {
        id: "N4",
        title: "إدارة الدفع",
        tasks: [
          "إدارة الدفع"
        ]
      },
      {
        id: "N5",
        title: "شركة عمل غير ناجحة",
        tasks: [
          "شركة عمل غير ناجحة"
        ]
      },
      {
        id: "N6",
        title: "إدارة المهام التعديلية",
        tasks: [
          "إدارة المهام التعديلية"
        ]
      },
      {
        id: "N7",
        title: "نزاع في التنفيذ",
        tasks: [
          "نزاع في التنفيذ"
        ]
      },
      {
        id: "N8",
        title: "إنهاء العقد",
        tasks: [
          "إنهاء العقد"
        ]
      },
      {
        id: "N9",
        title: "تأثير المبيعات على المالية",
        tasks: [
          "تأثير المبيعات على المالية"
        ]
      }
    ]
  },
  {
    id: "O",
    title: "استلام العمل",
    items: [
      {
        id: "O1",
        title: "مستندات العمل المنفذة",
        tasks: [
          "مستندات العمل المنفذة"
        ]
      },
      {
        id: "O2",
        title: "مستند التوصيل اللاحق",
        tasks: [
          "مستند التوصيل اللاحق"
        ]
      },
      {
        id: "O3",
        title: "تنظيف المشروع",
        tasks: [
          "تنظيف المشروع"
        ]
      },
      {
        id: "O4",
        title: "استلام العمل من الخدمات العامة",
        tasks: [
          "استلام العمل من الخدمات العامة"
        ]
      },
      {
        id: "O5",
        title: "العمليات السابقة لاستلام العمل",
        tasks: [
          "العمليات السابقة لاستلام العمل"
        ]
      },
      {
        id: "O6",
        title: "استلام العميل",
        tasks: [
          "استلام العميل"
        ]
      },
      {
        id: "O7",
        title: "تحميل المخزونات",
        tasks: [
          "تحميل المخزونات"
        ]
      },
      {
        id: "O8",
        title: "ملخص العمل",
        tasks: [
          "ملخص العمل"
        ]
      }
    ]
  },
  {
    id: "P",
    title: "إغلاق العقد",
    items: [
      {
        id: "P1",
        title: "جمع المختلفة المبالغ",
        tasks: [
          "جمع المختلفة المبالغ"
        ]
      },
      {
        id: "P2",
        title: "حساب عام نهائي",
        tasks: [
          "حساب عام نهائي"
        ]
      },
      {
        id: "P3",
        title: "نسب التكاليف للعمل",
        tasks: [
          "نسب التكاليف للعمل"
        ]
      },
      {
        id: "P4",
        title: "تسديد العقود لإدارة المشروع",
        tasks: [
          "تسديد العقود لإدارة المشروع"
        ]
      },
      {
        id: "P5",
        title: "مستندات المستندات",
        tasks: [
          "مستندات المستندات"
        ]
      },
      {
        id: "P6",
        title: "التأمين المالي",
        tasks: [
          "التأمين المالي"
        ]
      }
    ]
  }
];

// Allowed file extensions
const fileExtensions = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc, .docx)' },
  { value: 'xls', label: 'Excel (.xls, .xlsx)' },
  { value: 'ppt', label: 'PowerPoint (.ppt, .pptx)' },
  { value: 'txt', label: 'نص (.txt)' },
  { value: 'jpg', label: 'صورة JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'صورة PNG (.png)' },
  { value: 'zip', label: 'ملف مضغوط (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'أخرى' }
];

// Get status label in Arabic
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    assigned: 'تم التعيين',
    in_progress: 'قيد التنفيذ',
    submitted: 'تم التقديم',
    validated: 'تم التحقق',
    rejected: 'مرفوض'
  };
  return statusMap[status] || 'غير معروف';
};

// Get error messages in Arabic
const getErrorMessage = (error: string) => {
  const errorMap: Record<string, string> = {
    'select_stakeholder': 'الرجاء اختيار مسؤول',
    'set_deadline': 'الرجاء تحديد موعد نهائي',
    'set_validation_deadline': 'الرجاء تحديد موعد التحقق النهائي',
    'select_validators': 'الرجاء اختيار مصادق واحد على الأقل',
    'validator_conflict': 'لا يمكن أن يكون المسؤول مصادقاً',
    'loading_error': 'خطأ في تحميل البيانات',
    'save_error': 'خطأ في حفظ البيانات',
    'delete_error': 'خطأ في حذف البيانات',
    'access_denied': 'تم رفض الوصول'
  };
  return errorMap[error] || 'حدث خطأ غير معروف';
};

// Get success messages in Arabic
const getSuccessMessage = (message: string) => {
  const successMap: Record<string, string> = {
    'task_assigned': 'تم تعيين المهمة بنجاح',
    'task_updated': 'تم تحديث المهمة بنجاح',
    'task_deleted': 'تم حذف المهمة بنجاح',
    'task_validated': 'تم التحقق من المهمة بنجاح',
    'task_rejected': 'تم رفض المهمة بنجاح'
  };
  return successMap[message] || 'تمت العملية بنجاح';
};

const ProjectDetails: React.FC = (): ReactNode => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { fetchData, deleteData, insertData, updateData } = useSupabase();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [phaseStructure, setPhaseStructure] = useState<'conception' | 'realisation'>('conception');
  
  // State for task assignment management
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [selectedTask, setSelectedTask] = useState<{
    phase: 'conception' | 'realisation';
    section: string;
    subsection: string;
    taskName: string;
  } | null>(null);
  
  const [assignmentForm, setAssignmentForm] = useState<{
    assigned_to: string;
    deadline: string;
    validation_deadline: string;
    validators: string[];
    file_extension: string;
    comment: string;
  }>({
    assigned_to: '',
    deadline: '',
    validation_deadline: '',
    validators: [],
    file_extension: 'pdf',
    comment: ''
  });
  
  // États pour la gestion des détails de tâche et validation admin
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskAssignment | null>(null);
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState<TaskAssignment | null>(null);
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';
  
  // Charger les détails du projet au chargement de la page
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id) return;
      
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
            title: "Erreur",
            description: "Projet non trouvé",
            variant: "destructive",
          });
          navigate('/dashboard/projets');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails du projet:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails du projet",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [id, fetchData, navigate, toast]);
  
  // Charger les assignations de tâches existantes
  useEffect(() => {
    const fetchTaskAssignments = async () => {
      if (!id) return;
      
      try {
        const data = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: id }]
        });
        
        if (data) {
          setTaskAssignments(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des assignations de tâches:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les assignations de tâches",
          variant: "destructive",
        });
      }
    };
    
    fetchTaskAssignments();
  }, [id, fetchData, toast]);
  
  // Charger les intervenants disponibles
  const fetchIntervenants = async () => {
    setLoadingIntervenants(true);
    try {
      // Récupérer les intervenants avec user_id comme identifiant
      const data = await fetchData<any>('profiles', {
        columns: 'user_id,email,first_name,last_name,role,specialty,is_active',
        filters: [
          { column: 'role', operator: 'eq', value: 'intervenant' },
          { column: 'is_active', operator: 'eq', value: true }
        ]
      });
      
      // Transformer les données pour utiliser user_id comme id
      const transformedData = data?.map(profile => ({
        id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        specialty: profile.specialty
      })) || [];
      
      if (transformedData.length > 0) {
        console.log('Intervenants récupérés:', transformedData);
        setIntervenants(transformedData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des intervenants:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des intervenants",
        variant: "destructive",
      });
    } finally {
      setLoadingIntervenants(false);
    }
  };
  
  // Ouvrir le dialogue d'assignation de tâche
  const handleOpenAssignTask = (phase: 'conception' | 'realisation', section: string, subsection: string, taskName: string) => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent assigner des tâches",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedTask({
      phase,
      section,
      subsection,
      taskName
    });
    
    // Réinitialiser le formulaire
    setAssignmentForm({
      assigned_to: '',
      deadline: '',
      validation_deadline: '',
      validators: [],
      file_extension: 'pdf',
      comment: ''
    });
    
    // Charger les intervenants si ce n'est pas déjà fait
    if (intervenants.length === 0) {
      fetchIntervenants();
    }
    
    setIsAssignDialogOpen(true);
  };
  
  // Vérifier si une tâche est déjà assignée
  const getTaskAssignment = (phase: string, section: string, subsection: string, taskName: string) => {
    return taskAssignments.find(
      assignment => 
        assignment.phase_id === phase && 
        assignment.section_id === section && 
        assignment.subsection_id === subsection && 
        assignment.task_name === taskName
    );
  };
  
  // Soumettre l'assignation de tâche
  const handleSubmitAssignment = async () => {
    if (!selectedTask || !project) return;
    
    if (!assignmentForm.assigned_to) {
      toast({
        title: "خطأ",
        description: getErrorMessage('select_stakeholder'),
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.deadline) {
      toast({
        title: "خطأ",
        description: getErrorMessage('set_deadline'),
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.validation_deadline) {
      toast({
        title: "خطأ",
        description: getErrorMessage('set_validation_deadline'),
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.length === 0) {
      toast({
        title: "خطأ",
        description: getErrorMessage('select_validators'),
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.includes(assignmentForm.assigned_to)) {
      toast({
        title: "خطأ",
        description: getErrorMessage('validator_conflict'),
        variant: "destructive",
      });
      return;
    }
    
    // Check if task is already assigned
    const existingAssignment = getTaskAssignment(
      selectedTask.phase,
      selectedTask.section,
      selectedTask.subsection,
      selectedTask.taskName
    );
    
    try {
      const assignmentData = {
        project_id: project.id,
        phase_id: selectedTask.phase,
        section_id: selectedTask.section,
        subsection_id: selectedTask.subsection,
        task_name: selectedTask.taskName,
        assigned_to: assignmentForm.assigned_to,
        deadline: assignmentForm.deadline,
        validation_deadline: assignmentForm.validation_deadline,
        validators: assignmentForm.validators,
        file_extension: assignmentForm.file_extension,
        comment: assignmentForm.comment || null,
        status: 'assigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (existingAssignment) {
        // Update existing assignment
        result = await updateData('task_assignments', {
          id: existingAssignment.id,
          ...assignmentData
        });
      } else {
        // Create new assignment
        result = await insertData('task_assignments', assignmentData);
      }
      
      if (result) {
        toast({
          title: "نجاح",
          description: getSuccessMessage(existingAssignment ? 'task_updated' : 'task_assigned'),
        });
        
        // Reload assignments
        const updatedAssignments = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: project.id }]
        });
        
        if (updatedAssignments) {
          setTaskAssignments(updatedAssignments);
        }
        
        setIsAssignDialogOpen(false);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast({
        title: "خطأ",
        description: getErrorMessage('save_error'),
        variant: "destructive",
      });
    }
  };
  
  // Gérer la suppression du projet
  const handleDeleteProject = () => {
    setIsDeleteDialogOpen(true);
  };
  
  // Confirmer la suppression du projet
  const confirmDeleteProject = async () => {
    if (!project) return;
    
    try {
      const success = await deleteData('projects', project.id);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم حذف المشروع بنجاح",
        });
        navigate('/dashboard/projets');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "خطأ",
        description: getErrorMessage('delete_error'),
        variant: "destructive",
      });
    }
  };
  
  // Rediriger vers la page d'édition
  const handleEditProject = () => {
    if (!project) return;
    navigate(`/dashboard/projets/edit/${project.id}`);
  };
  
  // Revenir à la liste des projets
  const handleBackToProjects = () => {
    navigate('/dashboard/projets');
  };
  
  // Formatter le nom de l'intervenant
  const formatIntervenantName = (id: string) => {
    const intervenant = intervenants.find(i => i.id === id);
    return intervenant 
      ? `${intervenant.first_name} ${intervenant.last_name}`
      : 'Unknown stakeholder';
  };
  
  // Ouvrir la boîte de dialogue des détails de tâche
  const handleViewTaskDetails = (assignment: TaskAssignment) => {
    setSelectedTaskDetails(assignment);
    setIsTaskDetailsDialogOpen(true);
  };
  
  // Ouvrir la boîte de dialogue de confirmation pour désassigner une tâche
  const handleUnassignTask = (assignment: TaskAssignment) => {
    setTaskToUnassign(assignment);
    setIsUnassignDialogOpen(true);
  };
  
  // Désassigner une tâche
  const confirmUnassignTask = async () => {
    if (!taskToUnassign) return;
    
    try {
      // Delete assignment
      const success = await deleteData('task_assignments', taskToUnassign.id as string);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم حذف المهمة بنجاح",
        });
        
        // Update assignment list by removing the deleted one
        setTaskAssignments(prev => prev.filter(t => t.id !== taskToUnassign.id));
        setIsUnassignDialogOpen(false);
      }
    } catch (error) {
      console.error('Error unassigning task:', error);
      toast({
        title: "خطأ",
        description: "Unable to unassign task",
        variant: "destructive",
      });
    }
  };
  
  // Calculate progress by section
  const calculateSectionProgress = (sectionId: string, phase: 'conception' | 'realisation') => {
    // Filter assignments belonging to this section and phase
    const sectionAssignments = taskAssignments.filter(
      assignment => assignment.section_id === sectionId && assignment.phase_id === phase
    );
    
    if (sectionAssignments.length === 0) return 0;
    
    // Calculate simply the percentage of validated tasks in this section
    const totalTasks = sectionAssignments.length;
    const completedTasks = sectionAssignments.filter(assignment => assignment.status === 'validated').length;
    
    return Math.round((completedTasks / totalTasks) * 100);
  };
  
  // Get color for a status
  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      assigned: 'bg-yellow-500 text-white',
      in_progress: 'bg-blue-500 text-white',
      submitted: 'bg-orange-500 text-white',
      validated: 'bg-green-500 text-white',
      rejected: 'bg-red-500 text-white'
    };
    return statusMap[status] || 'bg-gray-500 text-white';
  };
  
  // Validate a task as admin
  const handleAdminValidateTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: 'تم التحقق من قبل المشرف',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "نجاح",
          description: getSuccessMessage('task_validated'),
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'validated',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'تم التحقق من قبل المشرف',
                  validated_by: user?.id,
                  updated_at: new Date().toISOString()
                } 
              : t
          )
        );
        
        // Update selected task details
        setSelectedTaskDetails({
          ...selectedTaskDetails,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validation_comment: 'تم التحقق من قبل المشرف',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error validating task:', error);
      toast({
        title: "خطأ",
        description: getErrorMessage('save_error'),
        variant: "destructive",
      });
    }
  };
  
  // Reject a task as admin
  const handleAdminRejectTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validation_comment: 'تم الرفض من قبل المشرف',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "نجاح",
          description: getSuccessMessage('task_rejected'),
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'rejected',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'تم الرفض من قبل المشرف',
                  validated_by: user?.id,
                  updated_at: new Date().toISOString()
                } 
              : t
          )
        );
        
        // Update selected task details
        setSelectedTaskDetails({
          ...selectedTaskDetails,
          status: 'rejected',
          validated_at: new Date().toISOString(),
          validation_comment: 'تم الرفض من قبل المشرف',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast({
        title: "خطأ",
        description: getErrorMessage('save_error'),
        variant: "destructive",
      });
    }
  };
  
  // Redirect to appropriate language version
  useEffect(() => {
    const redirectToLanguageVersion = () => {
      if (language !== 'ar') {
        const languageMap = {
          'fr': '/dashboard/projets',
          'en': '/dashboard/projets/en',
          'es': '/dashboard/projets/es'
        };
        navigate(`${languageMap[language as keyof typeof languageMap]}/${id}`);
      }
    };

    redirectToLanguageVersion();
  }, [language, id, navigate]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">المشروع غير موجود</h3>
        <p className="text-gray-500 mb-4">المشروع الذي تبحث عنه غير موجود أو تم حذفه.</p>
        <Button onClick={handleBackToProjects}>العودة إلى المشاريع</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBackToProjects}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              تفاصيل وهيكل المشروع
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditProject}>
            <Edit className="mr-2 h-4 w-4" /> تعديل
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 h-4 w-4" /> حذف
          </Button>
        </div>
      </div>
      
      {/* Project tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-gray-100 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            <Info className="h-4 w-4 ml-2" />
            معلومات
          </TabsTrigger>
          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 ml-2" />
            الهيكل
          </TabsTrigger>
        </TabsList>
        
        {/* Information tab */}
        <TabsContent value="info" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 space-y-6">
              {project.image_url && (
                <div className="mb-4 rounded overflow-hidden">
                  <img 
                    src={project.image_url} 
                    alt={project.name} 
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400?text=الصورة+غير+متوفرة';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-lg font-medium">الوصف</Label>
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-medium">تاريخ البدء</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.start_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-lg font-medium">تاريخ الإنشاء</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Structure tab */}
        <TabsContent value="structure" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">هيكل المشروع</h3>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={phaseStructure === 'conception' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('conception')}
                      size="sm"
                    >
                      مرحلة التصميم
                    </Button>
                    <Button 
                      variant={phaseStructure === 'realisation' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('realisation')}
                      size="sm"
                    >
                      مرحلة التنفيذ
                    </Button>
                  </div>
                </div>
                
                <p className="text-gray-500">
                  {phaseStructure === 'conception' 
                    ? "يوضح الهيكل أدناه تنظيم المراحل المختلفة للمشروع خلال مرحلة التصميم."
                    : "يوضح الهيكل أدناه تنظيم المراحل المختلفة للمشروع خلال مرحلة التنفيذ."
                  }
                </p>
              </div>
              
              <div className="space-y-4">
                <Accordion type="multiple" className="w-full">
                  {(phaseStructure === 'conception' ? projectStructure : realizationStructure).map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border rounded-md mb-4 overflow-hidden">
                      <AccordionTrigger className="bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center">
                            <span className="font-bold text-gray-700 mr-2">{section.id} -</span>
                            <span className="font-medium">{section.title}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <div className="w-36 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-aphs-teal h-2.5 rounded-full" 
                                  style={{ width: `${calculateSectionProgress(section.id, phaseStructure)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {calculateSectionProgress(section.id, phaseStructure)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <div className="space-y-1 p-2">
                          {section.items.map((item) => (
                            <Accordion type="multiple" key={item.id}>
                              <AccordionItem value={item.id} className="border rounded-md mb-2 overflow-hidden">
                                <AccordionTrigger className="bg-white px-4 py-2 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center text-sm">
                                    <span className="font-semibold text-gray-700 mr-2">{item.id}</span>
                                    <span>{item.title}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                  <ul className="p-4 bg-gray-50">
                                    {item.tasks.map((task, index) => {
                                      const assignment = getTaskAssignment(phaseStructure, section.id, item.id, task);
                                      return (
                                        <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                          <div className="flex items-center">
                                            {assignment ? (
                                              <div className="flex items-center mr-2">
                                                {assignment.status === 'assigned' && (
                                                  <Circle className="h-3 w-3 text-yellow-500" />
                                                )}
                                                {assignment.status === 'in_progress' && (
                                                  <Circle className="h-3 w-3 text-blue-500" />
                                                )}
                                                {assignment.status === 'submitted' && (
                                                  <Circle className="h-3 w-3 text-orange-500" />
                                                )}
                                                {assignment.status === 'validated' && (
                                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                )}
                                                {assignment.status === 'rejected' && (
                                                  <Circle className="h-3 w-3 text-red-500" />
                                                )}
                                              </div>
                                            ) : (
                                              <Circle className="h-3 w-3 text-gray-400 mr-2" />
                                            )}
                                            <span className="text-sm">{task}</span>
                                          </div>
                                          <div>
                                            {assignment ? (
                                              <div className="flex items-center text-xs text-gray-500">
                                                <span className="mr-2">
                                                  Assigné à: {formatIntervenantName(assignment.assigned_to)}
                                                </span>
                                                <div className="flex gap-1">
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleViewTaskDetails(assignment)}
                                                    className="h-7 text-xs"
                                                  >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Détails
                                                  </Button>
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleUnassignTask(assignment)}
                                                    className="h-7 text-xs"
                                                  >
                                                    <UserMinus className="h-3 w-3 mr-1" />
                                                    Désassigner
                                                  </Button>
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleOpenAssignTask(phaseStructure, section.id, item.id, task)}
                                                    className="h-7 text-xs"
                                                  >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Réassigner
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleOpenAssignTask(phaseStructure, section.id, item.id, task)}
                                                className="h-7 text-xs"
                                              >
                                                <UserPlus className="h-3 w-3 mr-1" />
                                                Assigner
                                              </Button>
                                            )}
                                          </div>
                                        </li>
                                      );
                                    })}
                                    {item.tasks.length === 0 && (
                                      <li className="text-sm text-gray-500 italic py-1">
                                        Aucune tâche définie pour cette étape
                                      </li>
                                    )}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا المشروع؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا رجعة فيه. سيتم حذف المشروع نهائياً من قاعدة البيانات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Task assignment dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تعيين المهمة</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {phaseStructure === 'conception' ? 'مرحلة التصميم' : 'مرحلة التنفيذ'} &gt; {selectedTask?.section} &gt; {selectedTask?.subsection} &gt; {selectedTask?.taskName}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="assigned_to">المسؤول<span className="text-red-500">*</span></Label>
              <Select
                value={assignmentForm.assigned_to}
                onValueChange={(value) => setAssignmentForm({...assignmentForm, assigned_to: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر مسؤولاً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>المسؤولون</SelectLabel>
                    {loadingIntervenants ? (
                      <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                    ) : (
                      intervenants.map(intervenant => (
                        <SelectItem key={intervenant.id} value={intervenant.id}>
                          {intervenant.first_name} {intervenant.last_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="deadline">الموعد النهائي<span className="text-red-500">*</span></Label>
                <Input
                  id="deadline"
                  type="date"
                  value={assignmentForm.deadline}
                  onChange={(e) => setAssignmentForm({...assignmentForm, deadline: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="file_extension">تنسيق الملف المتوقع<span className="text-red-500">*</span></Label>
                <Select
                  value={assignmentForm.file_extension}
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, file_extension: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر تنسيقاً" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {fileExtensions.map(ext => (
                        <SelectItem key={ext.value} value={ext.value}>
                          {ext.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="validators">المصادقون<span className="text-red-500">*</span></Label>
              <div className="border rounded-md p-3">
                {intervenants.length > 0 ? (
                  intervenants.map(intervenant => (
                    <div key={intervenant.id} className="flex items-center my-1">
                      <input
                        type="checkbox"
                        id={`validator-${intervenant.id}`}
                        className="mr-2 h-4 w-4"
                        checked={assignmentForm.validators.includes(intervenant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignmentForm({
                              ...assignmentForm, 
                              validators: [...assignmentForm.validators, intervenant.id]
                            });
                          } else {
                            setAssignmentForm({
                              ...assignmentForm, 
                              validators: assignmentForm.validators.filter(id => id !== intervenant.id)
                            });
                          }
                        }}
                        disabled={intervenant.id === assignmentForm.assigned_to}
                      />
                      <label htmlFor={`validator-${intervenant.id}`} className={`text-sm ${intervenant.id === assignmentForm.assigned_to ? 'text-gray-400' : ''}`}>
                        {intervenant.first_name} {intervenant.last_name}
                        {intervenant.id === assignmentForm.assigned_to && ' (معين كمسؤول)'}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">جاري تحميل المسؤولين...</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="validation_deadline">موعد التحقق النهائي<span className="text-red-500">*</span></Label>
              <Input
                id="validation_deadline"
                type="date"
                value={assignmentForm.validation_deadline}
                onChange={(e) => setAssignmentForm({...assignmentForm, validation_deadline: e.target.value})}
                min={assignmentForm.deadline || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="comment">تعليق (اختياري)</Label>
              <Textarea
                id="comment"
                value={assignmentForm.comment}
                onChange={(e) => setAssignmentForm({...assignmentForm, comment: e.target.value})}
                placeholder="تعليمات أو معلومات إضافية"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmitAssignment} className="bg-aphs-teal hover:bg-aphs-navy">
              <FileUp className="mr-2 h-4 w-4" />
              تعيين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Task details dialog */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>تفاصيل المهمة</DialogTitle>
            <DialogDescription>
              {selectedTaskDetails && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {selectedTaskDetails.phase_id === 'conception' ? 'مرحلة التصميم' : 'مرحلة التنفيذ'} &gt; {selectedTaskDetails.section_id} &gt; {selectedTaskDetails.subsection_id} &gt; {selectedTaskDetails.task_name}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">الحالة</h3>
                  <div className="flex items-center">
                    <Badge 
                      className={`${getStatusColor(selectedTaskDetails.status)}`}
                    >
                      {getStatusLabel(selectedTaskDetails.status)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">معين إلى</h3>
                  <p>{formatIntervenantName(selectedTaskDetails.assigned_to)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">الموعد النهائي</h3>
                  <p>{new Date(selectedTaskDetails.deadline).toLocaleDateString('ar-SA')}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">موعد التحقق النهائي</h3>
                  <p>{new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">المصادقون</h3>
                <ul className="list-disc pr-5">
                  {selectedTaskDetails.validators.map((validatorId, index) => (
                    <li key={index}>{formatIntervenantName(validatorId)}</li>
                  ))}
                </ul>
              </div>
              
              {selectedTaskDetails.comment && (
                <div>
                  <h3 className="font-medium mb-2">تعليق</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.comment}</p>
                </div>
              )}
              
              {selectedTaskDetails.file_url && (
                <div>
                  <h3 className="font-medium mb-2">الملف المرفق</h3>
                  <div className="flex justify-between items-center">
                    <span>التنسيق المتوقع: {selectedTaskDetails.file_extension.toUpperCase()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedTaskDetails.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      تحميل
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedTaskDetails.validation_comment && (
                <div>
                  <h3 className="font-medium mb-2">تعليق التحقق</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.validation_comment}</p>
                </div>
              )}
              
              {/* Timeline */}
              <div>
                <h3 className="font-medium mb-2">الجدول الزمني</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="bg-green-500 rounded-full h-2 w-2 ml-2"></div>
                    <span>تم إنشاء المهمة: {new Date(selectedTaskDetails.created_at || '').toLocaleDateString('ar-SA')}</span>
                  </div>
                  
                  {selectedTaskDetails.status !== 'assigned' && (
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full h-2 w-2 ml-2"></div>
                      <span>تم بدء المهمة</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.submitted_at && (
                    <div className="flex items-center">
                      <div className="bg-orange-500 rounded-full h-2 w-2 ml-2"></div>
                      <span>تم تقديم المهمة: {new Date(selectedTaskDetails.submitted_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.validated_at && (
                    <div className="flex items-center">
                      <div className={selectedTaskDetails.status === 'validated' ? 'bg-green-500 rounded-full h-2 w-2 ml-2' : 'bg-red-500 rounded-full h-2 w-2 ml-2'}></div>
                      <span>
                        {selectedTaskDetails.status === 'validated' 
                          ? `تم التحقق من المهمة: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('ar-SA')}` 
                          : `تم رفض المهمة: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('ar-SA')}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Admin actions */}
              {isAdmin && selectedTaskDetails.status === 'submitted' && (
                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleAdminRejectTask}
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAdminValidateTask}
                  >
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                    تحقق
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDetailsDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unassign confirmation dialog */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء تعيين هذه المهمة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى إزالة تعيين هذه المهمة. سيتم فقد جميع الأعمال المنجزة في هذه المهمة. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnassignTask} className="bg-red-600 hover:bg-red-700">
              إلغاء التعيين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;