import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
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
  Download,
  Search
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
  specialty?: string;
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
    title: "ESTUDIO PRELIMINAR",
    items: [
      {
        id: "A1",
        title: "ANÁLISIS PRELIMINAR",
        tasks: [
          "ESTUDIO PRELIMINAR",
          "OPINIONES DE SERVICIOS EXTERNOS",
          "ESTUDIO DE IMPACTO",
          "PRE-PROGRAMA"
        ]
      },
      {
        id: "A2",
        title: "ESTUDIO DE DEFINICIÓN",
        tasks: [
          "ESTUDIOS DE DEFINICIÓN"
        ]
      },
      {
        id: "A3",
        title: "BÚSQUEDA DE UBICACIÓN / ESTUDIO DE PRE-VIABILIDAD",
        tasks: [
          "ESTUDIO DE VIABILIDAD"
        ]
      },
      {
        id: "A4",
        title: "LIBERACIÓN DEL ÁREA TERRITORIAL",
        tasks: [
          "EVALUACIÓN DEL SITIO"
        ]
      },
      {
        id: "A5",
        title: "ENVOLVENTE FINANCIERA",
        tasks: [
          "PRESUPUESTO PRELIMINAR"
        ]
      },
      {
        id: "A6",
        title: "VIABILIDAD DEL PROYECTO",
        tasks: [
          "ESTUDIO DE VIABILIDAD"
        ]
      },
      {
        id: "A7",
        title: "GESTIÓN DEL ÁREA TERRITORIAL",
        tasks: [
          "ACUERDO DE COMPRA DE TERRENO"
        ]
      },
      {
        id: "A8",
        title: "OPERACIONES DE RENOVACIÓN/REHABILITACIÓN",
        tasks: [
          "DIAGNÓSTICO TÉCNICO Y SOCIAL"
        ]
      }
    ]
  },
  {
    id: "B",
    title: "PROGRAMA",
    items: [
      {
        id: "B1",
        title: "PROCESO DE IMPLEMENTACIÓN",
        tasks: [
          "ORGANIZACIÓN DE INTERESADOS"
        ]
      },
      {
        id: "B2",
        title: "GESTIÓN DE PROYECTO / SÍNTESIS AMO",
        tasks: [
          "SÍNTESIS AMO ESTUDIO PRELIMINAR",
          "SÍNTESIS AMO PROGRAMA",
          "SÍNTESIS AMO GESTIÓN DE PROYECTO",
          "SÍNTESIS AMO CONSTRUCCIÓN",
          "SÍNTESIS AMO RECEPCIÓN"
        ]
      },
      {
        id: "B3",
        title: "SELECCIÓN DE PROGRAMADOR / PROGRAMA",
        tasks: [
          "SELECCIÓN DE PROGRAMACIÓN"
        ]
      },
      {
        id: "B4",
        title: "CONTENIDO DEL PROGRAMA",
        tasks: [
          "PROGRAMA"
        ]
      },
      {
        id: "B5",
        title: "LLAVE EN MANO O DISEÑO-CONSTRUCCIÓN",
        tasks: [
          "CONTRATO DE GRUPO"
        ]
      }
    ]
  },
  {
    id: "C",
    title: "GESTIÓN DE PROYECTO",
    items: [
      {
        id: "C1",
        title: "CONTRATOS DE GESTIÓN DE PROYECTO / CONTRATO DE GESTIÓN DE PROYECTO",
        tasks: [
          "CONTRATO DE ARQUITECTO"
        ]
      },
      {
        id: "C2",
        title: "CONCURSO DE GESTIÓN DE PROYECTO",
        tasks: [
          "ARCHIVO DE CONSULTA DE ARQUITECTO",
          "SERVICIOS DE ARQUITECTO/BOCETO",
          "OPINIÓN DEL JURADO"
        ]
      },
      {
        id: "C3",
        title: "PROCEDIMIENTO NEGOCIADO ESPECÍFICO PARA GESTIÓN DE PROYECTO / PROCEDIMIENTO ADAPTADO",
        tasks: [
          "ARCHIVO DE CONSULTA DE ARQUITECTO",
          "SERVICIOS DE ARQUITECTO/BOCETO",
          "OPINIÓN DEL JURADO"
        ]
      },
      {
        id: "C4",
        title: "SELECCIÓN DE GESTOR DE PROYECTO / ARQUITECTO",
        tasks: [
          "ARCHIVO DE CONSULTA DE ARQUITECTO",
          "SERVICIOS DE ARQUITECTO/BOCETO",
          "OPINIÓN DEL JURADO"
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
        title: "FASE DE DISEÑO CCTP / DISEÑO CCTP",
        tasks: [
          "DISEÑO PRELIMINAR",
          "ESPECIFICACIONES TÉCNICAS",
          "OPINIÓN DEL JURADO"
        ]
      },
      {
        id: "C7",
        title: "FASE DE IMPLEMENTACIÓN CCTP",
        tasks: []
      },
      {
        id: "C8",
        title: "MARCO FINANCIERO DEL CONTRATO / PRESUPUESTO",
        tasks: [
          "DISEÑO PRELIMINAR DETALLADO",
          "COSTOS POR LOTE"
        ]
      },
      {
        id: "C9",
        title: "COORDINACIÓN OPC / MISIÓN OPC",
        tasks: [
          "PLAN GENERAL DE COORDINACIÓN",
          "CALENDARIO DE ESTUDIOS/CONSTRUCCIÓN"
        ]
      }
    ]
  },
  {
    id: "D",
    title: "CONTRATO DE ESTUDIO",
    items: [
      {
        id: "D1",
        title: "MISIÓN DE CONTROL TÉCNICO / CONTROL TÉCNICO",
        tasks: [
          "ARCHIVO DE CONSULTA",
          "OPINIÓN DEL CLIENTE"
        ]
      },
      {
        id: "D2",
        title: "CONTRATO DE CONTROL TÉCNICO",
        tasks: [
          "CONTRATO DE CONTROL TÉCNICO"
        ]
      },
      {
        id: "D3",
        title: "MISIÓN DE COORDINACIÓN DE SALUD-SEGURIDAD / COORDINACIÓN DE SEGURIDAD",
        tasks: [
          "PLAN GENERAL DE COORDINACIÓN",
          "REGISTRO DIARIO",
          "DIUO",
          "CISSCT"
        ]
      },
      {
        id: "D4",
        title: "CO-CONTRATACIÓN O SUBCONTRATACIÓN DE ESTUDIOS / CONTRATO DE ESTUDIO",
        tasks: [
          "CONTRATO DE CO-CONTRATACIÓN DE ESTUDIOS",
          "CONTRATO DE SUBCONTRATACIÓN DE ESTUDIOS"
        ]
      },
      {
        id: "D5",
        title: "DESARROLLO DEL CONTRATO DE ESTUDIO / CONTRATO DE ESTUDIO",
        tasks: [
          "CONTRATO DE ESTUDIO"
        ]
      },
      {
        id: "D6",
        title: "ADJUDICACIÓN Y GESTIÓN DEL CONTRATO DE ESTUDIO / GESTIÓN DEL CONTRATO DE ESTUDIO",
        tasks: [
          "GESTIÓN DEL CONTRATO DE ESTUDIO"
        ]
      },
      {
        id: "D7",
        title: "NEGOCIACIÓN DEL CONTRATO DE ESTUDIO / NEGOCIACIÓN DEL CONTRATO DE ESTUDIO",
        tasks: [
          "NEGOCIACIÓN DEL CONTRATO DE ESTUDIO"
        ]
      }
    ]
  },
  {
    id: "E",
    title: "BOCETO",
    items: [
      {
        id: "E1",
        title: "ANÁLISIS DEL PROGRAMA",
        tasks: [
          "ANÁLISIS DEL PROGRAMA"
        ]
      },
      {
        id: "E2",
        title: "INVESTIGACIÓN DOCUMENTAL",
        tasks: [
          "INVESTIGACIÓN DOCUMENTAL"
        ]
      },
      {
        id: "E3",
        title: "CONTENIDO DEL ARCHIVO DE BOCETO",
        tasks: [
          "ARCHIVO DE BOCETO"
        ]
      },
      {
        id: "E4",
        title: "ACEPTACIÓN DEL BOCETO",
        tasks: [
          "ACEPTACIÓN DEL BOCETO"
        ]
      }
    ]
  },
  {
    id: "F",
    title: "DISEÑO PRELIMINAR FINAL",
    items: [
      {
        id: "F1",
        title: "LEVANTAMIENTO TOPOGRÁFICO DEL SITIO",
        tasks: [
          "INVESTIGACIÓN DOCUMENTAL"
        ]
      },
      {
        id: "F2",
        title: "RECONOCIMIENTO DEL SUELO / ESTUDIO DEL SUELO",
        tasks: [
          "ESTUDIO DEL SUELO"
        ]
      },
      {
        id: "F3",
        title: "ESTUDIO DE VIABILIDAD Y ENCUESTAS / ESTUDIO DE VIABILIDAD/ENCUESTA",
        tasks: [
          "ESTUDIO DE VIABILIDAD/ENCUESTA"
        ]
      },
      {
        id: "F4",
        title: "DECLARACIÓN DE OBRAS DE PROYECTO RELATIVAS A REDES / DECLARACIÓN DE OBRAS DE REDES",
        tasks: [
          "DECLARACIÓN DE OBRAS DE REDES",
          "RESPUESTA A DECLARACIÓN DE OBRAS DE REDES"
        ]
      },
      {
        id: "F5",
        title: "DISEÑO ARQUITECTÓNICO Y TÉCNICO / DISEÑO ARQUITECTÓNICO",
        tasks: [
          "DISEÑO ARQUITECTÓNICO"
        ]
      },
      {
        id: "F6",
        title: "INTEGRACIÓN DE PRINCIPIOS DE CALIDAD AMBIENTAL / SISTEMA DE GESTIÓN AMBIENTAL",
        tasks: [
          "SISTEMA DE GESTIÓN AMBIENTAL"
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
        title: "AVISO DESCRIPTIVO RESUMIDO / NOTA DESCRIPTIVA RESUMIDA",
        tasks: [
          "NOTA DESCRIPTIVA RESUMIDA"
        ]
      },
      {
        id: "F9",
        title: "ADAPTACIÓN AL SUELO Y AL AMBIENTE / ADAPTACIÓN SUELO/AMBIENTE",
        tasks: [
          "ADAPTACIÓN SUELO/AMBIENTE"
        ]
      },
      {
        id: "F10",
        title: "PRESUPUESTO PRELIMINAR",
        tasks: [
          "PRESUPUESTO PRELIMINAR"
        ]
      },
      {
        id: "F11",
        title: "ACEPTACIÓN DE ESTUDIOS DE DISEÑO PRELIMINAR / ACEPTACIÓN DE DISEÑO PRELIMINAR",
        tasks: [
          "DISEÑO PRELIMINAR FINAL",
          "OPINIÓN DE DISEÑO PRELIMINAR FINAL"
        ]
      }
    ]
  },
  {
    id: "G",
    title: "PERMISOS",
    items: [
      {
        id: "G1",
        title: "ALCANCE DEL PERMISO DE CONSTRUCCIÓN / ALCANCE DEL PERMISO",
        tasks: [
          "ALCANCE DEL PERMISO"
        ]
      },
      {
        id: "G2",
        title: "SOLICITUD Y PRESENTACIÓN DEL PERMISO DE CONSTRUCCIÓN / PRESENTACIÓN DEL PERMISO",
        tasks: [
          "PRESENTACIÓN DEL PERMISO"
        ]
      },
      {
        id: "G3",
        title: "INSTRUCCIÓN Y OBTENCIÓN DEL PERMISO DE CONSTRUCCIÓN / INSTRUCCIÓN DEL PERMISO",
        tasks: [
          "AVISO DE RECEPCIÓN",
          "DECISIÓN"
        ]
      },
      {
        id: "G4",
        title: "SOLICITUD Y PRESENTACIÓN DEL PERMISO DE DEMOLICIÓN / PRESENTACIÓN DEL PERMISO DE DEMOLICIÓN",
        tasks: [
          "PERMISO DE DEMOLICIÓN"
        ]
      },
      {
        id: "G5",
        title: "INSTRUCCIÓN Y OBTENCIÓN DEL PERMISO DE DEMOLICIÓN / INSTRUCCIÓN DEL PERMISO DE DEMOLICIÓN",
        tasks: [
          "AVISO DE RECEPCIÓN",
          "DECISIÓN"
        ]
      },
      {
        id: "G6",
        title: "PANEL DE VISUALIZACIÓN DEL PERMISO DE CONSTRUCCIÓN / PANEL DE VISUALIZACIÓN DE OBRA",
        tasks: [
          "MAQUETA DEL PANEL DE OBRA"
        ]
      },
      {
        id: "G7",
        title: "DECLARACIÓN PREVIA",
        tasks: [
          "DECLARACIÓN PREVIA"
        ]
      }
    ]
  },
  {
    id: "H",
    title: "PROYECTO",
    items: [
      {
        id: "H1",
        title: "ESTUDIO DE ESTRUCTURA Y ENVOLVENTE / ESTUDIO DE ESTRUCTURA/ENVOLVENTE",
        tasks: [
          "ESTUDIO DE ESTRUCTURA",
          "ESTUDIO DE ENVOLVENTE"
        ]
      },
      {
        id: "H2",
        title: "ESTUDIO Y ORGANIZACIÓN DE ESPACIOS INTERIORES / ESTUDIO DE ESPACIO INTERIOR",
        tasks: [
          "ESTUDIO DE ESPACIO INTERIOR"
        ]
      },
      {
        id: "H3",
        title: "ESTUDIO DE EQUIPAMIENTO TÉCNICO / ESTUDIO DE EQUIPAMIENTO TÉCNICO",
        tasks: [
          "ESTUDIO DE EQUIPAMIENTO TÉCNICO"
        ]
      },
      {
        id: "H4",
        title: "ESTUDIO DE VRD Y DISEÑOS EXTERIORES / ESTUDIO DE VÍAS Y SERVICIOS",
        tasks: [
          "ESTUDIO DE VÍAS Y SERVICIOS"
        ]
      },
      {
        id: "H5",
        title: "ESPECIFICACIONES TÉCNICAS (CCTP) / ESPECIFICACIONES TÉCNICAS",
        tasks: [
          "ESPECIFICACIONES TÉCNICAS ESPECÍFICAS"
        ]
      },
      {
        id: "H6",
        title: "LÍMITES DE SERVICIO ENTRE EMPRESAS / LÍMITES DE SERVICIO ENTRE EMPRESAS",
        tasks: [
          "LÍMITES DE SERVICIO ENTRE EMPRESAS"
        ]
      },
      {
        id: "H7",
        title: "CUMPLIMIENTO DEL PROYECTO CON NORMATIVAS / CUMPLIMIENTO DEL PROYECTO",
        tasks: [
          "CUMPLIMIENTO DEL PROYECTO"
        ]
      },
      {
        id: "H8",
        title: "CÉLULA DE SÍNTESIS",
        tasks: [
          "CÉLULAS DE SÍNTESIS"
        ]
      },
      {
        id: "H9",
        title: "DOCUMENTOS FINANCIEROS",
        tasks: [
          "DOCUMENTOS FINANCIEROS"
        ]
      },
      {
        id: "H10",
        title: "ESTIMACIÓN DE COSTOS / COSTOS ESTIMADOS",
        tasks: [
          "COSTOS ESTIMADOS"
        ]
      },
      {
        id: "H11",
        title: "ACEPTACIÓN DEL PROYECTO POR EL CLIENTE / ACEPTACIÓN DEL PROYECTO",
        tasks: [
          "ACEPTACIÓN DEL PROYECTO"
        ]
      },
      {
        id: "H12",
        title: "NORMALIZACIÓN EUROPEA DE PRODUCTOS / NORMALIZACIÓN DE PRODUCTOS",
        tasks: [
          "NORMALIZACIÓN DE PRODUCTOS"
        ]
      },
      {
        id: "H13",
        title: "NORMATIVAS ESPECÍFICAS PARA ERPs / NORMATIVAS CONTRA INCENDIOS",
        tasks: [
          "NORMATIVAS CONTRA INCENDIOS"
        ]
      },
      {
        id: "H14",
        title: "NORMATIVAS ESPECÍFICAS PARA LOCALES DE TRABAJO / NORMATIVAS DE LOCALES DE TRABAJO",
        tasks: [
          "NORMATIVAS DE LOCALES DE TRABAJO"
        ]
      },
      {
        id: "H15",
        title: "PLAN GENERAL DE COORDINACIÓN DE SALUD Y SEGURIDAD / PLAN GENERAL DE COORDINACIÓN SPS",
        tasks: [
          "NORMATIVAS DE LOCALES DE TRABAJO"
        ]
      }
    ]
  }
];

// Project structure - Implementation phase
const realizationStructure = [
  {
    id: "I",
    title: "PREPARACIÓN DEL CONTRATO",
    items: [
      {
        id: "I1",
        title: "FORMA DEL CONTRATO",
        tasks: [
          "FORMA DEL CONTRATO"
        ]
      },
      {
        id: "I2",
        title: "CONTENIDO DEL CONTRATO",
        tasks: [
          "CONTENIDO DEL CONTRATO"
        ]
      },
      {
        id: "I3",
        title: "ÓRGANO DE DECISIÓN",
        tasks: [
          "ÓRGANO DE DECISIÓN"
        ]
      },
      {
        id: "I4",
        title: "MÉTODO DE ADJUDICACIÓN",
        tasks: [
          "MÉTODO DE ADJUDICACIÓN"
        ]
      },
      {
        id: "I5",
        title: "PUBLICIDAD DE CONSULTA",
        tasks: [
          "PUBLICIDAD DE CONSULTA"
        ]
      },
      {
        id: "I6",
        title: "REGLAMENTO DE CONSULTA",
        tasks: [
          "REGLAMENTO DE CONSULTA"
        ]
      },
      {
        id: "I7",
        title: "EXPEDIENTE DE CONSULTA",
        tasks: [
          "EXPEDIENTE DE CONSULTA"
        ]
      },
      {
        id: "I8",
        title: "ACTA DE COMPROMISO",
        tasks: [
          "ACTA DE COMPROMISO"
        ]
      },
      {
        id: "I9",
        title: "CLÁUSULAS ADMINISTRATIVAS ESPECIALES",
        tasks: [
          "CLÁUSULAS ADMINISTRATIVAS ESPECIALES"
        ]
      },
      {
        id: "I10",
        title: "DEFINICIÓN DE PLAZOS",
        tasks: [
          "DEFINICIÓN DE PLAZOS"
        ]
      },
      {
        id: "I11",
        title: "REGLAMENTO CISSCT",
        tasks: [
          "REGLAMENTO CISSCT"
        ]
      },
      {
        id: "I12",
        title: "PLAN DE INSTALACIÓN DE OBRA",
        tasks: [
          "PLANES DE INSTALACIÓN DE OBRA"
        ]
      },
      {
        id: "I13",
        title: "CARTA DE OBRA VERDE",
        tasks: [
          "CARTA DE OBRA VERDE"
        ]
      },
      {
        id: "I14",
        title: "SEGUROS",
        tasks: [
          "SEGUROS"
        ]
      },
      {
        id: "I15",
        title: "LANZAMIENTO DE CONSULTA",
        tasks: [
          "LANZAMIENTO DE CONSULTA"
        ]
      },
      {
        id: "I16",
        title: "DESMATERIALIZACIÓN DE PROCEDIMIENTO",
        tasks: [
          "DESMATERIALIZACIÓN DE PROCEDIMIENTO"
        ]
      },
      {
        id: "I17",
        title: "PLAN DE ASEGURAMIENTO DE CALIDAD",
        tasks: [
          "PLAN DE ASEGURAMIENTO DE CALIDAD"
        ]
      }
    ]
  },
  {
    id: "J",
    title: "CONSULTA DE EMPRESAS",
    items: [
      {
        id: "J1",
        title: "PRESENTACIÓN DE CANDIDATURA",
        tasks: [
          "PRESENTACIÓN DE CANDIDATURA"
        ]
      },
      {
        id: "J2",
        title: "PRESENTACIÓN DE OFERTA",
        tasks: [
          "PRESENTACIÓN DE OFERTA"
        ]
      },
      {
        id: "J3",
        title: "MEMORIA TÉCNICA",
        tasks: [
          "MEMORIA TÉCNICA"
        ]
      },
      {
        id: "J4",
        title: "CO-CONTRATACIÓN/SUBCONTRATACIÓN",
        tasks: [
          "CO-CONTRATACIÓN/SUBCONTRATACIÓN"
        ]
      },
      {
        id: "J5",
        title: "CONDICIONES DE RECEPCIÓN DE OFERTA",
        tasks: [
          "CONDICIONES DE RECEPCIÓN DE OFERTA"
        ]
      },
      {
        id: "J6",
        title: "ANÁLISIS DE CANDIDATURA",
        tasks: [
          "ANÁLISIS DE CANDIDATURA"
        ]
      },
      {
        id: "J7",
        title: "ANÁLISIS DE OFERTA",
        tasks: [
          "ANÁLISIS DE OFERTA"
        ]
      },
      {
        id: "J8",
        title: "PONDERACIÓN DE CRITERIOS",
        tasks: [
          "PONDERACIÓN DE CRITERIOS"
        ]
      },
      {
        id: "J9",
        title: "AJUSTE DEL CONTRATO",
        tasks: [
          "AJUSTE DEL CONTRATO"
        ]
      }
    ]
  },
  {
    id: "K",
    title: "INICIO Y PREPARACIÓN DE OBRA",
    items: [
      {
        id: "K1",
        title: "REUNIÓN DE COORDINACIÓN TÉCNICA",
        tasks: [
          "REUNIÓN DE COORDINACIÓN TÉCNICA"
        ]
      },
      {
        id: "K2",
        title: "REGISTRO DE OBRA",
        tasks: [
          "REGISTRO DE OBRA"
        ]
      },
      {
        id: "K3",
        title: "GESTIÓN DE SUBCONTRATISTAS",
        tasks: [
          "GESTIÓN DE SUBCONTRATISTAS"
        ]
      },
      {
        id: "K4",
        title: "GESTIÓN DE SUBCONTRATISTAS INDIRECTOS",
        tasks: [
          "GESTIÓN DE SUBCONTRATISTAS INDIRECTOS"
        ]
      },
      {
        id: "K5",
        title: "TRABAJO NO DECLARADO",
        tasks: [
          "TRABAJO NO DECLARADO"
        ]
      },
      {
        id: "K6",
        title: "PLANOS DE EJECUCIÓN DE ESTRUCTURAS",
        tasks: [
          "PLANOS DE EJECUCIÓN DE ESTRUCTURAS"
        ]
      },
      {
        id: "K7",
        title: "IMPLEMENTACIÓN DE ESTRUCTURAS",
        tasks: [
          "IMPLEMENTACIÓN DE ESTRUCTURAS"
        ]
      },
      {
        id: "K8",
        title: "IMPLEMENTACIÓN DE VRD",
        tasks: [
          "IMPLEMENTACIÓN DE VRD"
        ]
      },
      {
        id: "K9",
        title: "INSTALACIÓN DE OBRA",
        tasks: [
          "INSTALACIÓN DE OBRA"
        ]
      },
      {
        id: "K10",
        title: "PLAN DE SEGURIDAD ESPECÍFICO",
        tasks: [
          "PLAN DE SEGURIDAD ESPECÍFICO"
        ]
      },
      {
        id: "K11",
        title: "DECLARACIÓN DE APERTURA DE OBRA",
        tasks: [
          "DECLARACIÓN DE APERTURA DE OBRA"
        ]
      },
      {
        id: "K12",
        title: "DECLARACIONES DIVERSAS",
        tasks: [
          "DECLARACIONES DIVERSAS"
        ]
      },
      {
        id: "K13",
        title: "NATURALEZA DE ANIMACIÓN DE REUNIÓN",
        tasks: [
          "NATURALEZA DE ANIMACIÓN DE REUNIÓN"
        ]
      },
      {
        id: "K14",
        title: "REUNIÓN DE OBRA",
        tasks: [
          "REUNIÓN DE OBRA"
        ]
      },
      {
        id: "K15",
        title: "PANEL DE OBRA",
        tasks: [
          "PANEL DE OBRA"
        ]
      },
      {
        id: "K16",
        title: "REGISTRO DIARIO",
        tasks: [
          "REGISTRO DIARIO"
        ]
      },
      {
        id: "K17",
        title: "OBRA DE REHABILITACIÓN",
        tasks: [
          "OBRA DE REHABILITACIÓN"
        ]
      }
    ]
  },
  {
    id: "L",
    title: "ORGANIZACIÓN DE OBRA",
    items: [
      {
        id: "L1",
        title: "ORGANIGRAMA DE OBRA",
        tasks: [
          "ORGANIGRAMA DE OBRA"
        ]
      },
      {
        id: "L2",
        title: "VERIFICACIÓN ANTES DEL INICIO DE TRABAJOS",
        tasks: [
          "VERIFICACIÓN ANTES DEL INICIO DE TRABAJOS"
        ]
      },
      {
        id: "L3",
        title: "ORGANIZACIÓN DE OFICINA DE OBRA",
        tasks: [
          "ORGANIZACIÓN DE OFICINA DE OBRA"
        ]
      },
      {
        id: "L4",
        title: "CALENDARIO DE ESTUDIO DE EJECUCIÓN",
        tasks: [
          "CALENDARIO DE ESTUDIO DE EJECUCIÓN"
        ]
      },
      {
        id: "L5",
        title: "CALENDARIO DE TRABAJOS",
        tasks: [
          "CALENDARIO DE TRABAJOS"
        ]
      },
      {
        id: "L6",
        title: "TRABAJOS POR LOTES",
        tasks: [
          "TRABAJOS POR LOTES"
        ]
      },
      {
        id: "L7",
        title: "CALENDARIO DE PAGOS",
        tasks: [
          "CALENDARIO DE PAGOS"
        ]
      }
    ]
  },
  {
    id: "M",
    title: "SEGUIMIENTO DE OBRA",
    items: [
      {
        id: "M1",
        title: "REGLAMENTO DE OBRA",
        tasks: [
          "REGLAMENTO DE OBRA"
        ]
      },
      {
        id: "M2",
        title: "TRANSMISIÓN DE CORREO/SITUACIÓN DE TRABAJOS",
        tasks: [
          "TRANSMISIÓN DE CORREO/SITUACIÓN DE TRABAJOS"
        ]
      },
      {
        id: "M3",
        title: "ACCESO A OBRA",
        tasks: [
          "ACCESO A OBRA"
        ]
      },
      {
        id: "M4",
        title: "ACTUALIZACIÓN DE PLANOS DE EJECUCIÓN",
        tasks: [
          "ACTUALIZACIÓN DE PLANOS DE EJECUCIÓN"
        ]
      },
      {
        id: "M5",
        title: "REUNIÓN DE OBRA",
        tasks: [
          "REUNIÓN DE OBRA"
        ]
      },
      {
        id: "M6",
        title: "ACTA DE REUNIÓN",
        tasks: [
          "ACTA DE REUNIÓN"
        ]
      },
      {
        id: "M7",
        title: "CONDICIONES DE TRABAJO CISSCT",
        tasks: [
          "CONDICIONES DE TRABAJO CISSCT"
        ]
      },
      {
        id: "M8",
        title: "SERVICIOS TÉCNICOS EXTERNOS",
        tasks: [
          "SERVICIOS TÉCNICOS EXTERNOS"
        ]
      },
      {
        id: "M9",
        title: "MUESTRA/PROTOTIPO",
        tasks: [
          "MUESTRA/PROTOTIPO"
        ]
      },
      {
        id: "M10",
        title: "APARTAMENTO/CÉLULA MODELO",
        tasks: [
          "APARTAMENTO/CÉLULA MODELO"
        ]
      },
      {
        id: "M11",
        title: "GESTIÓN DE LLAVES",
        tasks: [
          "GESTIÓN DE LLAVES"
        ]
      },
      {
        id: "M12",
        title: "GESTIÓN DE RESIDUOS DE OBRA",
        tasks: [
          "GESTIÓN DE RESIDUOS DE OBRA"
        ]
      },
      {
        id: "M13",
        title: "CONSTATACIÓN DE OBRA",
        tasks: [
          "CONSTATACIÓN DE OBRA"
        ]
      },
      {
        id: "M14",
        title: "PRUEBAS TÉCNICAS",
        tasks: [
          "PRUEBAS TÉCNICAS"
        ]
      },
      {
        id: "M15",
        title: "DESMONTAJE DE INSTALACIÓN DE OBRA",
        tasks: [
          "DESMONTAJE DE INSTALACIÓN DE OBRA"
        ]
      },
      {
        id: "M16",
        title: "RETRASO DE EJECUCIÓN",
        tasks: [
          "RETRASO DE EJECUCIÓN"
        ]
      }
    ]
  },
  {
    id: "N",
    title: "GESTIÓN FINANCIERA",
    items: [
      {
        id: "N1",
        title: "GARANTÍA DE PAGO",
        tasks: [
          "GARANTÍA DE PAGO"
        ]
      },
      {
        id: "N2",
        title: "CONVENIO DE CUENTA PRO-RATA",
        tasks: [
          "CONVENIO DE CUENTA PRO-RATA"
        ]
      },
      {
        id: "N3",
        title: "GESTIÓN DE CUENTA PRO-RATA",
        tasks: [
          "GESTIÓN DE CUENTA PRO-RATA"
        ]
      },
      {
        id: "N4",
        title: "GESTIÓN DE PAGOS",
        tasks: [
          "GESTIÓN DE PAGOS"
        ]
      },
      {
        id: "N5",
        title: "EMPRESA FALLIDA",
        tasks: [
          "EMPRESA FALLIDA"
        ]
      },
      {
        id: "N6",
        title: "GESTIÓN DE TRABAJOS MODIFICATIVOS",
        tasks: [
          "GESTIÓN DE TRABAJOS MODIFICATIVOS"
        ]
      },
      {
        id: "N7",
        title: "DISPUTA DE EJECUCIÓN",
        tasks: [
          "DISPUTA DE EJECUCIÓN"
        ]
      },
      {
        id: "N8",
        title: "RESCISIÓN DE CONTRATO",
        tasks: [
          "RESCISIÓN DE CONTRATO"
        ]
      },
      {
        id: "N9",
        title: "IMPACTO FINANCIERO DE VENTA",
        tasks: [
          "IMPACTO FINANCIERO DE VENTA"
        ]
      }
    ]
  },
  {
    id: "O",
    title: "RECEPCIÓN DE TRABAJOS",
    items: [
      {
        id: "O1",
        title: "EXPEDIENTE DE TRABAJOS EJECUTADOS",
        tasks: [
          "EXPEDIENTE DE TRABAJOS EJECUTADOS"
        ]
      },
      {
        id: "O2",
        title: "EXPEDIENTE DE INTERVENCIÓN POSTERIOR",
        tasks: [
          "EXPEDIENTE DE INTERVENCIÓN POSTERIOR"
        ]
      },
      {
        id: "O3",
        title: "LIMPIEZA DE OBRA",
        tasks: [
          "LIMPIEZA DE OBRA"
        ]
      },
      {
        id: "O4",
        title: "RECEPCIÓN DE TRABAJOS DE SERVICIOS PÚBLICOS",
        tasks: [
          "RECEPCIÓN DE TRABAJOS DE SERVICIOS PÚBLICOS"
        ]
      },
      {
        id: "O5",
        title: "OPERACIONES PREVIAS A LA RECEPCIÓN",
        tasks: [
          "OPERACIONES PREVIAS A LA RECEPCIÓN"
        ]
      },
      {
        id: "O6",
        title: "RECEPCIÓN DEL CLIENTE",
        tasks: [
          "RECEPCIÓN DEL CLIENTE"
        ]
      },
      {
        id: "O7",
        title: "LEVANTAMIENTO DE RESERVAS",
        tasks: [
          "LEVANTAMIENTO DE RESERVAS"
        ]
      },
      {
        id: "O8",
        title: "RESUMEN DE OPERACIÓN",
        tasks: [
          "RESUMEN DE OPERACIÓN"
        ]
      }
    ]
  },
  {
    id: "P",
    title: "CIERRE DEL CONTRATO",
    items: [
      {
        id: "P1",
        title: "RECOLECCIÓN DE DIFERENTES FINIQUITOS",
        tasks: [
          "RECOLECCIÓN DE DIFERENTES FINIQUITOS"
        ]
      },
      {
        id: "P2",
        title: "CUENTA GENERAL DEFINITIVA",
        tasks: [
          "CUENTA GENERAL DEFINITIVA"
        ]
      },
      {
        id: "P3",
        title: "RATIOS DE COSTOS DE TRABAJOS",
        tasks: [
          "RATIOS DE COSTOS DE TRABAJOS"
        ]
      },
      {
        id: "P4",
        title: "LIQUIDACIÓN DE CONTRATOS DE GESTIÓN DE PROYECTO",
        tasks: [
          "LIQUIDACIÓN DE CONTRATOS DE GESTIÓN DE PROYECTO"
        ]
      },
      {
        id: "P5",
        title: "ARCHIVO DE DOCUMENTOS",
        tasks: [
          "ARCHIVO DE DOCUMENTOS"
        ]
      },
      {
        id: "P6",
        title: "GARANTÍAS FINANCIERAS",
        tasks: [
          "GARANTÍAS FINANCIERAS"
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
  { value: 'txt', label: 'Texto (.txt)' },
  { value: 'jpg', label: 'Imagen JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'Imagen PNG (.png)' },
  { value: 'zip', label: 'Archivo ZIP (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Otro' }
];

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  
  // Estado para búsqueda en formulario de asignación
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  
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
  
  // Filtrar especialistas según la búsqueda
  const filteredIntervenantsForAssignment = intervenants.filter(intervenant => {
    if (!assignmentSearchQuery) return true;
    
    const searchLower = assignmentSearchQuery.toLowerCase();
    const fullName = `${intervenant.first_name} ${intervenant.last_name}`.toLowerCase();
    const email = intervenant.email.toLowerCase();
    const specialty = (intervenant.specialty || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           specialty.includes(searchLower);
  });

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
    
    // Reiniciar búsqueda
    setAssignmentSearchQuery('');
    
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
        title: "Error",
        description: "Please select a stakeholder",
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.deadline) {
      toast({
        title: "Error",
        description: "Please set a deadline",
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.validation_deadline) {
      toast({
        title: "Error",
        description: "Please set a validation deadline",
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one validator",
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.includes(assignmentForm.assigned_to)) {
      toast({
        title: "Error",
        description: "The assigned stakeholder cannot be a validator",
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
          title: "Success",
          description: existingAssignment 
            ? "Assignment has been updated successfully" 
            : "Task has been assigned successfully",
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
        title: "Error",
        description: "Unable to assign task",
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
          title: "Success",
          description: "Project deleted successfully",
        });
        navigate('/dashboard/projets');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Unable to delete project",
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
          title: "Success",
          description: "Task has been unassigned successfully",
        });
        
        // Update assignment list by removing the deleted one
        setTaskAssignments(prev => prev.filter(t => t.id !== taskToUnassign.id));
        setIsUnassignDialogOpen(false);
      }
    } catch (error) {
      console.error('Error unassigning task:', error);
      toast({
        title: "Error",
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
  
  // Get label for a status
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      assigned: 'Asignada',
      in_progress: 'En Progreso',
      submitted: 'Enviada',
      validated: 'Validada',
      rejected: 'Rechazada'
    };
    return statusMap[status] || 'Desconocido';
  };
  
  // Validate a task as admin
  const handleAdminValidateTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: 'Validado por administrador',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Éxito",
          description: "La tarea ha sido validada con éxito",
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'validated',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Validado por administrador',
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
          validation_comment: 'Validado por administrador',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error al validar la tarea:', error);
      toast({
        title: "Error",
        description: "No se puede validar la tarea",
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
        validation_comment: 'Rechazado por administrador',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Éxito",
          description: "La tarea ha sido rechazada con éxito",
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'rejected',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Rechazado por administrador',
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
          validation_comment: 'Rechazado por administrador',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error al rechazar la tarea:', error);
      toast({
        title: "Error",
        description: "No se puede rechazar la tarea",
        variant: "destructive",
      });
    }
  };
  
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
        <h3 className="text-lg font-medium mb-2">Proyecto no encontrado</h3>
        <p className="text-gray-500 mb-4">El proyecto que busca no existe o ha sido eliminado.</p>
        <Button onClick={handleBackToProjects}>Volver a proyectos</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
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
              Detalles y estructura del proyecto
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditProject}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>
      
      {/* Project tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-gray-100 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            <Info className="h-4 w-4 mr-2" />
            Información
          </TabsTrigger>
          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 mr-2" />
            Estructura
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
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-lg font-medium">Descripción</Label>
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-medium">Fecha de inicio</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.start_date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-lg font-medium">Fecha de creación</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
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
                  <h3 className="text-xl font-bold text-gray-800">ESTRUCTURA DEL PROYECTO</h3>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={phaseStructure === 'conception' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('conception')}
                      size="sm"
                    >
                      Fase de Diseño
                    </Button>
                    <Button 
                      variant={phaseStructure === 'realisation' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('realisation')}
                      size="sm"
                    >
                      Fase de Realización
                    </Button>
                  </div>
                </div>
                
                <p className="text-gray-500">
                  {phaseStructure === 'conception' 
                    ? "La estructura a continuación detalla la organización de las diferentes etapas del proyecto durante su fase de diseño."
                    : "La estructura a continuación detalla la organización de las diferentes etapas del proyecto durante su fase de realización."
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
            <AlertDialogTitle>¿Está seguro de que desea eliminar este proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. El proyecto será eliminado permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Task assignment dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Asignar tarea</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {phaseStructure === 'conception' ? 'Fase de Diseño' : 'Fase de Realización'} &gt; {selectedTask?.section} &gt; {selectedTask?.subsection} &gt; {selectedTask?.taskName}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Campo de búsqueda */}
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="search">Buscar especialista</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Buscar por nombre, email o especialidad..."
                  value={assignmentSearchQuery}
                  onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {assignmentSearchQuery && (
                <div className="text-xs text-gray-500">
                  {filteredIntervenantsForAssignment.length} especialista(s) encontrado(s)
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="assigned_to">Responsable<span className="text-red-500">*</span></Label>
              <Select
                value={assignmentForm.assigned_to}
                onValueChange={(value) => setAssignmentForm({...assignmentForm, assigned_to: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar un responsable" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectGroup>
                    <SelectLabel>Responsables</SelectLabel>
                    {loadingIntervenants ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : filteredIntervenantsForAssignment.length > 0 ? (
                      filteredIntervenantsForAssignment.map(intervenant => (
                        <SelectItem key={intervenant.id} value={intervenant.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {intervenant.first_name} {intervenant.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {intervenant.email}
                              {intervenant.specialty && ` • ${intervenant.specialty}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-results" disabled>
                        Ningún especialista encontrado
                      </SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="deadline">Fecha límite<span className="text-red-500">*</span></Label>
                <Input
                  id="deadline"
                  type="date"
                  value={assignmentForm.deadline}
                  onChange={(e) => setAssignmentForm({...assignmentForm, deadline: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="file_extension">Formato de archivo esperado<span className="text-red-500">*</span></Label>
                <Select
                  value={assignmentForm.file_extension}
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, file_extension: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar un formato" />
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
              <Label htmlFor="validators">Validadores<span className="text-red-500">*</span></Label>
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                {filteredIntervenantsForAssignment.length > 0 ? (
                  filteredIntervenantsForAssignment.map(intervenant => (
                    <div key={intervenant.id} className="flex items-center my-1 p-2 hover:bg-gray-50 rounded transition-colors">
                      <input
                        type="checkbox"
                        id={`validator-${intervenant.id}`}
                        className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
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
                      <label htmlFor={`validator-${intervenant.id}`} className={`text-sm cursor-pointer flex-1 ${intervenant.id === assignmentForm.assigned_to ? 'text-gray-400' : 'text-gray-700'}`}>
                        <div className="font-medium">
                          {intervenant.first_name} {intervenant.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {intervenant.email}
                          {intervenant.specialty && ` • ${intervenant.specialty}`}
                        </div>
                        {intervenant.id === assignmentForm.assigned_to && (
                          <div className="text-xs text-gray-400 italic">
                            (ya asignado como responsable)
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-2">
                    {loadingIntervenants ? 'Cargando especialistas...' : 
                     assignmentSearchQuery ? 'Ningún especialista encontrado para esta búsqueda' : 
                     'Ningún especialista disponible'}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {assignmentForm.validators.length > 0 ? 
                  `${assignmentForm.validators.length} validador(es) seleccionado(s)` : 
                  'Ningún validador seleccionado'
                }
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="validation_deadline">Fecha límite de validación<span className="text-red-500">*</span></Label>
              <Input
                id="validation_deadline"
                type="date"
                value={assignmentForm.validation_deadline}
                onChange={(e) => setAssignmentForm({...assignmentForm, validation_deadline: e.target.value})}
                min={assignmentForm.deadline || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="comment">Comentario (opcional)</Label>
              <Textarea
                id="comment"
                value={assignmentForm.comment}
                onChange={(e) => setAssignmentForm({...assignmentForm, comment: e.target.value})}
                placeholder="Instrucciones o información adicional"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitAssignment} className="bg-aphs-teal hover:bg-aphs-navy">
              <FileUp className="mr-2 h-4 w-4" />
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Task details dialog */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Detalles de la tarea</DialogTitle>
            <DialogDescription>
              {selectedTaskDetails && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {selectedTaskDetails.phase_id === 'conception' ? 'Fase de Diseño' : 'Fase de Realización'} &gt; {selectedTaskDetails.section_id} &gt; {selectedTaskDetails.subsection_id} &gt; {selectedTaskDetails.task_name}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Estado</h3>
                  <div className="flex items-center">
                    <Badge 
                      className={`${getStatusColor(selectedTaskDetails.status)}`}
                    >
                      {getStatusLabel(selectedTaskDetails.status)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Asignado a</h3>
                  <p>{formatIntervenantName(selectedTaskDetails.assigned_to)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Fecha límite</h3>
                  <p>{new Date(selectedTaskDetails.deadline).toLocaleDateString('es-ES')}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Fecha límite de validación</h3>
                  <p>{new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Validadores</h3>
                <ul className="list-disc pl-5">
                  {selectedTaskDetails.validators.map((validatorId, index) => (
                    <li key={index}>{formatIntervenantName(validatorId)}</li>
                  ))}
                </ul>
              </div>
              
              {selectedTaskDetails.comment && (
                <div>
                  <h3 className="font-medium mb-2">Comentario</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.comment}</p>
                </div>
              )}
              
              {selectedTaskDetails.file_url && (
                <div>
                  <h3 className="font-medium mb-2">Archivo enviado</h3>
                  <div className="flex justify-between items-center">
                    <span>Formato esperado: {selectedTaskDetails.file_extension.toUpperCase()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedTaskDetails.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedTaskDetails.validation_comment && (
                <div>
                  <h3 className="font-medium mb-2">Comentario de validación</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.validation_comment}</p>
                </div>
              )}
              
              {/* Timeline */}
              <div>
                <h3 className="font-medium mb-2">Cronología</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="bg-green-500 rounded-full h-2 w-2 mr-2"></div>
                    <span>Tarea creada: {new Date(selectedTaskDetails.created_at || '').toLocaleDateString('es-ES')}</span>
                  </div>
                  
                  {selectedTaskDetails.status !== 'assigned' && (
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full h-2 w-2 mr-2"></div>
                      <span>Tarea iniciada</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.submitted_at && (
                    <div className="flex items-center">
                      <div className="bg-orange-500 rounded-full h-2 w-2 mr-2"></div>
                      <span>Tarea enviada: {new Date(selectedTaskDetails.submitted_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.validated_at && (
                    <div className="flex items-center">
                      <div className={selectedTaskDetails.status === 'validated' ? 'bg-green-500 rounded-full h-2 w-2 mr-2' : 'bg-red-500 rounded-full h-2 w-2 mr-2'}></div>
                      <span>
                        {selectedTaskDetails.status === 'validated' 
                          ? `Tarea validada: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('es-ES')}` 
                          : `Tarea rechazada: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('es-ES')}`}
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
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAdminValidateTask}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Validar
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDetailsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unassign confirmation dialog */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la asignación de esta tarea. Todo el trabajo realizado en esta tarea se perderá. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnassignTask} className="bg-red-600 hover:bg-red-700">
              Desasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;