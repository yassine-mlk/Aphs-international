import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
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
  Users,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

// Interface pour le type de projet
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
  status?: string;
}

// Interface pour un intervenant
interface Intervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Interface pour une tâche assignée
interface TaskAssignment {
  id?: string;
  project_id: string;
  phase_id: string; // "conception" ou "realisation"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // ID de l'intervenant
  deadline: string;
  validation_deadline: string;
  validators: string[]; // IDs des intervenants validateurs
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

// Interface pour un membre du projet
interface ProjectMember {
  id?: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at?: string;
  added_by?: string;
}

// Interface pour un intervenant avec informations complètes
interface IntervenantWithDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty?: string;
}

// Structure du projet - Phase conception
const projectStructure = [
  {
    id: "A",
    title: "ETUDE PREALABLE",
    items: [
      {
        id: "A1",
        title: "REFLEXION PRELIMINAIRE",
        tasks: [
          "ETUDE PRÉALABLE",
          "AVIS SERVICES EXTERIEURS",
          "ETUDE D'IMPACT",
          "PRE PROGRAMME"
        ]
      },
      {
        id: "A2",
        title: "ETUDE DE DEFINITION",
        tasks: [
          "ETUDES DE DEFINITION"
        ]
      },
      {
        id: "A3",
        title: "RECHERCHE DE LOCALISATION / PRE ETUDE DE VIABILITE",
        tasks: [
          "ETUDE DE VIABILITÉ"
        ]
      },
      {
        id: "A4",
        title: "LIBÉRATION DE L'EMPRISE FONCIÈRE",
        tasks: [
          "ETAT DES LIEUX"
        ]
      },
      {
        id: "A5",
        title: "ENVELOPPE FINANCIÈRE",
        tasks: [
          "BUDGET PRÉVISIONNEL"
        ]
      },
      {
        id: "A6",
        title: "FAISABILITÉ DE L'OPÉRATION",
        tasks: [
          "ETUDE DE FAISABILITÉ"
        ]
      },
      {
        id: "A7",
        title: "MAÎTRISE DE L'EMPRISE FONCIÈRE",
        tasks: [
          "COMPROMIS DE VENTE FONCIÈRE"
        ]
      },
      {
        id: "A8",
        title: "CAS OPÉRATIONS DE RÉHABILITATION / CAS DE RÉNOVATION",
        tasks: [
          "DIAGNOSTIC TECHNIQUE ET SOCIAL"
        ]
      }
    ]
  },
  {
    id: "B",
    title: "PROGRAMME",
    items: [
      {
        id: "B1",
        title: "PROCESSUS DE RÉALISATION",
        tasks: [
          "ORGANISATION DES INTERVENANTS"
        ]
      },
      {
        id: "B2",
        title: "CONDUITE D'OPÉRATION / SYNTHÈSE AMO",
        tasks: [
          "SYNTHÈSE AMO ETUDE PREALABLE",
          "SYNTHÈSE AMO PROGRAMME",
          "SYNTHÈSE AMO MAÎTRISE D'ŒUVRE",
          "SYNTHÈSE AMO TRAVAUX",
          "SYNTHÈSE AMO RÉCEPTION"
        ]
      },
      {
        id: "B3",
        title: "CHOIX DU PROGRAMMISTE / PROGRAMME",
        tasks: [
          "CHOIX DE LA PROGRAMMATION"
        ]
      },
      {
        id: "B4",
        title: "CONTENU DU PROGRAMME",
        tasks: [
          "PROGRAMME"
        ]
      },
      {
        id: "B5",
        title: "CLÉ EN MAIN OU CONCEPTION-RÉALISATION",
        tasks: [
          "CONTRAT DE GROUPEMENT"
        ]
      }
    ]
  },
  {
    id: "C",
    title: "MAITRISE D'OEUVRE",
    items: [
      {
        id: "C1",
        title: "PASSATION DES MARCHÉS DE MAÎTRISE D'ŒUVRE / CONTRAT MAÎTRISE D'OEUVRE",
        tasks: [
          "CONTRAT ARCHITECTE"
        ]
      },
      {
        id: "C2",
        title: "CONCOURS DE MAÎTRISE D'ŒUVRE",
        tasks: [
          "DOSSIER DE CONSULTATION ARCHITECTES",
          "PRESTATION ARCHITECTES/ESQUISSE",
          "AVIS DU JURY"
        ]
      },
      {
        id: "C3",
        title: "PROCÉDURE NÉGOCIÉE SPÉCIFIQUE À LA MAÎTRISE D'ŒUVRE / PROCÉDURE ADAPTÉE",
        tasks: [
          "DOSSIER DE CONSULTATION ARCHITECTES",
          "PRESTATION ARCHITECTES/ESQUISSE",
          "AVIS DU JURY"
        ]
      },
      {
        id: "C4",
        title: "LE CHOIX D'UN MAÎTRE D'ŒUVRE / ARCHITECTES",
        tasks: [
          "DOSSIER DE CONSULTATION ARCHITECTES",
          "PRESTATION ARCHITECTES/ESQUISSE",
          "AVIS DU JURY"
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
        title: "CCTP PHASE CONCEPTION / CCTP CONCEPTION",
        tasks: [
          "AVANT PROJET SOMMAIRE",
          "CAHIER DES CHARGES TECHNIQUES",
          "AVIS DU JURY"
        ]
      },
      {
        id: "C7",
        title: "CCTP PHASE RÉALISATION",
        tasks: []
      },
      {
        id: "C8",
        title: "CADRAGE FINANCIER DU CONTRAT / BUDGET",
        tasks: [
          "AVANT PROJET DÉTAILLÉ",
          "COÛTS PAR LOT"
        ]
      },
      {
        id: "C9",
        title: "COORDINATION OPC / MISSION OPC",
        tasks: [
          "PLAN GENERAL DE COORDINATION",
          "PLANNING ETUDES/TRAVAUX"
        ]
      }
    ]
  },
  {
    id: "D",
    title: "CONTRAT D'ETUDES",
    items: [
      {
        id: "D1",
        title: "MISSION DE CONTRÔLE TECHNIQUE / CONTRÔLE TECHNIQUE",
        tasks: [
          "DOSSIER DE CONSULTATION",
          "AVIS MOA"
        ]
      },
      {
        id: "D2",
        title: "CONTRAT DE CONTRÔLE TECHNIQUE",
        tasks: [
          "CONTRAT CONTRÔLE TECHNIQUE"
        ]
      },
      {
        id: "D3",
        title: "MISSION DE COORDINATION SÉCURITÉ-SANTÉ / COORDINATION SÉCURITÉ",
        tasks: [
          "PLAN GENERAL DE COORDINATION",
          "REGISTRE JOURNAL",
          "DIUO",
          "CISSCT"
        ]
      },
      {
        id: "D4",
        title: "COTRAITANCE OU SOUS-TRAITANCE DES ÉTUDES / CONTRAT ÉTUDES",
        tasks: [
          "CONTRAT CO-TRAITANCE ÉTUDES",
          "CONTRAT SOUS-TRAITANCE ÉTUDES"
        ]
      },
      {
        id: "D5",
        title: "ÉLABORATION DU MARCHÉ D'ÉTUDES / MARCHÉ D'ÉTUDES",
        tasks: [
          "MARCHÉ ÉTUDES"
        ]
      },
      {
        id: "D6",
        title: "PASSATION ET GESTION DU MARCHÉ D'ÉTUDES / GESTION MARCHÉ ÉTUDES",
        tasks: [
          "GESTION MARCHÉ ÉTUDES"
        ]
      },
      {
        id: "D7",
        title: "NÉGOCIATION DU MARCHÉ D'ÉTUDES / NEGOCIATION MARCHÉ D'ÉTUDES",
        tasks: [
          "NÉGOCIATION MARCHÉ D'ÉTUDES"
        ]
      }
    ]
  },
  {
    id: "E",
    title: "ESQUISSE",
    items: [
      {
        id: "E1",
        title: "ANALYSE DU PROGRAMME",
        tasks: [
          "ANALYSE PROGRAMME"
        ]
      },
      {
        id: "E2",
        title: "RECHERCHE DOCUMENTAIRE",
        tasks: [
          "RECHERCHE DOCUMENTAIRE"
        ]
      },
      {
        id: "E3",
        title: "CONTENU DU DOSSIER ESQUISSE",
        tasks: [
          "DOSSIER ESQUISSE"
        ]
      },
      {
        id: "E4",
        title: "ACCEPTATION DE L'ESQUISSE",
        tasks: [
          "ACCEPTATION ESQUISSE"
        ]
      }
    ]
  },
  {
    id: "F",
    title: "AVANT PROJET DEFINITIF",
    items: [
      {
        id: "F1",
        title: "RELEVÉ TOPOGRAPHIQUE DU TERRAIN",
        tasks: [
          "RECHERCHE DOCUMENTAIRE"
        ]
      },
      {
        id: "F2",
        title: "RECONNAISSANCE DE SOL / ÉTUDE DE SOL",
        tasks: [
          "ÉTUDE DE SOL"
        ]
      },
      {
        id: "F3",
        title: "ÉTUDE DE VIABILITÉ ET ENQUÊTES / ÉTUDE DE VIABILITÉ/ENQUÊTE",
        tasks: [
          "ÉTUDE DE VIABILITÉ/ENQUÊTE"
        ]
      },
      {
        id: "F4",
        title: "DÉCLARATION DE PROJET DE TRAVAUX RELATIVE AUX RÉSEAUX / DECLARATION TRAVAUX RÉSEAUX",
        tasks: [
          "DECLARATION TRAVAUX RÉSEAUX",
          "REPONSE DECLARATION TRAVAUX RÉSEAUX"
        ]
      },
      {
        id: "F5",
        title: "CONCEPTION ARCHITECTURALE ET TECHNIQUE / CONCEPTION ARCHITECTURALE",
        tasks: [
          "CONCEPTION ARCHITECTURALE"
        ]
      },
      {
        id: "F6",
        title: "INTÉGRATION DES PRINCIPES DE QUALITÉ ENVIRONNEMENTALE / SYSTÈME MANAGEMENT ENVIRONNEMENTAL",
        tasks: [
          "SYSTÈME MANAGEMENT ENVIRONNEMENTAL"
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
        title: "NOTICE DESCRIPTIVE SOMMAIRE / NOTE DESCRIPTIVE SOMMAIRE",
        tasks: [
          "NOTE DESCRIPTIVE SOMMAIRE"
        ]
      },
      {
        id: "F9",
        title: "ADAPTATION AU SOL ET À L'ENVIRONNEMENT / ADAPTATION SOL/ENVIRONNEMENT",
        tasks: [
          "ADAPTATION SOL/ENVIRONNEMENT"
        ]
      },
      {
        id: "F10",
        title: "BUDGET PRÉVISIONNEL",
        tasks: [
          "BUDGET PREVISIONNEL"
        ]
      },
      {
        id: "F11",
        title: "ACCEPTATION DES ÉTUDES D'AVANT-PROJET / ACCEPTATION AVANT PROJET",
        tasks: [
          "AVANT PROJET DÉFINITIF",
          "AVIS AVANT PROJET DÉFINITIF"
        ]
      }
    ]
  },
  {
    id: "G",
    title: "PERMIS",
    items: [
      {
        id: "G1",
        title: "CHAMP D'APPLICATION DU PERMIS DE CONSTRUIRE / CHAMP D'APPLICATION PERMIS",
        tasks: [
          "CHAMP D'APPLICATION PERMIS"
        ]
      },
      {
        id: "G2",
        title: "DEMANDE ET DÉPÔT DU PERMIS DE CONSTRUIRE / DÉPÔT PERMIS",
        tasks: [
          "DEPÔT PERMIS"
        ]
      },
      {
        id: "G3",
        title: "INSTRUCTION ET OBTENTION DU PERMIS DE CONSTRUIRE / INSTRUCTION PERMIS",
        tasks: [
          "AVIS DE RÉCEPTION",
          "DÉCISION"
        ]
      },
      {
        id: "G4",
        title: "DEMANDE ET DÉPÔT DU PERMIS DE DÉMOLIR / DÉPÔT PERMIS DE DÉMOLIR",
        tasks: [
          "PERMIS DE DÉMOLIR"
        ]
      },
      {
        id: "G5",
        title: "INSTRUCTION ET OBTENTION DU PERMIS DE DÉMOLIR / INSTRUCTION PERMIS DE DÉMOLIR",
        tasks: [
          "AVIS DE RÉCEPTION",
          "DÉCISION"
        ]
      },
      {
        id: "G6",
        title: "PANNEAU D'AFFICHAGE DU PERMIS DE CONSTRUIRE / PANNEAU AFFICHAGE CHANTIER",
        tasks: [
          "MAQUETTE PANNEAU CHANTIER"
        ]
      },
      {
        id: "G7",
        title: "DÉCLARATION PRÉALABLE",
        tasks: [
          "DÉCLARATION PRÉALABLE"
        ]
      }
    ]
  },
  {
    id: "H",
    title: "PROJET",
    items: [
      {
        id: "H1",
        title: "ÉTUDE DE LA STRUCTURE ET DE L'ENVELOPPE / ÉTUDE STRUCTURE/ENVELOPPE",
        tasks: [
          "ÉTUDE STRUCTURE",
          "ÉTUDE ENVELOPPE"
        ]
      },
      {
        id: "H2",
        title: "ÉTUDE ET ORGANISATION DES ESPACES INTÉRIEURS / ÉTUDE ESPACE INTÉRIEUR",
        tasks: [
          "ÉTUDE ESPACE INTÉRIEUR"
        ]
      },
      {
        id: "H3",
        title: "ÉTUDE DES ÉQUIPEMENTS TECHNIQUES / ÉTUDE ÉQUIPEMENTS TECHNIQUES",
        tasks: [
          "ÉTUDE ÉQUIPEMENTS TECHNIQUES"
        ]
      },
      {
        id: "H4",
        title: "ÉTUDE DES VRD ET DES AMÉNAGEMENTS EXTÉRIEURS / ÉTUDE DES VOIRIES RESEAUX DIVERS",
        tasks: [
          "ÉTUDE DES VOIRIES RESEAUX DIVERS"
        ]
      },
      {
        id: "H5",
        title: "CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES (CCTP) / CAHIER DES CLAUSES TECHNIQUES",
        tasks: [
          "CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES"
        ]
      },
      {
        id: "H6",
        title: "LIMITES DE PRESTATIONS INTERENTREPRISES / LIMITES PRESTATION INTER ENTREPRISES",
        tasks: [
          "LIMITES PRESTATION INTER ENTREPRISES"
        ]
      },
      {
        id: "H7",
        title: "CONFORMITÉ DU PROJET À LA RÉGLEMENTATION / CONFORMITÉ DU PROJET",
        tasks: [
          "CONFORMITÉ DU PROJET"
        ]
      },
      {
        id: "H8",
        title: "CELLULE DE SYNTHÈSE",
        tasks: [
          "CELLULES DE SYNTHÈSE"
        ]
      },
      {
        id: "H9",
        title: "DOCUMENTS FINANCIERS",
        tasks: [
          "DOCUMENTS FINANCIERS"
        ]
      },
      {
        id: "H10",
        title: "ESTIMATION DU COÛT / COÛTS PRÉVISIONNELS",
        tasks: [
          "COÛTS PRÉVISIONNELS"
        ]
      },
      {
        id: "H11",
        title: "ACCEPTATION DU PROJET PAR LE MAÎTRE DE L'OUVRAGE / ACCEPTATION PROJET",
        tasks: [
          "ACCEPTATION PROJET"
        ]
      },
      {
        id: "H12",
        title: "NORMALISATION EUROPEENNE DES PRODUITS / NORMALISATION PRODUITS",
        tasks: [
          "NORMALISATION PRODUITS"
        ]
      },
      {
        id: "H13",
        title: "RÉGLEMENTATION SPÉCIFIQUE DES ERP / REGLEMENTATION INCENDIE",
        tasks: [
          "REGLEMENTATION INCENDIE"
        ]
      },
      {
        id: "H14",
        title: "RÉGLEMENTATION SPÉCIFIQUE DES LOCAUX DE TRAVAIL / RÉGLEMENTATION LOCAUX TRAVAIL",
        tasks: [
          "RÉGLEMENTATION LOCAUX TRAVAIL"
        ]
      },
      {
        id: "H15",
        title: "PLAN GÉNÉRAL DE COORDINATION EN MATIÈRE DE SÉCURITÉ ET DE PROTECTION DE LA SANTÉ / PLAN GÉNÉRAL DE COORDINATION SPS",
        tasks: [
          "RÉGLEMENTATION LOCAUX TRAVAIL"
        ]
      }
    ]
  }
];

// Structure du projet - Phase réalisation
const realizationStructure = [
  {
    id: "I",
    title: "PRÉPARATION DU MARCHÉ",
    items: [
      {
        id: "I1",
        title: "FORME DU MARCHÉ",
        tasks: [
          "FORME DU MARCHÉ"
        ]
      },
      {
        id: "I2",
        title: "CONTENU DU MARCHÉ",
        tasks: [
          "CONTENU DU MARCHÉ"
        ]
      },
      {
        id: "I3",
        title: "ORGANE DE DÉCISION",
        tasks: [
          "ORGANE DE DÉCISION"
        ]
      },
      {
        id: "I4",
        title: "MODE DE PASSATION",
        tasks: [
          "MODE DE PASSATION"
        ]
      },
      {
        id: "I5",
        title: "PUBLICITÉ DE CONSULTATION",
        tasks: [
          "PUBLICITÉ DE CONSULTATION"
        ]
      },
      {
        id: "I6",
        title: "RÈGLEMENT CONSULTATION",
        tasks: [
          "RÈGLEMENT CONSULTATION"
        ]
      },
      {
        id: "I7",
        title: "DOSSIER CONSULTATION",
        tasks: [
          "DOSSIER CONSULTATION"
        ]
      },
      {
        id: "I8",
        title: "ACTE D'ENGAGEMENT",
        tasks: [
          "ACTE D'ENGAGEMENT"
        ]
      },
      {
        id: "I9",
        title: "CAHIER CLAUSES ADMINISTRATIVES PARTICULIÈRES",
        tasks: [
          "CAHIER DES CLAUSES ADMINISTRATIVES PARTICULIÈRES"
        ]
      },
      {
        id: "I10",
        title: "DÉFINITION DÉLAIS",
        tasks: [
          "DÉFINITION DÉLAIS"
        ]
      },
      {
        id: "I11",
        title: "REGLEMENT CISSCT",
        tasks: [
          "RÈGLEMENT CISSCT"
        ]
      },
      {
        id: "I12",
        title: "PLAN INSTALLATION CHANTIER",
        tasks: [
          "PLANS INSTALLATION CHANTIER"
        ]
      },
      {
        id: "I13",
        title: "CHARTE CHANTIER VERT",
        tasks: [
          "CHARTE CHANTIER VERT"
        ]
      },
      {
        id: "I14",
        title: "ASSURANCES",
        tasks: [
          "ASSURANCES"
        ]
      },
      {
        id: "I15",
        title: "LANCEMENT CONSULTATION",
        tasks: [
          "LANCEMENT CONSULTATION"
        ]
      },
      {
        id: "I16",
        title: "DÉMATÉRIALISATION PROCÉDURE",
        tasks: [
          "DÉMATÉRIALISATION PROCÉDURE"
        ]
      },
      {
        id: "I17",
        title: "PLAN ASSURANCE QUALITÉ",
        tasks: [
          "PLAN ASSURANCE QUALITÉ"
        ]
      }
    ]
  },
  {
    id: "J",
    title: "CONSULTATION DES ENTREPRISES",
    items: [
      {
        id: "J1",
        title: "REMISE CANDIDATURE",
        tasks: [
          "REMISE CANDIDATURE"
        ]
      },
      {
        id: "J2",
        title: "REMISE OFFRE",
        tasks: [
          "REMISE OFFRE"
        ]
      },
      {
        id: "J3",
        title: "MÉMOIRE TECHNIQUE",
        tasks: [
          "MÉMOIRE TECHNIQUE"
        ]
      },
      {
        id: "J4",
        title: "COTRAITANCE/SOUS-TRAITANCE",
        tasks: [
          "COTRAITANCE/SOUS-TRAITANCE"
        ]
      },
      {
        id: "J5",
        title: "CONDITIONS RECEPTION OFFRE",
        tasks: [
          "CONDITIONS RECEPTION OFFRE"
        ]
      },
      {
        id: "J6",
        title: "ANALYSE CANDIDATURE",
        tasks: [
          "ANALYSE CANDIDATURE"
        ]
      },
      {
        id: "J7",
        title: "ANALYSE OFFRE",
        tasks: [
          "ANALYSE OFFRE"
        ]
      },
      {
        id: "J8",
        title: "PONDÉRATION CRITÈRES",
        tasks: [
          "PONDÉRATION CRITÈRES"
        ]
      },
      {
        id: "J9",
        title: "MISE AU POINT MARCHÉ",
        tasks: [
          "MISE AU POINT MARCHÉ"
        ]
      }
    ]
  },
  {
    id: "K",
    title: "DÉMARRAGE ET PRÉPARATION DU CHANTIER",
    items: [
      {
        id: "K1",
        title: "RÉUNION COORDINATION TECHNIQUE",
        tasks: [
          "RÉUNION COORDINATION TECHNIQUE"
        ]
      },
      {
        id: "K2",
        title: "REGISTRE CHANTIER",
        tasks: [
          "REGISTRE CHANTIER"
        ]
      },
      {
        id: "K3",
        title: "GESTION SOUS-TRAITANTS",
        tasks: [
          "GESTION SOUS-TRAITANTS"
        ]
      },
      {
        id: "K4",
        title: "GESTION SOUS-TRAITANTS INDIRECTS",
        tasks: [
          "GESTION SOUS-TRAITANTS INDIRECTS"
        ]
      },
      {
        id: "K5",
        title: "TRAVAIL DISSIMULÉ",
        tasks: [
          "TRAVAIL DISSIMULÉ"
        ]
      },
      {
        id: "K6",
        title: "PLANS EXECUTION OUVRAGES",
        tasks: [
          "PLANS EXECUTION OUVRAGES"
        ]
      },
      {
        id: "K7",
        title: "IMPLANTATION OUVRAGES",
        tasks: [
          "IMPLANTATION OUVRAGES"
        ]
      },
      {
        id: "K8",
        title: "IMPLANTATION VRD",
        tasks: [
          "IMPLANTATION VRD"
        ]
      },
      {
        id: "K9",
        title: "INSTALLATION CHANTIER",
        tasks: [
          "INSTALLATION CHANTIER"
        ]
      },
      {
        id: "K10",
        title: "PLAN PARTICULIER SÉCURITÉ",
        tasks: [
          "PLAN PARTICULIER SÉCURITÉ"
        ]
      },
      {
        id: "K11",
        title: "DÉCLARATION OUVERTURE CHANTIER",
        tasks: [
          "DÉCLARATION OUVERTURE CHANTIER"
        ]
      },
      {
        id: "K12",
        title: "DÉCLARATIONS DIVERSES",
        tasks: [
          "DÉCLARATIONS DIVERSES"
        ]
      },
      {
        id: "K13",
        title: "NATURE ANIMATION RÉUNION",
        tasks: [
          "NATURE ANIMATION RÉUNION"
        ]
      },
      {
        id: "K14",
        title: "RÉUNION CHANTIER",
        tasks: [
          "RÉUNION CHANTIER"
        ]
      },
      {
        id: "K15",
        title: "PANNEAU CHANTIER",
        tasks: [
          "PANNEAU CHANTIER"
        ]
      },
      {
        id: "K16",
        title: "REGISTRE JOURNAL",
        tasks: [
          "REGISTRE JOURNAL"
        ]
      },
      {
        id: "K17",
        title: "CHANTIER RÉHABILITATION",
        tasks: [
          "CHANTIER RÉHABILITATION"
        ]
      }
    ]
  },
  {
    id: "L",
    title: "ORGANISATION DU CHANTIER",
    items: [
      {
        id: "L1",
        title: "ORGANIGRAMME CHANTIER",
        tasks: [
          "ORGANIGRAMME CHANTIER"
        ]
      },
      {
        id: "L2",
        title: "VÉRIFICATION AVANT DÉMARRAGE TRAVAUX",
        tasks: [
          "VÉRIFICATION AVANT DÉMARRAGE TRAVAUX"
        ]
      },
      {
        id: "L3",
        title: "ORGANISATION BUREAU CHANTIER",
        tasks: [
          "ORGANISATION BUREAU TRAVAUX"
        ]
      },
      {
        id: "L4",
        title: "CALENDRIER ÉTUDE EXÉCUTION",
        tasks: [
          "CALENDRIER ÉTUDE EXÉCUTION"
        ]
      },
      {
        id: "L5",
        title: "CALENDRIER TRAVAUX",
        tasks: [
          "CALENDRIER TRAVAUX"
        ]
      },
      {
        id: "L6",
        title: "TRAVAUX ALLOTIS",
        tasks: [
          "TRAVAUX ALLOTIS"
        ]
      },
      {
        id: "L7",
        title: "ÉCHÉANCIER ACOMPTES",
        tasks: [
          "ÉCHÉANCIER ACOMPTES"
        ]
      }
    ]
  },
  {
    id: "M",
    title: "SUIVI DE CHANTIER",
    items: [
      {
        id: "M1",
        title: "RÈGLEMENT CHANTIER",
        tasks: [
          "RÈGLEMENT CHANTIER"
        ]
      },
      {
        id: "M2",
        title: "TRANSMISSION COURRIER/SITUATION TRAVAUX",
        tasks: [
          "TRANSMISSION COURRIER/SITUATION TRAVAUX"
        ]
      },
      {
        id: "M3",
        title: "ACCÈS CHANTIER",
        tasks: [
          "ACCÈS CHANTIER"
        ]
      },
      {
        id: "M4",
        title: "MISE À JOUR PLANS EXÉCUTION",
        tasks: [
          "MISE À JOUR PLANS EXÉCUTION"
        ]
      },
      {
        id: "M5",
        title: "RÉUNION CHANTIER",
        tasks: [
          "RÉUNION CHANTIER"
        ]
      },
      {
        id: "M6",
        title: "PROCÈS VERBAL RÉUNION",
        tasks: [
          "PROCÈS VERBAL RÉUNION"
        ]
      },
      {
        id: "M7",
        title: "CISSCT CONDITIONS TRAVAIL",
        tasks: [
          "CISSCT CONDITIONS TRAVAIL"
        ]
      },
      {
        id: "M8",
        title: "SERVICES TECHNIQUES EXTÉRIEURS",
        tasks: [
          "SERVICES TECHNIQUES EXTÉRIEURS"
        ]
      },
      {
        id: "M9",
        title: "ÉCHANTILLON/PROTOTYPE",
        tasks: [
          "ÉCHANTILLON/PROTOTYPE"
        ]
      },
      {
        id: "M10",
        title: "APPARTEMENT/CELLULE TÉMOIN",
        tasks: [
          "APPARTEMENT/CELLULE TÉMOIN"
        ]
      },
      {
        id: "M11",
        title: "GESTION CLÉS",
        tasks: [
          "GESTION CLÉS"
        ]
      },
      {
        id: "M12",
        title: "GESTION DÉCHETS CHANTIER",
        tasks: [
          "GESTION DÉCHETS CHANTIER"
        ]
      },
      {
        id: "M13",
        title: "CONSTAT CHANTIER",
        tasks: [
          "CONSTAT CHANTIER"
        ]
      },
      {
        id: "M14",
        title: "ESSAIS TECHNIQUES",
        tasks: [
          "ESSAIS TECHNIQUES"
        ]
      },
      {
        id: "M15",
        title: "REPLIEMENT INSTALLATION CHANTIER",
        tasks: [
          "REPLIEMENT INSTALLATION CHANTIER"
        ]
      },
      {
        id: "M16",
        title: "RETARD EXÉCUTION",
        tasks: [
          "RETARD EXÉCUTION"
        ]
      }
    ]
  },
  {
    id: "N",
    title: "GESTION FINANCIÈRE",
    items: [
      {
        id: "N1",
        title: "GARANTIE DE PAIEMENT",
        tasks: [
          "GARANTIE DE PAIEMENT"
        ]
      },
      {
        id: "N2",
        title: "CONVENTION COMPTE PRO-RATA",
        tasks: [
          "CONVENTION COMPTE PRO-RATA"
        ]
      },
      {
        id: "N3",
        title: "GESTION COMPTE PRO-RATA",
        tasks: [
          "GESTION COMPTE PRO-RATA"
        ]
      },
      {
        id: "N4",
        title: "GESTION ACOMPTES",
        tasks: [
          "GESTION ACOMPTES"
        ]
      },
      {
        id: "N5",
        title: "ENTREPRISE DÉFAILLANTE",
        tasks: [
          "ENTREPRISE DÉFAILLANTE"
        ]
      },
      {
        id: "N6",
        title: "GESTION TRAVAUX MODIFICATIFS",
        tasks: [
          "GESTION TRAVAUX MODIFICATIFS"
        ]
      },
      {
        id: "N7",
        title: "CONTENTIEUX EXÉCUTION",
        tasks: [
          "CONTENTIEUX EXÉCUTION"
        ]
      },
      {
        id: "N8",
        title: "RÉSILIATION MARCHÉ",
        tasks: [
          "RÉSILIATION MARCHÉ"
        ]
      },
      {
        id: "N9",
        title: "INCIDENCE FINANCIÈRE VENTE",
        tasks: [
          "INCIDENCE FINANCIÈRE VENTE"
        ]
      }
    ]
  },
  {
    id: "O",
    title: "RÉCEPTION DES TRAVAUX",
    items: [
      {
        id: "O1",
        title: "DOSSIER OUVRAGES EXÉCUTÉS",
        tasks: [
          "DOSSIER OUVRAGES EXÉCUTÉS"
        ]
      },
      {
        id: "O2",
        title: "DOSSIER INTERVENTION ULTÉRIEURE",
        tasks: [
          "DOSSIER INTERVENTION ULTÉRIEURE"
        ]
      },
      {
        id: "O3",
        title: "NETTOYAGE CHANTIER",
        tasks: [
          "NETTOYAGE CHANTIER"
        ]
      },
      {
        id: "O4",
        title: "RÉCEPTION TRAVAUX SERVICES PUBLICS",
        tasks: [
          "RÉCEPTION TRAVAUX SERVICES PUBLICS"
        ]
      },
      {
        id: "O5",
        title: "OPERATIONS PRÉALABLE RÉCEPTION",
        tasks: [
          "OPERATIONS PRÉALABLE RÉCEPTION"
        ]
      },
      {
        id: "O6",
        title: "RÉCEPTION MAÎTRE D'OUVRAGE",
        tasks: [
          "RÉCEPTION MAÎTRE D'OUVRAGE"
        ]
      },
      {
        id: "O7",
        title: "LEVÉE RÉSERVES",
        tasks: [
          "LEVÉE RÉSERVES"
        ]
      },
      {
        id: "O8",
        title: "RÉCAPITULATIF OPÉRATION",
        tasks: [
          "RÉCAPITULATIF OPÉRATION"
        ]
      }
    ]
  },
  {
    id: "P",
    title: "CLÔTURE DU MARCHÉ",
    items: [
      {
        id: "P1",
        title: "COLLECTE DIFFÉRENTS QUITUS",
        tasks: [
          "COLLECTE DIFFÉRENTS QUITUS"
        ]
      },
      {
        id: "P2",
        title: "DÉCOMPTE GÉNÉRAL DÉFINITIF",
        tasks: [
          "DÉCOMPTE GÉNÉRAL DÉFINITIF"
        ]
      },
      {
        id: "P3",
        title: "RATIOS COÛTS TRAVAUX",
        tasks: [
          "RATIOS COÛTS TRAVAUX"
        ]
      },
      {
        id: "P4",
        title: "SOLDE DES MARCHÉS MAÎTRISE D'OEUVRE",
        tasks: [
          "SOLDE DES MARCHÉS MAÎTRISE D'OEUVRE"
        ]
      },
      {
        id: "P5",
        title: "ARCHIVE DOCUMENTS",
        tasks: [
          "ARCHIVE DOCUMENTS"
        ]
      },
      {
        id: "P6",
        title: "SÛRETÉS FINANCIÈRES",
        tasks: [
          "SÛRETÉS FINANCIÈRES"
        ]
      }
    ]
  }
];

// Extensions de fichiers autorisées
const fileExtensions = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc, .docx)' },
  { value: 'xls', label: 'Excel (.xls, .xlsx)' },
  { value: 'ppt', label: 'PowerPoint (.ppt, .pptx)' },
  { value: 'txt', label: 'Texte (.txt)' },
  { value: 'jpg', label: 'Image JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'Image PNG (.png)' },
  { value: 'zip', label: 'Archive ZIP (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Autre' }
];

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, deleteData, insertData, updateData, getUsers } = useSupabase();
  const { user } = useAuth();
  const { notifyTaskAssigned, notifyProjectAdded } = useNotificationTriggers();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [phaseStructure, setPhaseStructure] = useState<'conception' | 'realisation'>('conception');
  
  // État pour la gestion de l'assignation de tâches
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
  
  // États pour la gestion des membres du projet
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [allIntervenants, setAllIntervenants] = useState<IntervenantWithDetails[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAllIntervenants, setLoadingAllIntervenants] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedIntervenants, setSelectedIntervenants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  
  // États pour la gestion de la structure
  const [customProjectStructure, setCustomProjectStructure] = useState(projectStructure);
  const [customRealizationStructure, setCustomRealizationStructure] = useState(realizationStructure);
  const [isDeleteStepDialogOpen, setIsDeleteStepDialogOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<{type: 'section' | 'subsection', sectionId: string, subsectionId?: string, phase: 'conception' | 'realisation'} | null>(null);
  
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
  
  // Charger les assignations de tâches existantes et les intervenants
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
    
    // Charger aussi les intervenants pour l'affichage des noms
    if (intervenants.length === 0) {
      fetchIntervenants();
    }
  }, [id, fetchData, toast]);
  
    // Charger les intervenants disponibles
  const fetchIntervenants = async () => {
    setLoadingIntervenants(true);
    try {
      console.log('Début du chargement des intervenants...');
      
      // Utiliser la même méthode que dans la page Intervenants - récupérer depuis auth.users
      const userData = await getUsers();
      
      if (userData && userData.users) {
        console.log('Données utilisateurs récupérées:', userData.users);
        
        // Transformer les données des utilisateurs en format Intervenant
        const formattedUsers = userData.users
          .filter((user: any) => {
            // Exclure explicitement admin@aphs et tout utilisateur avec le rôle admin
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email?.toLowerCase() === 'admin@aphs.fr' || 
                                user.email?.toLowerCase() === 'admin@aphs.com' || 
                                user.email?.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail && !user.banned;
          })
          .map((user: any) => ({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || 'Prénom',
            last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || 'Nom',
            role: user.user_metadata?.role || 'intervenant',
            specialty: user.user_metadata?.specialty || 'Non spécifié'
          }));
        
        console.log('Intervenants transformés:', formattedUsers);
        setIntervenants(formattedUsers);
        
        if (formattedUsers.length === 0) {
          console.warn('Aucun intervenant trouvé');
          toast({
            title: "Information",
            description: "Aucun intervenant actif trouvé dans la base de données",
            variant: "default",
          });
        } else {
          console.log(`${formattedUsers.length} intervenants chargés avec succès`);
        }
      } else {
        console.warn('Aucune donnée utilisateur récupérée');
        toast({
          title: "Information",
          description: "Aucun utilisateur trouvé dans la base de données",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des intervenants:', error);
      
      // Essayer une requête de fallback avec la table profiles
      try {
        console.log('Tentative de fallback avec la table profiles...');
        const fallbackData = await fetchData<any>('profiles', {
          columns: 'user_id,first_name,last_name,email,role,specialty',
          filters: [{ column: 'role', operator: 'neq', value: 'admin' }]
        });
        
        const fallbackTransformed = fallbackData?.map(profile => ({
          id: profile.user_id,
          email: profile.email || '',
          first_name: profile.first_name || 'Prénom',
          last_name: profile.last_name || 'Nom',
          role: profile.role || 'intervenant',
          specialty: profile.specialty || 'Non spécifié'
        })) || [];
        
        setIntervenants(fallbackTransformed);
        console.log('Fallback réussi:', fallbackTransformed);
      } catch (fallbackError) {
        console.error('Erreur de fallback aussi:', fallbackError);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des intervenants. Vérifiez les permissions de la base de données.",
          variant: "destructive",
        });
      }
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
        title: "Erreur",
        description: "Veuillez sélectionner un intervenant",
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.deadline) {
      toast({
        title: "Erreur",
        description: "Veuillez définir une date limite",
        variant: "destructive",
      });
      return;
    }
    
    if (!assignmentForm.validation_deadline) {
      toast({
        title: "Erreur",
        description: "Veuillez définir une date limite pour la validation",
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un validateur",
        variant: "destructive",
      });
      return;
    }
    
    if (assignmentForm.validators.includes(assignmentForm.assigned_to)) {
      toast({
        title: "Erreur",
        description: "L'intervenant assigné ne peut pas être validateur",
        variant: "destructive",
      });
      return;
    }
    
    // Vérifier si la tâche est déjà assignée
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
        // Mettre à jour l'assignation existante
        result = await updateData('task_assignments', {
          id: existingAssignment.id,
          ...assignmentData
        });
      } else {
        // Créer une nouvelle assignation
        result = await insertData('task_assignments', assignmentData);
      }
      
      if (result) {
        toast({
          title: "Succès",
          description: existingAssignment 
            ? "L'assignation a été mise à jour avec succès" 
            : "La tâche a été assignée avec succès",
        });

        // Envoyer une notification à l'intervenant assigné (seulement pour les nouvelles assignations)
        if (!existingAssignment) {
          try {
            const adminProfile = await fetchData<{first_name?: string; last_name?: string; email?: string}>('profiles', {
              columns: 'first_name, last_name, email',
              filters: [{ column: 'user_id', operator: 'eq', value: user?.id }]
            });
            
            const profile = adminProfile?.[0];
            const adminName = profile && (profile.first_name || profile.last_name)
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : (profile?.email || user?.email || 'Admin');

            await notifyTaskAssigned(
              assignmentForm.assigned_to,
              selectedTask.taskName,
              project.name,
              adminName
            );
          } catch (notificationError) {
            console.error('Erreur lors de l\'envoi de la notification:', notificationError);
            // Ne pas faire échouer l'assignation si la notification échoue
          }
        }
        
        // Recharger les assignations
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
      console.error('Erreur lors de l\'assignation de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner la tâche",
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
          title: "Succès",
          description: "Projet supprimé avec succès",
        });
        navigate('/dashboard/projets');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
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
      : 'Intervenant inconnu';
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
      // Supprimer l'assignation
      const success = await deleteData('task_assignments', taskToUnassign.id as string);
      
      if (success) {
        toast({
          title: "Succès",
          description: "La tâche a été désassignée avec succès",
        });
        
        // Mettre à jour la liste des assignations en retirant celle qui a été supprimée
        setTaskAssignments(prev => prev.filter(t => t.id !== taskToUnassign.id));
        setIsUnassignDialogOpen(false);
      }
    } catch (error) {
      console.error('Erreur lors de la désassignation de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désassigner la tâche",
        variant: "destructive",
      });
    }
  };
  
  // Calculer le nombre total de tâches disponibles dans la structure du projet
  const getTotalAvailableTasks = () => {
    let total = 0;
    
    // Compter les tâches de conception
    projectStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    
    // Compter les tâches de réalisation
    realizationStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    
    return total;
  };

  // Calculer la progression globale du projet (corrigée)
  const calculateGlobalProgress = () => {
    const totalTasks = getTotalAvailableTasks();
    const completedTasks = taskAssignments.filter(assignment => assignment.status === 'validated').length;
    
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };
  
  // Obtenir la couleur pour un statut
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
  
  // Obtenir le libellé pour un statut
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      assigned: 'Assignée',
      in_progress: 'En cours',
      submitted: 'Soumise',
      validated: 'Validée',
      rejected: 'Rejetée'
    };
    return statusMap[status] || 'Inconnu';
  };
  
  // Valider une tâche en tant qu'admin
  const handleAdminValidateTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: 'Validé par administrateur',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Succès",
          description: "La tâche a été validée avec succès",
        });
        
        // Mettre à jour la liste des assignations
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'validated',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Validé par administrateur',
                  validated_by: user?.id,
                  updated_at: new Date().toISOString()
                } 
              : t
          )
        );
        
        // Mettre à jour les détails de la tâche sélectionnée
        setSelectedTaskDetails({
          ...selectedTaskDetails,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validation_comment: 'Validé par administrateur',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erreur lors de la validation de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la tâche",
        variant: "destructive",
      });
    }
  };
  
  // Rejeter une tâche en tant qu'admin
  const handleAdminRejectTask = async () => {
    if (!selectedTaskDetails) return;
    
    try {
      const updated = await updateData('task_assignments', {
        id: selectedTaskDetails.id,
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validation_comment: 'Rejeté par administrateur',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      if (updated) {
        toast({
          title: "Succès",
          description: "La tâche a été rejetée avec succès",
        });
        
        // Mettre à jour la liste des assignations
        setTaskAssignments(prev => 
          prev.map(t => 
            t.id === selectedTaskDetails.id 
              ? { 
                  ...t, 
                  status: 'rejected',
                  validated_at: new Date().toISOString(),
                  validation_comment: 'Rejeté par administrateur',
                  validated_by: user?.id,
                  updated_at: new Date().toISOString()
                } 
              : t
          )
        );
        
        // Mettre à jour les détails de la tâche sélectionnée
        setSelectedTaskDetails({
          ...selectedTaskDetails,
          status: 'rejected',
          validated_at: new Date().toISOString(),
          validation_comment: 'Rejeté par administrateur',
          validated_by: user?.id,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erreur lors du rejet de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la tâche",
        variant: "destructive",
      });
    }
  };
  
  // Charger les membres du projet
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!id) return;
      
      setLoadingMembers(true);
      try {
        const data = await fetchData<ProjectMember>('membre', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: id }]
        });
        
        if (data) {
          setProjectMembers(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des membres du projet:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les membres du projet",
          variant: "destructive",
        });
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchProjectMembers();
    
    // Charger aussi la liste de tous les intervenants pour l'affichage des noms
    if (allIntervenants.length === 0) {
      fetchAllIntervenants();
    }
  }, [id, fetchData, toast]);
  
  // Charger tous les intervenants disponibles
  const fetchAllIntervenants = async () => {
    setLoadingAllIntervenants(true);
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        const formattedUsers: IntervenantWithDetails[] = userData.users
          .filter((user: any) => {
            // Exclure explicitement admin@aphs et tout utilisateur avec le rôle admin
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email?.toLowerCase() === 'admin@aphs.fr' || 
                                user.email?.toLowerCase() === 'admin@aphs.com' || 
                                user.email?.toLowerCase() === 'admin@aphs';
            return !isAdmin && !isAdminEmail && !user.banned;
          })
          .map((user: any) => ({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || '',
            last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            role: user.user_metadata?.role || 'intervenant',
            specialty: user.user_metadata?.specialty || ''
          }));
        
        setAllIntervenants(formattedUsers);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des intervenants:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des intervenants",
        variant: "destructive",
      });
    } finally {
      setLoadingAllIntervenants(false);
    }
  };
  
  // Ouvrir le dialogue de gestion des membres
  const handleOpenMembersDialog = () => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent gérer les membres du projet",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedIntervenants([]);
    setSearchQuery('');
    if (allIntervenants.length === 0) {
      fetchAllIntervenants();
    }
    setIsMembersDialogOpen(true);
  };
  
  // Ajouter des membres au projet
  const handleAddMembers = async () => {
    if (!id || selectedIntervenants.length === 0) return;
    
    try {
      const membersToAdd = selectedIntervenants.map(userId => ({
        project_id: id,
        user_id: userId,
        role: 'membre',
        added_by: user?.id,
        added_at: new Date().toISOString()
      }));
      
      for (const member of membersToAdd) {
        await insertData<ProjectMember>('membre', member);
      }
      
      toast({
        title: "Succès",
        description: `${selectedIntervenants.length} membre(s) ajouté(s) au projet`,
      });

      // Envoyer des notifications aux nouveaux membres
      try {
        const adminProfile = await fetchData<{first_name?: string; last_name?: string; email?: string}>('profiles', {
          columns: 'first_name, last_name, email',
          filters: [{ column: 'user_id', operator: 'eq', value: user?.id }]
        });
        
        const profile = adminProfile?.[0];
        const adminName = profile && (profile.first_name || profile.last_name)
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : (profile?.email || user?.email || 'Admin');

        // Envoyer une notification à chaque nouveau membre
        for (const memberId of selectedIntervenants) {
          await notifyProjectAdded(
            memberId,
            project?.name || 'Projet',
            adminName
          );
        }
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi des notifications:', notificationError);
        // Ne pas faire échouer l'ajout si les notifications échouent
      }
      
      // Recharger les membres du projet
      const updatedMembers = await fetchData<ProjectMember>('membre', {
        columns: '*',
        filters: [{ column: 'project_id', operator: 'eq', value: id }]
      });
      
      if (updatedMembers) {
        setProjectMembers(updatedMembers);
      }
      
      setIsMembersDialogOpen(false);
      setSelectedIntervenants([]);
    } catch (error) {
      console.error('Erreur lors de l\'ajout des membres:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les membres au projet",
        variant: "destructive",
      });
    }
  };
  
  // Préparer la suppression d'un membre
  const handleRemoveMember = (member: ProjectMember) => {
    setMemberToRemove(member);
    setIsRemoveMemberDialogOpen(true);
  };
  
  // Confirmer la suppression d'un membre
  const confirmRemoveMember = async () => {
    if (!memberToRemove?.id) return;
    
    try {
      const success = await deleteData('membre', memberToRemove.id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "Membre retiré du projet avec succès",
        });
        
        // Mettre à jour la liste des membres
        setProjectMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le membre du projet",
        variant: "destructive",
      });
    } finally {
      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    }
  };
  
  // Obtenir les informations d'un intervenant
  const getIntervenantInfo = (userId: string) => {
    return allIntervenants.find(i => i.id === userId);
  };
  
  // Obtenir les initiales d'un nom
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  // Filtrer les intervenants pour la recherche
  const filteredIntervenants = allIntervenants.filter(intervenant => {
    const fullName = `${intervenant.first_name} ${intervenant.last_name}`.toLowerCase();
    const email = intervenant.email.toLowerCase();
    const specialty = intervenant.specialty?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query) || specialty.includes(query);
  });
  
  // Vérifier si un intervenant est déjà membre du projet
  const isAlreadyMember = (userId: string) => {
    return projectMembers.some(member => member.user_id === userId);
  };
  
  // Calculer la progression par section
  const calculateSectionProgress = (sectionId: string, phase: 'conception' | 'realisation') => {
    // Filtrer les assignations appartenant à cette section et phase
    const sectionAssignments = taskAssignments.filter(
      assignment => assignment.section_id === sectionId && assignment.phase_id === phase
    );
    
    if (sectionAssignments.length === 0) return 0;
    
    // Calculer simplement le pourcentage de tâches validées dans cette section
    const totalTasks = sectionAssignments.length;
    const completedTasks = sectionAssignments.filter(assignment => assignment.status === 'validated').length;
    
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Fonctions pour la gestion de la structure
  const handleDeleteStep = (type: 'section' | 'subsection', sectionId: string, phase: 'conception' | 'realisation', subsectionId?: string) => {
    setStepToDelete({ type, sectionId, subsectionId, phase });
    setIsDeleteStepDialogOpen(true);
  };

  const confirmDeleteStep = async () => {
    if (!stepToDelete) return;

    try {
      const { type, sectionId, subsectionId, phase } = stepToDelete;

      if (type === 'section') {
        // Supprimer toute une section
        if (phase === 'conception') {
          const newStructure = customProjectStructure.filter(section => section.id !== sectionId);
          setCustomProjectStructure(newStructure);
        } else {
          const newStructure = customRealizationStructure.filter(section => section.id !== sectionId);
          setCustomRealizationStructure(newStructure);
        }

        // Supprimer toutes les tâches assignées de cette section
        const tasksToDelete = taskAssignments.filter(
          task => task.section_id === sectionId && task.phase_id === phase
        );

        for (const task of tasksToDelete) {
          if (task.id) {
            await deleteData('task_assignments', task.id);
          }
        }

        // Mettre à jour la liste locale des tâches
        setTaskAssignments(prev => 
          prev.filter(task => !(task.section_id === sectionId && task.phase_id === phase))
        );

        toast({
          title: "Succès",
          description: `Section ${sectionId} supprimée avec succès`
        });

      } else if (type === 'subsection' && subsectionId) {
        // Supprimer seulement une sous-section
        if (phase === 'conception') {
          const newStructure = customProjectStructure.map(section => {
            if (section.id === sectionId) {
              return {
                ...section,
                items: section.items.filter(item => item.id !== subsectionId)
              };
            }
            return section;
          });
          setCustomProjectStructure(newStructure);
        } else {
          const newStructure = customRealizationStructure.map(section => {
            if (section.id === sectionId) {
              return {
                ...section,
                items: section.items.filter(item => item.id !== subsectionId)
              };
            }
            return section;
          });
          setCustomRealizationStructure(newStructure);
        }

        // Supprimer les tâches assignées de cette sous-section
        const tasksToDelete = taskAssignments.filter(
          task => task.section_id === sectionId && task.subsection_id === subsectionId && task.phase_id === phase
        );

        for (const task of tasksToDelete) {
          if (task.id) {
            await deleteData('task_assignments', task.id);
          }
        }

        // Mettre à jour la liste locale des tâches
        setTaskAssignments(prev => 
          prev.filter(task => !(task.section_id === sectionId && task.subsection_id === subsectionId && task.phase_id === phase))
        );

        toast({
          title: "Succès",
          description: `Sous-section ${subsectionId} supprimée avec succès`
        });
      }

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive"
      });
    } finally {
      setIsDeleteStepDialogOpen(false);
      setStepToDelete(null);
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
          {isAdmin && (
            <TabsTrigger value="members" className="data-[state=active]:bg-white">
              <Users className="h-4 w-4 mr-2" />
              Membres
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="manage-structure" className="data-[state=active]:bg-white">
              <Trash2 className="h-4 w-4 mr-2" />
              Gestion Structure
            </TabsTrigger>
          )}
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
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-lg font-medium">Description</Label>
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                {/* Statistiques du projet */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Statistiques du projet</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <Label className="text-sm font-medium text-gray-600">Statut</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${
                            project.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            project.status === 'paused' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {project.status === 'active' ? 'Actif' :
                           project.status === 'completed' ? 'Terminé' :
                           project.status === 'paused' ? 'En pause' :
                           project.status === 'cancelled' ? 'Annulé' : project.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <Label className="text-sm font-medium text-gray-600">Taux de completion</Label>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span className="font-medium text-lg">
                            {calculateGlobalProgress()}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-aphs-teal h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${calculateGlobalProgress()}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {taskAssignments.filter(t => t.status === 'validated').length} / {getTotalAvailableTasks()} tâches validées
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <Label className="text-sm font-medium text-gray-600">Intervenants assignés</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="bg-aphs-teal/10 p-2 rounded">
                          <Users className="h-5 w-5 text-aphs-teal" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900">{projectMembers.length}</span>
                          <span className="text-xs text-gray-500">membre(s) actif(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  {(phaseStructure === 'conception' ? customProjectStructure : customRealizationStructure).map((section) => (
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
        
        {/* Onglet Membres */}
        {isAdmin && (
          <TabsContent value="members" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">MEMBRES DU PROJET</h3>
                    <p className="text-gray-500 mt-1">
                      Gérez les intervenants qui ont accès à ce projet
                    </p>
                  </div>
                  <Button onClick={handleOpenMembersDialog} className="bg-aphs-teal hover:bg-aphs-navy">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Ajouter des membres
                  </Button>
                </div>
                
                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun membre</h3>
                        <p className="text-gray-500 mb-4">
                          Ce projet n'a pas encore de membres assignés.
                        </p>
                        <Button onClick={handleOpenMembersDialog} className="bg-aphs-teal hover:bg-aphs-navy">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ajouter le premier membre
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <div className="text-sm text-gray-600 mb-2">
                          {projectMembers.length} membre(s) dans ce projet
                        </div>
                        <div className="space-y-3">
                          {projectMembers.map((member) => {
                            const intervenantInfo = getIntervenantInfo(member.user_id);
                            return (
                              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-aphs-teal text-white">
                                      {intervenantInfo ? 
                                        getInitials(intervenantInfo.first_name, intervenantInfo.last_name) : 
                                        'IN'
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {intervenantInfo ? 
                                        `${intervenantInfo.first_name} ${intervenantInfo.last_name}` : 
                                        'Utilisateur inconnu'
                                      }
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {intervenantInfo?.email || 'Email non disponible'}
                                    </div>
                                    {intervenantInfo?.specialty && (
                                      <div className="text-xs text-gray-400">
                                        {intervenantInfo.specialty}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {member.role}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <UserMinus className="h-4 w-4 mr-1" />
                                    Retirer
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Onglet Gestion Structure */}
        {isAdmin && (
          <TabsContent value="manage-structure" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">GESTION DE LA STRUCTURE</h3>
                  <p className="text-gray-500 mb-4">
                    Supprimez des étapes ou sous-étapes qui ne sont pas nécessaires pour ce projet.
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <div className="bg-yellow-400 rounded-full p-1 mr-3 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">Attention</h4>
                        <p className="text-sm text-yellow-700">
                          La suppression d'une étape ou sous-étape supprimera également toutes les tâches assignées associées. Cette action est irréversible.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
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

                <div className="space-y-4">
                  <Accordion type="multiple" className="w-full">
                    {(phaseStructure === 'conception' ? customProjectStructure : customRealizationStructure).map((section) => (
                      <AccordionItem key={section.id} value={section.id} className="border rounded-md mb-4 overflow-hidden">
                        <AccordionTrigger className="bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between w-full pr-6">
                            <div className="flex items-center">
                              <span className="font-bold text-gray-700 mr-2">{section.id} -</span>
                              <span className="font-medium">{section.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStep('section', section.id, phaseStructure);
                                }}
                                className="h-8 w-8 p-0"
                                title="Supprimer cette section"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-white px-4 py-3">
                          <div className="space-y-3">
                            {section.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-700 mr-2">{item.id} -</span>
                                    <span className="text-gray-900">{item.title}</span>
                                  </div>
                                  {item.tasks && item.tasks.length > 0 && (
                                    <div className="text-sm text-gray-500 mt-1">
                                      {item.tasks.length} tâche(s) disponible(s)
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteStep('subsection', section.id, phaseStructure, item.id)}
                                  className="h-8 w-8 p-0"
                                  title="Supprimer cette sous-section"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Structure personnalisée pour ce projet. Les modifications n'affectent que ce projet.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
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
      
      {/* Boîte de dialogue pour ajouter des membres */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter des membres au projet</DialogTitle>
            <DialogDescription>
              Sélectionnez les intervenants qui auront accès à ce projet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher un intervenant..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Liste des intervenants */}
            <ScrollArea className="h-[400px] border rounded-md p-4">
              {loadingAllIntervenants ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aphs-teal"></div>
                </div>
              ) : filteredIntervenants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun intervenant trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredIntervenants.map((intervenant) => {
                    const alreadyMember = isAlreadyMember(intervenant.id);
                    const isSelected = selectedIntervenants.includes(intervenant.id);
                    
                    return (
                      <div key={intervenant.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`member-${intervenant.id}`}
                          checked={isSelected}
                          disabled={alreadyMember}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIntervenants(prev => [...prev, intervenant.id]);
                            } else {
                              setSelectedIntervenants(prev => prev.filter(id => id !== intervenant.id));
                            }
                          }}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                            {getInitials(intervenant.first_name, intervenant.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className={`font-medium ${alreadyMember ? 'text-gray-400' : 'text-gray-900'}`}>
                            {intervenant.first_name} {intervenant.last_name}
                          </div>
                          <div className={`text-sm ${alreadyMember ? 'text-gray-300' : 'text-gray-500'}`}>
                            {intervenant.email}
                          </div>
                          {intervenant.specialty && (
                            <div className={`text-xs ${alreadyMember ? 'text-gray-300' : 'text-gray-400'}`}>
                              {intervenant.specialty}
                            </div>
                          )}
                        </div>
                        {alreadyMember && (
                          <Badge variant="outline" className="text-xs">
                            Déjà membre
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            
            {selectedIntervenants.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedIntervenants.length} intervenant(s) sélectionné(s)
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddMembers}
              disabled={selectedIntervenants.length === 0}
              className="bg-aphs-teal hover:bg-aphs-navy"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter {selectedIntervenants.length > 0 ? `(${selectedIntervenants.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Boîte de dialogue pour confirmer la suppression d'un membre */}
      <AlertDialog open={isRemoveMemberDialogOpen} onOpenChange={setIsRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre du projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  Êtes-vous sûr de vouloir retirer{' '}
                  <span className="font-medium">
                    {(() => {
                      const info = getIntervenantInfo(memberToRemove.user_id);
                      return info ? `${info.first_name} ${info.last_name}` : 'cet utilisateur';
                    })()}
                  </span>{' '}
                  du projet ? Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Boîte de dialogue pour confirmer la suppression d'étapes/sous-étapes */}
      <AlertDialog open={isDeleteStepDialogOpen} onOpenChange={setIsDeleteStepDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {stepToDelete?.type === 'section' 
                ? 'Supprimer cette section complète ?' 
                : 'Supprimer cette sous-section ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {stepToDelete && (
                <>
                  {stepToDelete.type === 'section' ? (
                    <>
                      Êtes-vous sûr de vouloir supprimer la section{' '}
                      <span className="font-medium">{stepToDelete.sectionId}</span> et toutes ses sous-sections ?
                      <br /><br />
                      <span className="text-red-600 font-medium">
                        Cette action supprimera également toutes les tâches assignées dans cette section.
                      </span>
                    </>
                  ) : (
                    <>
                      Êtes-vous sûr de vouloir supprimer la sous-section{' '}
                      <span className="font-medium">{stepToDelete.subsectionId}</span> de la section {stepToDelete.sectionId} ?
                      <br /><br />
                      <span className="text-red-600 font-medium">
                        Cette action supprimera également toutes les tâches assignées dans cette sous-section.
                      </span>
                    </>
                  )}
                  <br /><br />
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStep}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;