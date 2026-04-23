// Constantes en français - Site monolingue français
// Remplace l'ancien système de traduction complexe

export const APP_NAME = "APS International";
export const APP_DESCRIPTION = "Logiciel avancé de gestion de projets de construction";

// Navigation
export const NAV = {
  home: "Accueil",
  accompagnement: "Accompagnement",
  features: "Fonctionnalités",
  benefits: "Avantages",
  testimonials: "Témoignages",
  about: "À Propos",
  contact: "Contact",
  login: "Connexion",
  dashboard: "Tableau de bord",
  projects: "Projets",
  myProjects: "Mes Projets",
  tasks: "Tâches",
  intervenants: "Intervenants",
  companies: "Entreprises",
  workgroups: "Groupes de travail",
  messages: "Messages",
  settings: "Paramètres",
  validations: "Validations",
  signatures: "Mes Signatures"
};

// Page de connexion
export const LOGIN = {
  title: "Connexion",
  subtitle: "Connectez-vous pour accéder à votre espace",
  email: "Email",
  emailPlaceholder: "votre@email.com",
  password: "Mot de passe",
  passwordPlaceholder: "••••••••",
  forgotPassword: "Mot de passe oublié ?",
  loginButton: "Se connecter",
  loadingButton: "Connexion en cours...",
  contactAdmin: "Contactez votre administrateur si vous n'avez pas de compte.",
  welcomeTitle: "Bienvenue sur la plateforme",
  welcomeSubtitle: "Gérez vos projets et collaborez efficacement avec tous vos intervenants.",
};

// Tableau de bord
export const DASHBOARD = {
  title: "Tableau de bord",
  adminTitle: "Tableau de bord Admin",
  specialistTitle: "Mon Tableau de bord",
  masterOwnerTitle: "Tableau de bord Maître d'ouvrage",
  lastUpdate: "Dernière mise à jour",
  refresh: "Actualiser",
  retry: "Réessayer",
  reloadPage: "Recharger la page",
  noData: "Aucune donnée disponible",
  loading: "Chargement des statistiques...",
  
  // Statistiques
  projects: {
    title: "Projets",
    active: "actifs",
    completed: "terminés",
    viewAll: "Voir tous les projets"
  },
  
  specialists: {
    title: "Intervenants",
    active: "actifs",
    manage: "Gérer les intervenants"
  },
  
  tasks: {
    title: "Tâches",
    completed: "terminées",
    pending: "en attente",
    overdue: "en retard",
    viewTasks: "Voir les tâches"
  },
  
  // Actions rapides
  quickActions: {
    title: "Actions rapides",
    description: "Accès rapide aux principales fonctionnalités",
  }
};

// Notifications
export const NOTIFICATIONS = {
  title: "Notifications",
  markAllRead: "Tout marquer comme lu",
  noNotifications: "Aucune notification importante",
  viewAll: "Voir toute l'activité récente",
  
  types: {
    file_uploaded: "Nouveau fichier uploadé",
    task_validated: "Tâche validée",
    message_received: "Nouveau message",
    document_signed: "Document signé",
    document_rejected: "Document refusé",
    task_assigned: "Nouvelle tâche assignée",
    project_added: "Ajouté à un nouveau projet",
    task_validation_request: "Demande de validation de tâche",
    file_validation_request: "Fichier à valider"
  },
  
  // Messages communs
  success: "Succès",
  error: "Erreur",
  warning: "Attention",
  info: "Information",
  loading: "Chargement...",
  saved: "Enregistré avec succès",
  deleted: "Supprimé avec succès",
  updated: "Mis à jour avec succès",
  created: "Créé avec succès",
  cancelled: "Annulé",
  confirm: "Êtes-vous sûr ?",
  confirmDelete: "Êtes-vous sûr de vouloir supprimer cet élément ?",
  cannotUndo: "Cette action ne peut pas être annulée.",
  networkError: "Erreur réseau",
  checkConnection: "Veuillez vérifier votre connexion internet",
  unknownError: "Une erreur inconnue s'est produite",
  tryAgain: "Veuillez réessayer",
  missingFields: "Veuillez remplir tous les champs obligatoires",
  invalidEmail: "Veuillez entrer une adresse email valide",
  passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
  passwordsDontMatch: "Les mots de passe ne correspondent pas",
};

// Messages
export const MESSAGES = {
  title: "Messages",
  subtitle: "Communiquez avec vos collègues et groupes de travail",
  search: "Rechercher...",
  tabs: {
    all: "Tous",
    direct: "Directs",
    groups: "Groupes"
  },
  noConversations: "Aucune conversation trouvée",
  newConversation: "Nouvelle conversation",
  loading: "Chargement des messages...",
  errorConnection: "Erreur de connexion",
  cannotLoadContacts: "Impossible de charger vos contacts.",
  cannotLoadConversations: "Impossible de charger vos conversations.",
  checkConnection: "Vérifiez votre connexion internet et réessayez.",
  retry: "Réessayer",
  lastUpdate: "Dernière mise à jour",
  refresh: "Actualiser",
  updated: "Mise à jour",
  messagesUpdated: "Les messages ont été mis à jour",
  cannotRefresh: "Impossible d'actualiser les messages",
  yesterday: "Hier",
  members: "membres",
  online: "En ligne",
  away: "Absent",
  offline: "Hors ligne",
  noMessages: "Aucun message dans cette conversation",
  startConversation: "Commencez la conversation en envoyant un message",
  typePlaceholder: "Tapez votre message...",
  send: "Envoyer",
  create: "Créer",
  cancel: "Annuler"
};

// Projets
export const PROJECTS = {
  title: "Mes Projets",
  subtitle: "Consultez les projets auxquels vous êtes assigné",
  specialistMode: "Mode Intervenant",
  search: {
    placeholder: "Rechercher un projet...",
    results: "projet(s) trouvé(s)"
  },
  empty: {
    noProjects: "Aucun projet assigné",
    noProjectsDesc: "Vous n'êtes assigné à aucun projet pour le moment",
    noResults: "Aucun projet trouvé",
    noResultsDesc: "Essayez avec d'autres termes de recherche"
  },
  card: {
    startDate: "Début",
    progress: "Progression",
    tasksCompleted: "tâches terminées",
    member: "Membre",
    view: "Consulter"
  },
  status: {
    active: "Actif",
    completed: "Terminé",
    paused: "En pause",
    cancelled: "Annulé"
  }
};

// Tâches
export const TASKS = {
  title: "Mes Tâches",
  subtitle: "Gérez vos tâches assignées",
  search: {
    placeholder: "Rechercher une tâche...",
    noResults: "Aucune tâche trouvée",
    label: "Recherche"
  },
  filters: {
    all: "Toutes",
    assigned: "Assignées",
    inProgress: "En cours",
    submitted: "Soumises",
    validated: "Validées",
    rejected: "Rejetées",
    phase: "Phase",
    allPhases: "Toutes les phases",
    conception: "Conception",
    realization: "Réalisation",
    statusLabel: "Statut",
    clearFilters: "Effacer les filtres",
    clear: "Effacer",
    project: "Projet",
    allProjects: "Tous les projets",
    sortBy: "Trier par",
    deadline: "Échéance",
    taskName: "Nom de la tâche",
    order: "Ordre",
    ascending: "Croissant",
    descending: "Décroissant"
  },
  status: {
    assigned: "Assignée",
    inProgress: "En cours",
    submitted: "Soumise",
    validated: "Validée",
    rejected: "Rejetée",
    unknown: "Inconnu"
  },
  card: {
    deadline: "Échéance",
    validationDeadline: "Validation",
    phase: "Phase",
    section: "Section",
    project: "Projet",
    viewDetails: "Voir les détails",
    submit: "Soumettre",
    download: "Télécharger",
    task: "Tâche",
    taskList: "Liste des tâches",
    taskListDesc: "Cliquez sur une tâche pour voir les détails.",
    type: "Type"
  },
  empty: {
    noTasks: "Aucune tâche assignée",
    noTasksDesc: "Vous n'avez aucune tâche assignée pour le moment",
    noResults: "Aucune tâche trouvée",
    noResultsDesc: "Aucune tâche ne correspond à vos critères de recherche"
  },
  dateFormat: {
    invalidDate: "Date invalide",
    today: "Aujourd'hui",
    daysRemaining: "jours restants",
    daysOverdue: "jours de retard",
    overdue: "En retard de"
  },
  messages: {
    warning: "Attention",
    error: "Erreur",
    errorLoadingTasks: "Impossible de charger vos tâches",
    errorLoadingProjects: "Impossible de charger les projets"
  },
  details: {
    title: "Détails de la tâche",
    taskName: "Nom de la tâche",
    project: "Projet",
    phase: "Phase",
    section: "Section",
    subsection: "Sous-section",
    assignedTo: "Assigné à",
    deadline: "Échéance",
    validationDeadline: "Échéance de validation",
    validators: "Validateurs",
    status: "Statut",
    comment: "Commentaire",
    validationComment: "Commentaire de validation",
    submittedAt: "Soumis le",
    validatedAt: "Validé le",
    validatedBy: "Validé par",
    file: "Fichier",
    noFile: "Aucun fichier",
    fileFormat: "Format de fichier",
    document: "Document",
    downloadDocument: "Télécharger le document",
    backToProjects: "Retour aux projets",
    noTasksAssigned: "Aucune tâche assignée",
    noTasksMessage: "Ce projet n'a aucune tâche assignée pour le moment.",
    projectOverview: "Aperçu du projet",
    projectDescription: "Description",
    projectStartDate: "Date de début",
    completionRate: "Taux de complétion",
    progress: "Progression",
    tasksValidated: "tâches validées",
    assignedIntervenants: "Intervenants assignés",
    activeMember: "membre(s) actif(s)",
    tasksAssigned: "Tâches assignées",
    loading: "Chargement...",
    error: "Erreur",
    projectNotFound: "Projet non trouvé",
    projectNotFoundMessage: "Le projet que vous recherchez n'existe pas ou a été supprimé.",
    cannotLoadDetails: "Impossible de charger les détails du projet",
    cannotLoadTasks: "Erreur lors de la récupération des tâches",
    statusLabels: {
      assigned: "Assignée",
      in_progress: "En cours",
      submitted: "Soumise",
      validated: "Validée",
      rejected: "Rejetée"
    },
    actions: "Actions",
    close: "Fermer",
    taskNotFound: "Tâche non trouvée",
    taskNotFoundMessage: "La tâche que vous recherchez n'existe pas ou a été supprimée.",
    backToTasks: "Retour aux tâches",
    assignedSpecialist: "Intervenant assigné",
    validationDeadlineShort: "Échéance de validation",
    submissionDeadline: "Échéance de soumission",
    expectedFileFormat: "Format de fichier attendu",
    instructions: "Instructions",
    submittedFile: "Fichier soumis",
    downloadFile: "Télécharger",
    infoSheet: "Fiche informative",
    referenceDocument: "Document de référence",
    clickToExpand: "Cliquez pour développer",
    clickToCollapse: "Cliquez pour réduire",
    detailedInstructions: "Cliquez pour voir les instructions détaillées",
    history: "Historique",
    taskCreated: "Tâche créée",
    noValidators: "Aucun validateur défini",
    unassigned: "Non assigné",
    overdue: "En retard",
    remainingDays: "jours restants",
    start: "Démarrer",
    submit: "Soumettre",
    validate: "Valider",
    reject: "Rejeter",
    finalize: "Finaliser",
    pendingValidation: "En attente de validation - en attente de l'examen des validateurs",
    pendingSubmission: "En attente de soumission - la tâche a été soumise mais pas encore validée",
    taskFinalized: "Cette tâche a été finalisée et clôturée définitivement par l'administration"
  },
  fileTypes: {
    pdf: "Document PDF (.pdf)",
    doc: "Document Word (.doc, .docx)",
    xls: "Tableur Excel (.xls, .xlsx)",
    ppt: "Présentation PowerPoint (.ppt, .pptx)",
    txt: "Fichier texte (.txt)",
    jpg: "Image JPEG (.jpg, .jpeg)",
    png: "Image PNG (.png)",
    zip: "Archive ZIP (.zip)",
    dwg: "Dessin AutoCAD (.dwg)",
    other: "Autre format"
  },
  toasts: {
    success: "Succès",
    error: "Erreur",
    taskStarted: "La tâche a été démarrée avec succès",
    taskSubmitted: "La tâche a été soumise avec succès",
    taskValidated: "La tâche a été validée avec succès",
    taskRejected: "La tâche a été rejetée",
    taskFinalized: "La tâche a été finalisée et clôturée définitivement",
    cannotLoadDetails: "Impossible de charger les détails de la tâche",
    cannotStartTask: "Impossible de démarrer la tâche",
    cannotSubmitTask: "Impossible de soumettre la tâche",
    cannotValidateTask: "Impossible de valider la tâche",
    cannotRejectTask: "Impossible de rejeter la tâche",
    cannotFinalizeTask: "Impossible de finaliser la tâche"
  }
};

// Entreprises
export const COMPANIES = {
  title: "Entreprises",
  subtitle: "Gérez les entreprises et leurs collaborateurs",
  addCompany: "Ajouter une entreprise",
  editCompany: "Modifier l'entreprise",
  deleteCompany: "Supprimer l'entreprise",
  companyName: "Nom de l'entreprise",
  companyType: "Type d'entreprise",
  contactEmail: "Email de contact",
  contactPhone: "Téléphone de contact",
  address: "Adresse",
  city: "Ville",
  country: "Pays",
  save: "Enregistrer",
  cancel: "Annuler",
  created: "Entreprise créée avec succès",
  updated: "Entreprise mise à jour avec succès",
  deleted: "Entreprise supprimée avec succès",
  cannotCreate: "Impossible de créer l'entreprise",
  cannotUpdate: "Impossible de mettre à jour l'entreprise",
  cannotDelete: "Impossible de supprimer l'entreprise"
};

// Paramètres
export const SETTINGS = {
  title: "Paramètres",
  subtitle: "Gérez vos préférences et votre compte",
  
  tabs: {
    profile: "Profil",
    notifications: "Notifications",
    security: "Sécurité",
    appearance: "Apparence",
    language: "Langue"
  },
  
  profile: {
    title: "Profil",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    role: "Rôle",
    company: "Entreprise",
    updateProfile: "Mettre à jour le profil",
    profileUpdated: "Profil mis à jour avec succès",
    cannotUpdate: "Impossible de mettre à jour le profil"
  },
  
  notifications: {
    title: "Notifications",
    emailNotifications: "Notifications par email",
    pushNotifications: "Notifications push",
    taskReminders: "Rappels de tâches",
    documentNotifications: "Notifications de documents",
    savePreferences: "Enregistrer les préférences",
    preferencesSaved: "Préférences enregistrées avec succès",
    cannotSave: "Impossible d'enregistrer les préférences"
  },
  
  security: {
    title: "Sécurité",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    changePassword: "Changer le mot de passe",
    passwordChanged: "Mot de passe changé avec succès",
    cannotChange: "Impossible de changer le mot de passe",
    passwordsDontMatch: "Les mots de passe ne correspondent pas",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères"
  },
  
  appearance: {
    title: "Apparence",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
    save: "Enregistrer",
    saved: "Préférences d'apparence enregistrées"
  },
  
  language: {
    title: "Langue",
    current: "Français",
    note: "Le site est disponible uniquement en français pour le moment."
  }
};

// Footer
export const FOOTER = {
  copyright: "© 2026 APS International. Tous droits réservés.",
  description: "Logiciel avancé de gestion de projets de construction aidant les équipes à livrer des projets à temps et dans les limites du budget.",
  product: "Produit",
  features: "Fonctionnalités",
  pricing: "Tarifs",
  demo: "Demander une démo",
  company: "Entreprise",
  about: "À Propos",
  careers: "Carrières",
  contact: "Contact",
  legal: "Légal",
  privacy: "Politique de confidentialité",
  terms: "Conditions d'utilisation",
  cookies: "Politique de cookies",
  legalNotice: "Mentions légales"
};

// Erreurs HTTP
export const ERRORS = {
  400: "Requête invalide",
  401: "Non authentifié",
  403: "Accès refusé",
  404: "Page non trouvée",
  500: "Erreur serveur",
  503: "Service indisponible",
  backHome: "Retour à l'accueil",
  backDashboard: "Retour au tableau de bord"
};

// Temps et dates
export const TIME = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  tomorrow: "Demain",
  daysAgo: "il y a {count} jours",
  hoursAgo: "il y a {count} heures",
  minutesAgo: "il y a {count} minutes",
  justNow: "À l'instant",
  soon: "Bientôt"
};
