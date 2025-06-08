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
    title: "PRELIMINARY STUDY",
    items: [
      {
        id: "A1",
        title: "PRELIMINARY ANALYSIS",
        tasks: [
          "PRELIMINARY STUDY",
          "EXTERNAL SERVICES OPINIONS",
          "IMPACT STUDY",
          "PRE-PROGRAM"
        ]
      },
      {
        id: "A2",
        title: "DEFINITION STUDY",
        tasks: [
          "DEFINITION STUDIES"
        ]
      },
      {
        id: "A3",
        title: "LOCATION SEARCH / PRE-FEASIBILITY STUDY",
        tasks: [
          "FEASIBILITY STUDY"
        ]
      },
      {
        id: "A4",
        title: "LAND AREA CLEARANCE",
        tasks: [
          "SITE ASSESSMENT"
        ]
      },
      {
        id: "A5",
        title: "FINANCIAL ENVELOPE",
        tasks: [
          "PRELIMINARY BUDGET"
        ]
      },
      {
        id: "A6",
        title: "PROJECT FEASIBILITY",
        tasks: [
          "FEASIBILITY STUDY"
        ]
      },
      {
        id: "A7",
        title: "LAND AREA MANAGEMENT",
        tasks: [
          "LAND PURCHASE AGREEMENT"
        ]
      },
      {
        id: "A8",
        title: "RENOVATION/REHABILITATION OPERATIONS",
        tasks: [
          "TECHNICAL AND SOCIAL DIAGNOSIS"
        ]
      }
    ]
  },
  {
    id: "B",
    title: "PROGRAM",
    items: [
      {
        id: "B1",
        title: "IMPLEMENTATION PROCESS",
        tasks: [
          "STAKEHOLDER ORGANIZATION"
        ]
      },
      {
        id: "B2",
        title: "PROJECT MANAGEMENT / AMO SYNTHESIS",
        tasks: [
          "AMO PRELIMINARY STUDY SYNTHESIS",
          "AMO PROGRAM SYNTHESIS",
          "AMO PROJECT MANAGEMENT SYNTHESIS",
          "AMO CONSTRUCTION SYNTHESIS",
          "AMO ACCEPTANCE SYNTHESIS"
        ]
      },
      {
        id: "B3",
        title: "PROGRAMMER SELECTION / PROGRAM",
        tasks: [
          "PROGRAMMING SELECTION"
        ]
      },
      {
        id: "B4",
        title: "PROGRAM CONTENT",
        tasks: [
          "PROGRAM"
        ]
      },
      {
        id: "B5",
        title: "TURNKEY OR DESIGN-BUILD",
        tasks: [
          "GROUP CONTRACT"
        ]
      }
    ]
  },
  {
    id: "C",
    title: "PROJECT MANAGEMENT",
    items: [
      {
        id: "C1",
        title: "PROJECT MANAGEMENT CONTRACTS / PROJECT MANAGEMENT CONTRACT",
        tasks: [
          "ARCHITECT CONTRACT"
        ]
      },
      {
        id: "C2",
        title: "PROJECT MANAGEMENT COMPETITION",
        tasks: [
          "ARCHITECT CONSULTATION FILE",
          "ARCHITECT SERVICES/SKETCH",
          "JURY OPINION"
        ]
      },
      {
        id: "C3",
        title: "SPECIFIC NEGOTIATED PROCEDURE FOR PROJECT MANAGEMENT / ADAPTED PROCEDURE",
        tasks: [
          "ARCHITECT CONSULTATION FILE",
          "ARCHITECT SERVICES/SKETCH",
          "JURY OPINION"
        ]
      },
      {
        id: "C4",
        title: "PROJECT MANAGER / ARCHITECT SELECTION",
        tasks: [
          "ARCHITECT CONSULTATION FILE",
          "ARCHITECT SERVICES/SKETCH",
          "JURY OPINION"
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
        title: "DESIGN PHASE CCTP / DESIGN CCTP",
        tasks: [
          "PRELIMINARY DESIGN",
          "TECHNICAL SPECIFICATIONS",
          "JURY OPINION"
        ]
      },
      {
        id: "C7",
        title: "IMPLEMENTATION PHASE CCTP",
        tasks: []
      },
      {
        id: "C8",
        title: "CONTRACT FINANCIAL FRAMEWORK / BUDGET",
        tasks: [
          "DETAILED PRELIMINARY DESIGN",
          "COSTS PER LOT"
        ]
      },
      {
        id: "C9",
        title: "OPC COORDINATION / OPC MISSION",
        tasks: [
          "GENERAL COORDINATION PLAN",
          "STUDIES/CONSTRUCTION SCHEDULE"
        ]
      }
    ]
  },
  {
    id: "D",
    title: "STUDY CONTRACT",
    items: [
      {
        id: "D1",
        title: "TECHNICAL CONTROL MISSION / TECHNICAL CONTROL",
        tasks: [
          "CONSULTATION FILE",
          "CLIENT OPINION"
        ]
      },
      {
        id: "D2",
        title: "TECHNICAL CONTROL CONTRACT",
        tasks: [
          "TECHNICAL CONTROL CONTRACT"
        ]
      },
      {
        id: "D3",
        title: "HEALTH-SAFETY COORDINATION MISSION / SAFETY COORDINATION",
        tasks: [
          "GENERAL COORDINATION PLAN",
          "JOURNAL REGISTER",
          "DIUO",
          "CISSCT"
        ]
      },
      {
        id: "D4",
        title: "STUDIES CO-CONTRACTING OR SUBCONTRACTING / STUDY CONTRACT",
        tasks: [
          "STUDIES CO-CONTRACTING CONTRACT",
          "STUDIES SUBCONTRACTING CONTRACT"
        ]
      },
      {
        id: "D5",
        title: "DEVELOPMENT OF STUDY CONTRACT / STUDY CONTRACT",
        tasks: [
          "STUDY CONTRACT"
        ]
      },
      {
        id: "D6",
        title: "STUDY CONTRACT AWARD AND MANAGEMENT / STUDY CONTRACT MANAGEMENT",
        tasks: [
          "STUDY CONTRACT MANAGEMENT"
        ]
      },
      {
        id: "D7",
        title: "STUDY CONTRACT NEGOTIATION / STUDY CONTRACT NEGOTIATION",
        tasks: [
          "STUDY CONTRACT NEGOTIATION"
        ]
      }
    ]
  },
  {
    id: "E",
    title: "SKETCH",
    items: [
      {
        id: "E1",
        title: "PROGRAM ANALYSIS",
        tasks: [
          "PROGRAM ANALYSIS"
        ]
      },
      {
        id: "E2",
        title: "DOCUMENTARY RESEARCH",
        tasks: [
          "DOCUMENTARY RESEARCH"
        ]
      },
      {
        id: "E3",
        title: "SKETCH FILE CONTENT",
        tasks: [
          "SKETCH FILE"
        ]
      },
      {
        id: "E4",
        title: "SKETCH ACCEPTANCE",
        tasks: [
          "SKETCH ACCEPTANCE"
        ]
      }
    ]
  },
  {
    id: "F",
    title: "FINAL PRELIMINARY DESIGN",
    items: [
      {
        id: "F1",
        title: "TOPOGRAPHIC SURVEY OF THE SITE",
        tasks: [
          "DOCUMENTARY RESEARCH"
        ]
      },
      {
        id: "F2",
        title: "SOIL RECOGNITION / SOIL STUDY",
        tasks: [
          "SOIL STUDY"
        ]
      },
      {
        id: "F3",
        title: "FEASIBILITY STUDY AND SURVEYS / FEASIBILITY STUDY/SURVEY",
        tasks: [
          "FEASIBILITY STUDY/SURVEY"
        ]
      },
      {
        id: "F4",
        title: "DECLARATION OF PROJECT WORKS RELATING TO NETWORKS / NETWORKS WORK DECLARATION",
        tasks: [
          "NETWORKS WORK DECLARATION",
          "NETWORKS WORK DECLARATION RESPONSE"
        ]
      },
      {
        id: "F5",
        title: "ARCHITECTURAL AND TECHNICAL DESIGN / ARCHITECTURAL DESIGN",
        tasks: [
          "ARCHITECTURAL DESIGN"
        ]
      },
      {
        id: "F6",
        title: "INTEGRATION OF ENVIRONMENTAL QUALITY PRINCIPLES / ENVIRONMENTAL MANAGEMENT SYSTEM",
        tasks: [
          "ENVIRONMENTAL MANAGEMENT SYSTEM"
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
        title: "SUMMARY DESCRIPTIVE NOTICE / SUMMARY DESCRIPTIVE NOTE",
        tasks: [
          "SUMMARY DESCRIPTIVE NOTE"
        ]
      },
      {
        id: "F9",
        title: "ADAPTATION TO SOIL AND ENVIRONMENT / SOIL/ENVIRONMENT ADAPTATION",
        tasks: [
          "SOIL/ENVIRONMENT ADAPTATION"
        ]
      },
      {
        id: "F10",
        title: "PRELIMINARY BUDGET",
        tasks: [
          "PRELIMINARY BUDGET"
        ]
      },
      {
        id: "F11",
        title: "ACCEPTANCE OF PRELIMINARY DESIGN STUDIES / PRELIMINARY DESIGN ACCEPTANCE",
        tasks: [
          "FINAL PRELIMINARY DESIGN",
          "FINAL PRELIMINARY DESIGN OPINION"
        ]
      }
    ]
  },
  {
    id: "G",
    title: "PERMITS",
    items: [
      {
        id: "G1",
        title: "SCOPE OF BUILDING PERMIT / PERMIT SCOPE",
        tasks: [
          "PERMIT SCOPE"
        ]
      },
      {
        id: "G2",
        title: "BUILDING PERMIT APPLICATION AND FILING / PERMIT FILING",
        tasks: [
          "PERMIT FILING"
        ]
      },
      {
        id: "G3",
        title: "BUILDING PERMIT INSTRUCTION AND OBTAINING / PERMIT INSTRUCTION",
        tasks: [
          "RECEIPT NOTICE",
          "DECISION"
        ]
      },
      {
        id: "G4",
        title: "DEMOLITION PERMIT APPLICATION AND FILING / DEMOLITION PERMIT FILING",
        tasks: [
          "DEMOLITION PERMIT"
        ]
      },
      {
        id: "G5",
        title: "DEMOLITION PERMIT INSTRUCTION AND OBTAINING / DEMOLITION PERMIT INSTRUCTION",
        tasks: [
          "RECEIPT NOTICE",
          "DECISION"
        ]
      },
      {
        id: "G6",
        title: "BUILDING PERMIT DISPLAY PANEL / CONSTRUCTION SITE DISPLAY PANEL",
        tasks: [
          "CONSTRUCTION SITE PANEL MOCKUP"
        ]
      },
      {
        id: "G7",
        title: "PRIOR DECLARATION",
        tasks: [
          "PRIOR DECLARATION"
        ]
      }
    ]
  },
  {
    id: "H",
    title: "PROJECT",
    items: [
      {
        id: "H1",
        title: "STUDY OF STRUCTURE AND ENVELOPE / STRUCTURE/ENVELOPE STUDY",
        tasks: [
          "STRUCTURE STUDY",
          "ENVELOPE STUDY"
        ]
      },
      {
        id: "H2",
        title: "STUDY AND ORGANIZATION OF INTERIOR SPACES / INTERIOR SPACE STUDY",
        tasks: [
          "INTERIOR SPACE STUDY"
        ]
      },
      {
        id: "H3",
        title: "STUDY OF TECHNICAL EQUIPMENT / TECHNICAL EQUIPMENT STUDY",
        tasks: [
          "TECHNICAL EQUIPMENT STUDY"
        ]
      },
      {
        id: "H4",
        title: "STUDY OF VRD AND EXTERIOR LAYOUTS / ROADS AND UTILITIES STUDY",
        tasks: [
          "ROADS AND UTILITIES STUDY"
        ]
      },
      {
        id: "H5",
        title: "TECHNICAL SPECIFICATIONS (CCTP) / TECHNICAL SPECIFICATIONS",
        tasks: [
          "SPECIFIC TECHNICAL SPECIFICATIONS"
        ]
      },
      {
        id: "H6",
        title: "INTER-COMPANY SERVICE LIMITS / INTER-COMPANY SERVICE LIMITS",
        tasks: [
          "INTER-COMPANY SERVICE LIMITS"
        ]
      },
      {
        id: "H7",
        title: "PROJECT COMPLIANCE WITH REGULATIONS / PROJECT COMPLIANCE",
        tasks: [
          "PROJECT COMPLIANCE"
        ]
      },
      {
        id: "H8",
        title: "SYNTHESIS CELL",
        tasks: [
          "SYNTHESIS CELLS"
        ]
      },
      {
        id: "H9",
        title: "FINANCIAL DOCUMENTS",
        tasks: [
          "FINANCIAL DOCUMENTS"
        ]
      },
      {
        id: "H10",
        title: "COST ESTIMATION / ESTIMATED COSTS",
        tasks: [
          "ESTIMATED COSTS"
        ]
      },
      {
        id: "H11",
        title: "PROJECT ACCEPTANCE BY THE CLIENT / PROJECT ACCEPTANCE",
        tasks: [
          "PROJECT ACCEPTANCE"
        ]
      },
      {
        id: "H12",
        title: "EUROPEAN PRODUCT STANDARDIZATION / PRODUCT STANDARDIZATION",
        tasks: [
          "PRODUCT STANDARDIZATION"
        ]
      },
      {
        id: "H13",
        title: "SPECIFIC REGULATIONS FOR ERPs / FIRE REGULATIONS",
        tasks: [
          "FIRE REGULATIONS"
        ]
      },
      {
        id: "H14",
        title: "SPECIFIC REGULATIONS FOR WORK PREMISES / WORK PREMISES REGULATIONS",
        tasks: [
          "WORK PREMISES REGULATIONS"
        ]
      },
      {
        id: "H15",
        title: "GENERAL HEALTH AND SAFETY COORDINATION PLAN / GENERAL SPS COORDINATION PLAN",
        tasks: [
          "WORK PREMISES REGULATIONS"
        ]
      }
    ]
  }
];

// Project structure - Implementation phase
const realizationStructure = [
  {
    id: "I",
    title: "CONTRACT PREPARATION",
    items: [
      {
        id: "I1",
        title: "CONTRACT FORM",
        tasks: [
          "CONTRACT FORM"
        ]
      },
      {
        id: "I2",
        title: "CONTRACT CONTENT",
        tasks: [
          "CONTRACT CONTENT"
        ]
      },
      {
        id: "I3",
        title: "DECISION-MAKING BODY",
        tasks: [
          "DECISION-MAKING BODY"
        ]
      },
      {
        id: "I4",
        title: "AWARD METHOD",
        tasks: [
          "AWARD METHOD"
        ]
      },
      {
        id: "I5",
        title: "CONSULTATION PUBLICITY",
        tasks: [
          "CONSULTATION PUBLICITY"
        ]
      },
      {
        id: "I6",
        title: "CONSULTATION REGULATIONS",
        tasks: [
          "CONSULTATION REGULATIONS"
        ]
      },
      {
        id: "I7",
        title: "CONSULTATION FILE",
        tasks: [
          "CONSULTATION FILE"
        ]
      },
      {
        id: "I8",
        title: "COMMITMENT ACT",
        tasks: [
          "COMMITMENT ACT"
        ]
      },
      {
        id: "I9",
        title: "SPECIAL ADMINISTRATIVE CLAUSES",
        tasks: [
          "SPECIAL ADMINISTRATIVE CLAUSES"
        ]
      },
      {
        id: "I10",
        title: "TIMELINE DEFINITION",
        tasks: [
          "TIMELINE DEFINITION"
        ]
      },
      {
        id: "I11",
        title: "CISSCT REGULATIONS",
        tasks: [
          "CISSCT REGULATIONS"
        ]
      },
      {
        id: "I12",
        title: "CONSTRUCTION SITE INSTALLATION PLAN",
        tasks: [
          "CONSTRUCTION SITE INSTALLATION PLANS"
        ]
      },
      {
        id: "I13",
        title: "GREEN CONSTRUCTION SITE CHARTER",
        tasks: [
          "GREEN CONSTRUCTION SITE CHARTER"
        ]
      },
      {
        id: "I14",
        title: "INSURANCE",
        tasks: [
          "INSURANCE"
        ]
      },
      {
        id: "I15",
        title: "CONSULTATION LAUNCH",
        tasks: [
          "CONSULTATION LAUNCH"
        ]
      },
      {
        id: "I16",
        title: "PROCEDURE DEMATERIALIZATION",
        tasks: [
          "PROCEDURE DEMATERIALIZATION"
        ]
      },
      {
        id: "I17",
        title: "QUALITY ASSURANCE PLAN",
        tasks: [
          "QUALITY ASSURANCE PLAN"
        ]
      }
    ]
  },
  {
    id: "J",
    title: "COMPANY CONSULTATION",
    items: [
      {
        id: "J1",
        title: "APPLICATION SUBMISSION",
        tasks: [
          "APPLICATION SUBMISSION"
        ]
      },
      {
        id: "J2",
        title: "OFFER SUBMISSION",
        tasks: [
          "OFFER SUBMISSION"
        ]
      },
      {
        id: "J3",
        title: "TECHNICAL MEMORANDUM",
        tasks: [
          "TECHNICAL MEMORANDUM"
        ]
      },
      {
        id: "J4",
        title: "CO-CONTRACTING/SUBCONTRACTING",
        tasks: [
          "CO-CONTRACTING/SUBCONTRACTING"
        ]
      },
      {
        id: "J5",
        title: "OFFER RECEPTION CONDITIONS",
        tasks: [
          "OFFER RECEPTION CONDITIONS"
        ]
      },
      {
        id: "J6",
        title: "APPLICATION ANALYSIS",
        tasks: [
          "APPLICATION ANALYSIS"
        ]
      },
      {
        id: "J7",
        title: "OFFER ANALYSIS",
        tasks: [
          "OFFER ANALYSIS"
        ]
      },
      {
        id: "J8",
        title: "CRITERIA WEIGHTING",
        tasks: [
          "CRITERIA WEIGHTING"
        ]
      },
      {
        id: "J9",
        title: "CONTRACT FINE-TUNING",
        tasks: [
          "CONTRACT FINE-TUNING"
        ]
      }
    ]
  },
  {
    id: "K",
    title: "CONSTRUCTION SITE STARTUP AND PREPARATION",
    items: [
      {
        id: "K1",
        title: "TECHNICAL COORDINATION MEETING",
        tasks: [
          "TECHNICAL COORDINATION MEETING"
        ]
      },
      {
        id: "K2",
        title: "CONSTRUCTION SITE REGISTER",
        tasks: [
          "CONSTRUCTION SITE REGISTER"
        ]
      },
      {
        id: "K3",
        title: "SUBCONTRACTOR MANAGEMENT",
        tasks: [
          "SUBCONTRACTOR MANAGEMENT"
        ]
      },
      {
        id: "K4",
        title: "INDIRECT SUBCONTRACTOR MANAGEMENT",
        tasks: [
          "INDIRECT SUBCONTRACTOR MANAGEMENT"
        ]
      },
      {
        id: "K5",
        title: "UNDECLARED WORK",
        tasks: [
          "UNDECLARED WORK"
        ]
      },
      {
        id: "K6",
        title: "STRUCTURE EXECUTION PLANS",
        tasks: [
          "STRUCTURE EXECUTION PLANS"
        ]
      },
      {
        id: "K7",
        title: "STRUCTURE IMPLEMENTATION",
        tasks: [
          "STRUCTURE IMPLEMENTATION"
        ]
      },
      {
        id: "K8",
        title: "VRD IMPLEMENTATION",
        tasks: [
          "VRD IMPLEMENTATION"
        ]
      },
      {
        id: "K9",
        title: "CONSTRUCTION SITE INSTALLATION",
        tasks: [
          "CONSTRUCTION SITE INSTALLATION"
        ]
      },
      {
        id: "K10",
        title: "SPECIFIC SAFETY PLAN",
        tasks: [
          "SPECIFIC SAFETY PLAN"
        ]
      },
      {
        id: "K11",
        title: "CONSTRUCTION SITE OPENING DECLARATION",
        tasks: [
          "CONSTRUCTION SITE OPENING DECLARATION"
        ]
      },
      {
        id: "K12",
        title: "VARIOUS DECLARATIONS",
        tasks: [
          "VARIOUS DECLARATIONS"
        ]
      },
      {
        id: "K13",
        title: "MEETING ANIMATION NATURE",
        tasks: [
          "MEETING ANIMATION NATURE"
        ]
      },
      {
        id: "K14",
        title: "CONSTRUCTION SITE MEETING",
        tasks: [
          "CONSTRUCTION SITE MEETING"
        ]
      },
      {
        id: "K15",
        title: "CONSTRUCTION SITE PANEL",
        tasks: [
          "CONSTRUCTION SITE PANEL"
        ]
      },
      {
        id: "K16",
        title: "JOURNAL REGISTER",
        tasks: [
          "JOURNAL REGISTER"
        ]
      },
      {
        id: "K17",
        title: "REHABILITATION CONSTRUCTION SITE",
        tasks: [
          "REHABILITATION CONSTRUCTION SITE"
        ]
      }
    ]
  },
  {
    id: "L",
    title: "CONSTRUCTION SITE ORGANIZATION",
    items: [
      {
        id: "L1",
        title: "CONSTRUCTION SITE ORGANIZATION CHART",
        tasks: [
          "CONSTRUCTION SITE ORGANIZATION CHART"
        ]
      },
      {
        id: "L2",
        title: "VERIFICATION BEFORE WORK START",
        tasks: [
          "VERIFICATION BEFORE WORK START"
        ]
      },
      {
        id: "L3",
        title: "WORK OFFICE ORGANIZATION",
        tasks: [
          "WORK OFFICE ORGANIZATION"
        ]
      },
      {
        id: "L4",
        title: "EXECUTION STUDY CALENDAR",
        tasks: [
          "EXECUTION STUDY CALENDAR"
        ]
      },
      {
        id: "L5",
        title: "WORK CALENDAR",
        tasks: [
          "WORK CALENDAR"
        ]
      },
      {
        id: "L6",
        title: "ALLOTTED WORKS",
        tasks: [
          "ALLOTTED WORKS"
        ]
      },
      {
        id: "L7",
        title: "PAYMENT SCHEDULE",
        tasks: [
          "PAYMENT SCHEDULE"
        ]
      }
    ]
  },
  {
    id: "M",
    title: "CONSTRUCTION SITE MONITORING",
    items: [
      {
        id: "M1",
        title: "CONSTRUCTION SITE REGULATIONS",
        tasks: [
          "CONSTRUCTION SITE REGULATIONS"
        ]
      },
      {
        id: "M2",
        title: "MAIL/WORK SITUATION TRANSMISSION",
        tasks: [
          "MAIL/WORK SITUATION TRANSMISSION"
        ]
      },
      {
        id: "M3",
        title: "CONSTRUCTION SITE ACCESS",
        tasks: [
          "CONSTRUCTION SITE ACCESS"
        ]
      },
      {
        id: "M4",
        title: "EXECUTION PLANS UPDATE",
        tasks: [
          "EXECUTION PLANS UPDATE"
        ]
      },
      {
        id: "M5",
        title: "CONSTRUCTION SITE MEETING",
        tasks: [
          "CONSTRUCTION SITE MEETING"
        ]
      },
      {
        id: "M6",
        title: "MEETING MINUTES",
        tasks: [
          "MEETING MINUTES"
        ]
      },
      {
        id: "M7",
        title: "CISSCT WORKING CONDITIONS",
        tasks: [
          "CISSCT WORKING CONDITIONS"
        ]
      },
      {
        id: "M8",
        title: "EXTERNAL TECHNICAL SERVICES",
        tasks: [
          "EXTERNAL TECHNICAL SERVICES"
        ]
      },
      {
        id: "M9",
        title: "SAMPLE/PROTOTYPE",
        tasks: [
          "SAMPLE/PROTOTYPE"
        ]
      },
      {
        id: "M10",
        title: "MODEL APARTMENT/CELL",
        tasks: [
          "MODEL APARTMENT/CELL"
        ]
      },
      {
        id: "M11",
        title: "KEY MANAGEMENT",
        tasks: [
          "KEY MANAGEMENT"
        ]
      },
      {
        id: "M12",
        title: "CONSTRUCTION SITE WASTE MANAGEMENT",
        tasks: [
          "CONSTRUCTION SITE WASTE MANAGEMENT"
        ]
      },
      {
        id: "M13",
        title: "CONSTRUCTION SITE FINDING",
        tasks: [
          "CONSTRUCTION SITE FINDING"
        ]
      },
      {
        id: "M14",
        title: "TECHNICAL TESTS",
        tasks: [
          "TECHNICAL TESTS"
        ]
      },
      {
        id: "M15",
        title: "CONSTRUCTION SITE INSTALLATION DISMANTLING",
        tasks: [
          "CONSTRUCTION SITE INSTALLATION DISMANTLING"
        ]
      },
      {
        id: "M16",
        title: "EXECUTION DELAY",
        tasks: [
          "EXECUTION DELAY"
        ]
      }
    ]
  },
  {
    id: "N",
    title: "FINANCIAL MANAGEMENT",
    items: [
      {
        id: "N1",
        title: "PAYMENT GUARANTEE",
        tasks: [
          "PAYMENT GUARANTEE"
        ]
      },
      {
        id: "N2",
        title: "PRO-RATA ACCOUNT CONVENTION",
        tasks: [
          "PRO-RATA ACCOUNT CONVENTION"
        ]
      },
      {
        id: "N3",
        title: "PRO-RATA ACCOUNT MANAGEMENT",
        tasks: [
          "PRO-RATA ACCOUNT MANAGEMENT"
        ]
      },
      {
        id: "N4",
        title: "PAYMENT MANAGEMENT",
        tasks: [
          "PAYMENT MANAGEMENT"
        ]
      },
      {
        id: "N5",
        title: "FAILING COMPANY",
        tasks: [
          "FAILING COMPANY"
        ]
      },
      {
        id: "N6",
        title: "MODIFICATION WORKS MANAGEMENT",
        tasks: [
          "MODIFICATION WORKS MANAGEMENT"
        ]
      },
      {
        id: "N7",
        title: "EXECUTION DISPUTE",
        tasks: [
          "EXECUTION DISPUTE"
        ]
      },
      {
        id: "N8",
        title: "CONTRACT TERMINATION",
        tasks: [
          "CONTRACT TERMINATION"
        ]
      },
      {
        id: "N9",
        title: "SALES FINANCIAL IMPACT",
        tasks: [
          "SALES FINANCIAL IMPACT"
        ]
      }
    ]
  },
  {
    id: "O",
    title: "WORK ACCEPTANCE",
    items: [
      {
        id: "O1",
        title: "EXECUTED WORKS FILE",
        tasks: [
          "EXECUTED WORKS FILE"
        ]
      },
      {
        id: "O2",
        title: "SUBSEQUENT INTERVENTION FILE",
        tasks: [
          "SUBSEQUENT INTERVENTION FILE"
        ]
      },
      {
        id: "O3",
        title: "CONSTRUCTION SITE CLEANING",
        tasks: [
          "CONSTRUCTION SITE CLEANING"
        ]
      },
      {
        id: "O4",
        title: "PUBLIC SERVICES WORK ACCEPTANCE",
        tasks: [
          "PUBLIC SERVICES WORK ACCEPTANCE"
        ]
      },
      {
        id: "O5",
        title: "PRELIMINARY ACCEPTANCE OPERATIONS",
        tasks: [
          "PRELIMINARY ACCEPTANCE OPERATIONS"
        ]
      },
      {
        id: "O6",
        title: "CLIENT ACCEPTANCE",
        tasks: [
          "CLIENT ACCEPTANCE"
        ]
      },
      {
        id: "O7",
        title: "RESERVATIONS LIFTING",
        tasks: [
          "RESERVATIONS LIFTING"
        ]
      },
      {
        id: "O8",
        title: "OPERATION SUMMARY",
        tasks: [
          "OPERATION SUMMARY"
        ]
      }
    ]
  },
  {
    id: "P",
    title: "CONTRACT CLOSURE",
    items: [
      {
        id: "P1",
        title: "VARIOUS CLEARANCES COLLECTION",
        tasks: [
          "VARIOUS CLEARANCES COLLECTION"
        ]
      },
      {
        id: "P2",
        title: "FINAL GENERAL ACCOUNT",
        tasks: [
          "FINAL GENERAL ACCOUNT"
        ]
      },
      {
        id: "P3",
        title: "WORK COST RATIOS",
        tasks: [
          "WORK COST RATIOS"
        ]
      },
      {
        id: "P4",
        title: "PROJECT MANAGEMENT CONTRACTS SETTLEMENT",
        tasks: [
          "PROJECT MANAGEMENT CONTRACTS SETTLEMENT"
        ]
      },
      {
        id: "P5",
        title: "DOCUMENT ARCHIVES",
        tasks: [
          "DOCUMENT ARCHIVES"
        ]
      },
      {
        id: "P6",
        title: "FINANCIAL SURETIES",
        tasks: [
          "FINANCIAL SURETIES"
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
  { value: 'txt', label: 'Text (.txt)' },
  { value: 'jpg', label: 'JPEG Image (.jpg, .jpeg)' },
  { value: 'png', label: 'PNG Image (.png)' },
  { value: 'zip', label: 'ZIP Archive (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Other' }
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
      assigned: 'Assigned',
      in_progress: 'In Progress',
      submitted: 'Submitted',
      validated: 'Validated',
      rejected: 'Rejected'
    };
    return statusMap[status] || 'Unknown';
  };
  
  // Validate a task as admin
  const handleAdminValidateTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: 'Validated by administrator',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Success",
          description: "Task has been validated successfully",
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'validated',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Validated by administrator',
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
          validation_comment: 'Validated by administrator',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error validating task:', error);
      toast({
        title: "Error",
        description: "Unable to validate task",
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
        validation_comment: 'Rejected by administrator',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Success",
          description: "Task has been rejected successfully",
        });
        
        // Update assignment list
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'rejected',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Rejected by administrator',
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
          validation_comment: 'Rejected by administrator',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast({
        title: "Error",
        description: "Unable to reject task",
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
        <h3 className="text-lg font-medium mb-2">Projet non trouvé</h3>
        <p className="text-gray-500 mb-4">Le projet que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button onClick={handleBackToProjects}>Retour aux projets</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
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
              Détails et structure du projet
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditProject}>
            <Edit className="mr-2 h-4 w-4" /> Modifier
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </Button>
        </div>
      </div>
      
      {/* Onglets du projet */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-gray-100 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            <Info className="h-4 w-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 mr-2" />
            Structure
          </TabsTrigger>
        </TabsList>
        
        {/* Onglet Informations */}
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
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Image+indisponible';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-lg font-medium">Description</Label>
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-medium">Date de début</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.start_date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-lg font-medium">Date de création</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.created_at).toLocaleDateString('fr-FR', {
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
        
        {/* Onglet Structure */}
        <TabsContent value="structure" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">STRUCTURE PROJET</h3>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={phaseStructure === 'conception' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('conception')}
                      size="sm"
                    >
                      Phase Conception
                    </Button>
                    <Button 
                      variant={phaseStructure === 'realisation' ? 'default' : 'outline'} 
                      onClick={() => setPhaseStructure('realisation')}
                      size="sm"
                    >
                      Phase Réalisation
                    </Button>
                  </div>
                </div>
                
                <p className="text-gray-500">
                  {phaseStructure === 'conception' 
                    ? "La structure ci-dessous détaille l'organisation des différentes étapes du projet durant sa phase de conception."
                    : "La structure ci-dessous détaille l'organisation des différentes étapes du projet durant sa phase de réalisation."
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
      
      {/* Boîte de dialogue pour confirmer la suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le projet sera définitivement supprimé de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Boîte de dialogue pour l'assignation de tâche */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assigner une tâche</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {phaseStructure === 'conception' ? 'Phase Conception' : 'Phase Réalisation'} &gt; {selectedTask?.section} &gt; {selectedTask?.subsection} &gt; {selectedTask?.taskName}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="assigned_to">Intervenant responsable<span className="text-red-500">*</span></Label>
              <Select
                value={assignmentForm.assigned_to}
                onValueChange={(value) => setAssignmentForm({...assignmentForm, assigned_to: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un intervenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Intervenants</SelectLabel>
                    {loadingIntervenants ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
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
                <Label htmlFor="deadline">Date limite<span className="text-red-500">*</span></Label>
                <Input
                  id="deadline"
                  type="date"
                  value={assignmentForm.deadline}
                  onChange={(e) => setAssignmentForm({...assignmentForm, deadline: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="file_extension">Format de fichier attendu<span className="text-red-500">*</span></Label>
                <Select
                  value={assignmentForm.file_extension}
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, file_extension: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un format" />
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
              <Label htmlFor="validators">Intervenants validateurs<span className="text-red-500">*</span></Label>
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
                        {intervenant.id === assignmentForm.assigned_to && ' (déjà assigné comme responsable)'}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Chargement des intervenants...</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="validation_deadline">Date limite de validation<span className="text-red-500">*</span></Label>
              <Input
                id="validation_deadline"
                type="date"
                value={assignmentForm.validation_deadline}
                onChange={(e) => setAssignmentForm({...assignmentForm, validation_deadline: e.target.value})}
                min={assignmentForm.deadline || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                value={assignmentForm.comment}
                onChange={(e) => setAssignmentForm({...assignmentForm, comment: e.target.value})}
                placeholder="Instructions ou informations supplémentaires"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitAssignment} className="bg-aphs-teal hover:bg-aphs-navy">
              <FileUp className="mr-2 h-4 w-4" />
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Boîte de dialogue pour voir les détails d'une tâche */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Détails de la tâche</DialogTitle>
            <DialogDescription>
              {selectedTaskDetails && (
                <span className="mt-2 block">
                  <span className="font-medium">
                    {selectedTaskDetails.phase_id === 'conception' ? 'Phase Conception' : 'Phase Réalisation'} &gt; {selectedTaskDetails.section_id} &gt; {selectedTaskDetails.subsection_id} &gt; {selectedTaskDetails.task_name}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Statut</h3>
                  <div className="flex items-center">
                    <Badge 
                      className={`${getStatusColor(selectedTaskDetails.status)}`}
                    >
                      {getStatusLabel(selectedTaskDetails.status)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Assigné à</h3>
                  <p>{formatIntervenantName(selectedTaskDetails.assigned_to)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Date limite</h3>
                  <p>{new Date(selectedTaskDetails.deadline).toLocaleDateString('fr-FR')}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Date limite de validation</h3>
                  <p>{new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Validateurs</h3>
                <ul className="list-disc pl-5">
                  {selectedTaskDetails.validators.map((validatorId, index) => (
                    <li key={index}>{formatIntervenantName(validatorId)}</li>
                  ))}
                </ul>
              </div>
              
              {selectedTaskDetails.comment && (
                <div>
                  <h3 className="font-medium mb-2">Commentaire</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.comment}</p>
                </div>
              )}
              
              {selectedTaskDetails.file_url && (
                <div>
                  <h3 className="font-medium mb-2">Fichier soumis</h3>
                  <div className="flex justify-between items-center">
                    <span>Format attendu: {selectedTaskDetails.file_extension.toUpperCase()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedTaskDetails.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedTaskDetails.validation_comment && (
                <div>
                  <h3 className="font-medium mb-2">Commentaire de validation</h3>
                  <p className="whitespace-pre-line text-gray-700">{selectedTaskDetails.validation_comment}</p>
                </div>
              )}
              
              {/* Chronologie */}
              <div>
                <h3 className="font-medium mb-2">Chronologie</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="bg-green-500 rounded-full h-2 w-2 mr-2"></div>
                    <span>Tâche créée: {new Date(selectedTaskDetails.created_at || '').toLocaleDateString('fr-FR')}</span>
                  </div>
                  
                  {selectedTaskDetails.status !== 'assigned' && (
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full h-2 w-2 mr-2"></div>
                      <span>Tâche démarrée</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.submitted_at && (
                    <div className="flex items-center">
                      <div className="bg-orange-500 rounded-full h-2 w-2 mr-2"></div>
                      <span>Tâche soumise: {new Date(selectedTaskDetails.submitted_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  {selectedTaskDetails.validated_at && (
                    <div className="flex items-center">
                      <div className={selectedTaskDetails.status === 'validated' ? 'bg-green-500 rounded-full h-2 w-2 mr-2' : 'bg-red-500 rounded-full h-2 w-2 mr-2'}></div>
                      <span>
                        {selectedTaskDetails.status === 'validated' 
                          ? `Tâche validée: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('fr-FR')}` 
                          : `Tâche rejetée: ${new Date(selectedTaskDetails.validated_at).toLocaleDateString('fr-FR')}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions admin */}
              {isAdmin && selectedTaskDetails.status === 'submitted' && (
                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleAdminRejectTask}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAdminValidateTask}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Valider
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDetailsDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Boîte de dialogue pour confirmer la désassignation */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désassigner cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va supprimer l'assignation de cette tâche. Tout le travail effectué sur cette tâche sera perdu. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnassignTask} className="bg-red-600 hover:bg-red-700">
              Désassigner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;