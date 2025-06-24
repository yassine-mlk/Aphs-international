import { Language } from "@/components/LanguageSelector";

export const translations = {
  en: {
    meta: {
      title: "APHS | Construction Project Management",
      description: "Advanced construction project management software helping teams deliver projects on time and within budget."
    },
    navbar: {
      home: "Home",
      accompagnement: "Support",
      support: "features",
      benefits: "Benefits",
      testimonials: "Testimonials",
      about: "About Us",
      contact: "Contact"
    },
    loginPage: {
      title: "Login",
      subtitle: "Log in to access your workspace",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      forgotPassword: "Forgot password?",
      loginButton: "Log in",
      loadingButton: "Logging in...",
      contactAdmin: "Contact your administrator if you don't have an account.",
      welcomeTitle: "Welcome to the platform",
      welcomeSubtitle: "Manage your projects and collaborate efficiently with all your stakeholders.",
      projectManagement: "Project Management",
      projectManagementDesc: "Track the progress of your projects in real time",
      collaboration: "Collaboration",
      collaborationDesc: "Work as a team with powerful tools",
      communication: "Communication",
      communicationDesc: "Exchange with your collaborators quickly",
      analysis: "Analysis",
      analysisDesc: "View detailed reports on your activities"
    },
    sidebar: {
      dashboard: "Dashboard",
      projects: "Projects",
      myProjects: "My Projects",
      tasks: "Tasks",
      intervenants: "Specialists",
      companies: "Companies",
      workgroups: "Workgroups",
      messages: "Messages",
      videoconference: "Video Conference",
      settings: "Settings"
    },
    dashboard: {
      admin: {
        title: "Dashboard",
        lastUpdate: "Last update",
        refresh: "Refresh",
        retry: "Retry",
        reloadPage: "Reload page",
        noData: "No data available",
        loading: "Loading statistics...",
        projects: {
          title: "Projects",
          active: "active",
          completed: "completed",
          viewAll: "View all projects"
        },
        specialists: {
          title: "Specialists",
          active: "active",
          manage: "Manage specialists"
        },
        tasks: {
          title: "Tasks",
          completed: "completed",
          pending: "pending",
          overdue: "overdue",
          viewTasks: "View tasks"
        },
        quickActions: {
          title: "Quick Actions",
          description: "Quick access to main administration features",
          projects: "Projects",
          tasks: "Tasks",
          specialists: "Specialists",
          messages: "Messages",
          companies: "Companies",
          groups: "Groups",
          videoconference: "Video Conference",
          settings: "Settings"
        }
      },
      specialist: {
        title: "My Dashboard",
        subtitle: "Track your tasks and projects",
        refresh: "Refresh",
        retry: "Retry",
        reloadPage: "Reload page",
        noData: "No data available",
        loading: "Loading your data...",
        stats: {
          totalTasks: "Total tasks",
          allTasks: "All your tasks",
          successRate: "Success rate",
          validated: "validated",
          inProgress: "In progress",
          inProgressTasks: "Tasks in progress",
          overdue: "Overdue",
          overdueTasks: "Overdue tasks"
        },
        recentTasks: {
          title: "My recent tasks",
          description: "Your 10 latest assigned tasks",
          deadline: "Deadline",
          noTasks: "No assigned tasks"
        },
        recentActivities: {
          title: "Recent activities",
          description: "Your latest activities",
          noActivities: "No recent activities"
        },
        myProjects: {
          title: "My projects",
          description: "Projects you are assigned to",
          active: "Active",
          progress: "Progress",
          tasks: "tasks",
          startDate: "Start",
          noProjects: "No assigned projects",
          viewAll: "View all my projects"
        },
        quickActions: {
          title: "Quick Actions",
          description: "Quick access to your main features",
          myTasks: "My tasks",
          myProjects: "My projects",
          messages: "Messages",
          videoconference: "Video Conference"
        }
      }
    },
    messages: {
      title: "Messages",
      subtitle: "Communicate with your colleagues and work groups",
      search: "Search...",
      tabs: {
        all: "All",
        direct: "Direct",
        groups: "Groups"
      },
      noConversations: "No conversations found",
      tryOtherSearch: "Try with a different search",
      newConversation: "New conversation",
      loading: "Loading messages...",
      errorConnection: "Connection error",
      cannotLoadContacts: "Unable to load your contacts.",
      cannotLoadConversations: "Unable to load your conversations.",
      checkConnection: "Check your internet connection and try again.",
      retry: "Retry",
      lastUpdate: "Last update",
      refresh: "Refresh",
      updated: "Update",
      messagesUpdated: "Messages have been updated",
      cannotRefresh: "Unable to refresh messages",
      yesterday: "Yesterday",
      members: "members",
      online: "Online",
      away: "Away",
      offline: "Offline",
      noMessages: "No messages in this conversation",
      startConversation: "Start the conversation by sending a message",
      typePlaceholder: "Type your message...",
      send: "Send",
      newConversationTitle: "New conversation",
      directConversation: "Direct conversation",
      groupConversation: "Group conversation",
      selectContact: "Select a contact",
      selectContactPlaceholder: "Choose a contact...",
      groupName: "Group name",
      groupNamePlaceholder: "Group name...",
      selectMembers: "Select members",
      noContactsAvailable: "No contacts available",
      create: "Create",
      cancel: "Cancel"
    },
    videoConference: {
      title: "Video Conference",
      subtitle: "Join live meetings or schedule your video conferences",
      currentMeeting: "Video conference in progress",
      myMeetings: "My meetings",
      requestMeeting: "Request a meeting",
      meetingRequests: "Meeting requests",
      createMeeting: "Create a meeting",
      schedule: "Schedule",
      enterMeetingId: "Enter meeting ID...",
      join: "Join",
      endMeeting: "End meeting",
      leave: "Leave",
      inProgress: "In progress",
      joinMeeting: "Join meeting",
      end: "End",
      all: "All",
      active: "Active",
      scheduled: "Scheduled",
      loadingMeetings: "Loading meetings...",
      scheduled_badge: "Scheduled",
      active_badge: "Active",
      ended_badge: "Ended",
      participants: "Participants",
      host: "Host",
      newVideoConference: "New video conference",
      meetingTitle: "Meeting title *",
      meetingPlaceholder: "Team meeting...",
      description: "Description",
      descriptionPlaceholder: "Agenda, important information...",
      startImmediately: "Start immediately",
      dateTime: "Date and time",
      participants_select: "Participants",
      noSpecialistsAvailable: "No specialists available",
      participantsSelected: "participant(s) selected",
      connectionError: "Video conference error",
      meetingCreated: "Meeting created",
      meetingCreatedDesc: "Meeting created successfully",
      cannotCreateMeeting: "Unable to create meeting",
      meetingJoined: "Meeting joined",
      meetingJoinedDesc: "You have successfully joined the meeting",
      cannotJoinMeeting: "Unable to join meeting",
      meetingEnded: "Meeting ended",
      meetingEndedDesc: "The meeting has been ended successfully",
      cannotEndMeeting: "Unable to end meeting",
      meetingIdCopied: "Meeting ID copied",
      meetingIdCopiedDesc: "Meeting ID copied to clipboard",
      copyMeetingId: "Copy ID",
      invalidMeetingId: "Invalid meeting ID",
      enterValidMeetingId: "Please enter a valid meeting ID"
    },
    heroSection: {
      title: "Simplify Your Construction Projects Management",
      subtitle: "Streamline workflows, enhance communication, and deliver projects on time with APHS - the all-in-one construction project management solution.",
      cta: {
        primary: "Start Free Trial",
        secondary: "Watch Demo"
      }
    },
    featuresSection: {
      title: "Powerful Features for Construction Professionals",
      subtitle: "Everything you need to manage complex construction projects efficiently in one platform.",
      features: [
        {
          title: "Real-time Project Tracking",
          description: "Monitor all your projects in real-time with comprehensive dashboards and analytics."
        },
        {
          title: "Resource Management",
          description: "Efficiently allocate resources, track utilization, and optimize workforce planning."
        },
        {
          title: "Document Control",
          description: "Centralize all project documents, ensuring everyone accesses the latest versions."
        },
        {
          title: "Budget Monitoring",
          description: "Track expenses against budgets in real-time to prevent cost overruns."
        },
        {
          title: "Task Automation",
          description: "Automate routine tasks and notifications to save time and reduce errors."
        },
        {
          title: "Collaboration Tools",
          description: "Enhance team communication with built-in messaging and file sharing."
        }
      ]
    },
    benefitsSection: {
      title: "Transform Your Construction Management",
      subtitle: "Real results from construction companies like yours who implemented APHS.",
      benefits: [
        {
          title: "Livraison de Projet 15% Plus Rapide",
          description: "Accélérez les délais de projet grâce à des flux de travail rationalisés et à l'automatisation."
        },
        {
          title: "Réduction des Coûts de 10%",
          description: "Minimisez les dépassements de budget grâce au suivi financier en temps réel et aux analyses."
        },
        {
          title: "Amélioration de la Collaboration d'Équipe de 30%",
          description: "Améliorez la communication et réduisez les erreurs grâce à des informations centralisées."
        }
      ],
      cta: {
        title: "Ready to revolutionize how you manage construction projects?",
        subtitle: "Join hundreds of construction companies already saving time and money with APHS.",
        button: "Book a Demo"
      }
    },
    testimonialsSection: {
      title: "What Our Clients Say",
      subtitle: "Don't take our word for it - hear from construction professionals using APHS."
    },
    aboutSection: {
      title: "Who We Are",
      subtitle: "Meet our team, dedicated to revolutionizing construction project management.",
      mission: {
        title: "Our Mission",
        content: "We're committed to simplifying construction project management through innovative technology, helping teams save time, reduce costs, and improve collaboration.",
        vision: "Our vision is to become the industry standard for construction project management worldwide."
      },
      values: {
        title: "Our Values",
        list: [
          "Excellence in everything we do",
          "Innovation that solves real problems",
          "Customer success is our success",
          "Transparency and integrity"
        ]
      }
    },
    ctaSection: {
      title: "Ready to Transform Your Construction Management?",
      subtitle: "Get started with APHS today and join hundreds of construction companies already improving their project outcomes.",
      buttons: {
        trial: "Start",
        demo: "Book a Demo"
      },
      testimonial: {
        quote: "We reduced our project delays by 20%",
        author: "David Miller, Project Director"
      },
      form: {
        name: "Full Name",
        email: "Work Email",
        company: "Company",
        submit: "Get Started"
      }
    },
    footer: {
      copyright: "© 2025 APHS. All rights reserved."
    },
    projects: {
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
    },
    projectDetails: {
      back: "Retour aux projets",
      tabs: {
        info: "Informations du projet",
        structure: "Structure du projet",
        tasks: "Mes tâches"
      },
      info: {
        title: "Informations générales",
        description: "Description",
        startDate: "Date de début",
        status: "Statut",
        members: "Membres du projet",
        noMembers: "Aucun membre assigné"
      },
      structure: {
        title: "Structure du projet",
        conception: "Conception",
        realization: "Réalisation",
        noTasks: "Aucune tâche dans cette section",
        viewInfoSheet: "Voir la fiche informative",
        downloadInfoSheet: "Télécharger la fiche"
      },
      tasks: {
        title: "Mes tâches assignées",
        noTasks: "Aucune tâche assignée",
        deadline: "Échéance",
        validationDeadline: "Échéance de validation",
        assignedTo: "Assigné à",
        validators: "Validateurs",
        status: "Statut",
        actions: "Actions",
        viewDetails: "Voir les détails",
        submit: "Soumettre",
        download: "Télécharger"
      },
      taskDetails: {
        title: "Détails de la tâche",
        close: "Fermer",
        taskName: "Nom de la tâche",
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
        completionRate: "Taux de completion",
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
          assigned: "Assigné",
          in_progress: "En cours",
          submitted: "Soumis",
          validated: "Validé",
          rejected: "Rejeté"
        }
      },
      infoSheet: {
        title: "Fiche informative",
        close: "Fermer",
        loading: "Chargement de la fiche...",
        error: "Erreur lors du chargement de la fiche"
      }
    },
    tasks: {
      title: "My Tasks",
      subtitle: "Manage your assigned tasks",
      search: {
        placeholder: "Search for a task...",
        noResults: "No tasks found"
      },
      filters: {
        all: "All",
        assigned: "Assigned",
        inProgress: "In Progress",
        submitted: "Submitted",
        validated: "Validated",
        rejected: "Rejected",
        phase: "Phase",
        allPhases: "All phases",
        conception: "Conception",
        realization: "Realization"
      },
      status: {
        assigned: "Assigned",
        inProgress: "In Progress",
        submitted: "Submitted",
        validated: "Validated",
        rejected: "Rejected"
      },
      card: {
        deadline: "Deadline",
        validationDeadline: "Validation",
        phase: "Phase",
        section: "Section",
        project: "Project",
        viewDetails: "View details",
        submit: "Submit",
        download: "Download"
      },
      empty: {
        noTasks: "No assigned tasks",
        noTasksDesc: "You have no assigned tasks at the moment",
        noResults: "No tasks found",
        noResultsDesc: "No tasks match your search criteria"
      },
      details: {
        title: "Task details",
        taskName: "Task name",
        project: "Project",
        phase: "Phase",
        section: "Section",
        subsection: "Subsection",
        assignedTo: "Assigned to",
        deadline: "Deadline",
        validationDeadline: "Validation deadline",
        validators: "Validators",
        status: "Status",
        comment: "Comment",
        validationComment: "Validation comment",
        submittedAt: "Submitted on",
        validatedAt: "Validated on",
        validatedBy: "Validated by",
        file: "File",
        noFile: "No file",
        fileFormat: "File format",
        document: "Document",
        downloadDocument: "Download document",
        backToProjects: "Back to projects",
        noTasksAssigned: "No tasks assigned",
        noTasksMessage: "This project has no tasks assigned at the moment.",
        projectOverview: "Project Overview",
        projectDescription: "Description",
        projectStartDate: "Start Date",
        completionRate: "Completion Rate",
        progress: "Progress",
        tasksValidated: "tasks validated",
        assignedIntervenants: "Assigned specialists",
        activeMember: "active member(s)",
        tasksAssigned: "Tasks Assigned",
        loading: "Loading...",
        error: "Error",
        projectNotFound: "Project not found",
        projectNotFoundMessage: "The project you are looking for does not exist or has been deleted.",
        cannotLoadDetails: "Unable to load project details",
        cannotLoadTasks: "Error fetching tasks",
        statusLabels: {
          assigned: "Assigned",
          in_progress: "In Progress", 
          submitted: "Submitted",
          validated: "Validated",
          rejected: "Rejected"
        },
        actions: "Actions",
        close: "Close"
      }
    }
  },
  fr: {
    meta: {
      title: "APHS International | Gestion de Projets de Construction",
      description: "Logiciel avancé de gestion de projets de construction aidant les équipes à livrer des projets à temps et dans les limites du budget."
    },
    navbar: {
      home: "Accueil",
      accompagnement: "Accompagnement",
      support: "fonctionalite",
      benefits: "Avantages",
      testimonials: "Témoignages",
      about: "À Propos",
      contact: "Contact"
    },
    loginPage: {
      title: "Connexion",
      subtitle: "Connectez-vous pour accéder à votre espace",
      email: "Email",
      emailPlaceholder: "votre@email.com",
      password: "Mot de passe",
      passwordPlaceholder: "••••••••",
      forgotPassword: "Mot de passe oublié?",
      loginButton: "Se connecter",
      loadingButton: "Connexion en cours...",
      contactAdmin: "Contactez votre administrateur si vous n'avez pas de compte.",
      welcomeTitle: "Bienvenue sur la plateforme",
      welcomeSubtitle: "Gérez vos projets et collaborez efficacement avec tous vos intervenants.",
      projectManagement: "Gestion de projets",
      projectManagementDesc: "Suivez l'avancement de vos projets en temps réel",
      collaboration: "Collaboration",
      collaborationDesc: "Travaillez en équipe avec des outils performants",
      communication: "Communication",
      communicationDesc: "Échangez avec vos collaborateurs rapidement",
      analysis: "Analyse",
      analysisDesc: "Visualisez des rapports détaillés sur vos activités"
    },
    heroSection: {
      title: "Simplifiez la Gestion de vos Projets de Construction",
      subtitle: "Rationalisez les flux de travail, améliorez la communication et livrez les projets à temps avec APHS - la solution tout-en-un de gestion de projets de construction.",
      cta: {
        primary: "Essai Gratuit",
        secondary: "Voir la Démo"
      }
    },
    featuresSection: {
      title: "Fonctionnalités Puissantes pour les Professionnels de la Construction",
      subtitle: "Tout ce dont vous avez besoin pour gérer efficacement des projets de construction complexes sur une seule plateforme.",
      features: [
        {
          title: "Suivi de Projet en Temps Réel",
          description: "Suivez tous vos projets en temps réel avec des tableaux de bord et des analyses complets."
        },
        {
          title: "Gestion des Ressources",
          description: "Allouez efficacement les ressources, suivez l'utilisation et optimisez la planification de la main-d'œuvre."
        },
        {
          title: "Contrôle des Documents",
          description: "Centralisez tous les documents du projet, en veillant à ce que chacun accède aux dernières versions."
        },
        {
          title: "Suivi Budgétaire",
          description: "Suivez les dépenses par rapport aux budgets en temps réel pour éviter les dépassements de coûts."
        },
        {
          title: "Automatisation des Tâches",
          description: "Automatisez les tâches et les notifications de routine pour gagner du temps et réduire les erreurs."
        },
        {
          title: "Outils de Collaboration",
          description: "Améliorez la communication d'équipe avec la messagerie intégrée et le partage de fichiers."
        }
      ]
    },
    benefitsSection: {
      title: "Transformez Votre Gestion de Construction",
      subtitle: "Résultats réels d'entreprises de construction comme la vôtre qui ont mis en œuvre APHS.",
      benefits: [
        {
          title: "Livraison de Projet 15% Plus Rapide",
          description: "Accélérez les délais de projet grâce à des flux de travail rationalisés et à l'automatisation."
        },
        {
          title: "Réduction des Coûts de 10%",
          description: "Minimisez les dépassements de budget grâce au suivi financier en temps réel et aux analyses."
        },
        {
          title: "Amélioration de la Collaboration d'Équipe de 30%",
          description: "Améliorez la communication et réduisez les erreurs grâce à des informations centralisées."
        }
      ],
      cta: {
        title: "Prêt à révolutionner votre façon de gérer les projets de construction?",
        subtitle: "Rejoignez des centaines d'entreprises de construction qui économisent déjà du temps et de l'argent avec APHS.",
        button: "Réserver une Démo"
      }
    },
    testimonialsSection: {
      title: "Ce que Disent Nos Clients",
      subtitle: "Ne nous croyez pas sur parole - écoutez les professionnels de la construction qui utilisent APHS."
    },
    aboutSection: {
      title: "Qui Sommes-Nous",
      subtitle: "Rencontrez notre équipe, dédiée à révolutionner la gestion de projets de construction.",
      mission: {
        title: "Notre Mission",
        content: "Nous nous engageons à simplifier la gestion des projets de construction grâce à une technologie innovante, aidant les équipes à gagner du temps, réduire les coûts et améliorer la collaboration.",
        vision: "Notre vision est de devenir la référence mondiale en matière de gestion de projets de construction."
      },
      values: {
        title: "Nos Valeurs",
        list: [
          "L'excellence dans tout ce que nous faisons",
          "L'innovation qui résout de vrais problèmes",
          "Le succès de nos clients est notre succès",
          "Transparence et intégrité"
        ]
      }
    },
    ctaSection: {
      title: "Prêt à Transformer Votre Gestion de Construction?",
      subtitle: "Commencez avec APHS aujourd'hui et rejoignez des centaines d'entreprises de construction qui améliorent déjà leurs résultats de projet.",
      buttons: {
        trial: "Démarrer",
        demo: "Réserver une Démo"
      },
      testimonial: {
        quote: "Nous avons réduit nos retards de projet de 20%",
        author: "David Miller, Directeur de Projet"
      },
      form: {
        name: "Nom Complet",
        email: "Email Professionnel",
        company: "Entreprise",
        submit: "Commencer"
      }
    },
    footer: {
      copyright: "© 2025 APHS International. Tous droits réservés."
    },
    sidebar: {
      dashboard: "Tableau de bord",
      projects: "Projets",
      myProjects: "Mes Projets",
      tasks: "Tâches",
      intervenants: "Intervenants",
      companies: "Entreprises",
      workgroups: "Groupes",
      messages: "Messages",
      videoconference: "Visioconférence",
      settings: "Paramètres"
    },
    dashboard: {
      admin: {
        title: "Tableau de bord",
        lastUpdate: "Dernière mise à jour",
        refresh: "Actualiser",
        retry: "Réessayer",
        reloadPage: "Recharger la page",
        noData: "Aucune donnée disponible",
        loading: "Chargement des statistiques...",
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
        quickActions: {
          title: "Actions rapides",
          description: "Accès rapide aux principales fonctionnalités d'administration",
          projects: "Projets",
          tasks: "Tâches",
          specialists: "Intervenants",
          messages: "Messages",
          companies: "Entreprises",
          groups: "Groupes",
          videoconference: "Visioconférence",
          settings: "Paramètres"
        }
      },
      specialist: {
        title: "Mon tableau de bord",
        subtitle: "Suivi de vos tâches et projets",
        refresh: "Actualiser",
        retry: "Réessayer",
        reloadPage: "Recharger la page",
        noData: "Aucune donnée disponible",
        loading: "Chargement de vos données...",
        stats: {
          totalTasks: "Total tâches",
          allTasks: "Toutes vos tâches",
          successRate: "Taux de réussite",
          validated: "validées",
          inProgress: "En cours",
          inProgressTasks: "Tâches en cours",
          overdue: "En retard",
          overdueTasks: "Tâches en retard"
        },
        recentTasks: {
          title: "Mes tâches récentes",
          description: "Vos 10 dernières tâches assignées",
          deadline: "Échéance",
          noTasks: "Aucune tâche assignée"
        },
        recentActivities: {
          title: "Activités récentes",
          description: "Vos dernières activités",
          noActivities: "Aucune activité récente"
        },
        myProjects: {
          title: "Mes projets",
          description: "Projets dans lesquels vous êtes assigné",
          active: "Actif",
          progress: "Progression",
          tasks: "tâches",
          startDate: "Début",
          noProjects: "Aucun projet assigné",
          viewAll: "Voir tous mes projets"
        },
        quickActions: {
          title: "Actions rapides",
          description: "Accès rapide à vos principales fonctionnalités",
          myTasks: "Mes tâches",
          myProjects: "Mes projets",
          messages: "Messages",
          videoconference: "Visioconférence"
        }
      }
    },
    messages: {
      title: "Messages",
      subtitle: "Communiquez avec vos collègues et groupes de travail",
      search: "Rechercher...",
      tabs: {
        all: "Tous",
        direct: "Directs",
        groups: "Groupes"
      },
      noConversations: "Aucune conversation trouvée",
      tryOtherSearch: "Essayez avec une autre recherche",
      newConversation: "Nouvelle conversation",
      loading: "Chargement des messages...",
      errorConnection: "Erreur de connexion",
      cannotLoadContacts: "Impossible de charger vos contacts.",
      cannotLoadConversations: "Impossible de charger vos conversations.",
      checkConnection: "Vérifiez votre connexion Internet et réessayez.",
      retry: "Réessayer",
      lastUpdate: "Dernière mise à jour",
      refresh: "Actualiser",
      updated: "Mise à jour",
      messagesUpdated: "Les messages ont été actualisés",
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
      newConversationTitle: "Nouvelle conversation",
      directConversation: "Conversation directe",
      groupConversation: "Conversation de groupe",
      selectContact: "Sélectionner un contact",
      selectContactPlaceholder: "Choisissez un contact...",
      groupName: "Nom du groupe",
      groupNamePlaceholder: "Nom du groupe...",
      selectMembers: "Sélectionner les membres",
      noContactsAvailable: "Aucun contact disponible",
      create: "Créer",
      cancel: "Annuler"
    },
    videoConference: {
      title: "Vidéoconférence",
      subtitle: "Participez à des réunions en direct ou planifiez vos visioconférences",
      currentMeeting: "Vidéoconférence en cours",
      myMeetings: "Mes réunions",
      requestMeeting: "Demander une réunion",
      meetingRequests: "Demandes de réunion",
      createMeeting: "Créer une réunion",
      schedule: "Planifier",
      enterMeetingId: "Saisir l'ID de réunion...",
      join: "Rejoindre",
      endMeeting: "Terminer la réunion",
      leave: "Quitter",
      inProgress: "En cours",
      joinMeeting: "Rejoindre la réunion",
      end: "Terminer",
      all: "Toutes",
      active: "Actives",
      scheduled: "Planifiées",
      loadingMeetings: "Chargement des réunions...",
      scheduled_badge: "Programmée",
      active_badge: "Active",
      ended_badge: "Terminée",
      participants: "Participants",
      host: "Hôte",
      newVideoConference: "Nouvelle visioconférence",
      meetingTitle: "Titre de la réunion *",
      meetingPlaceholder: "Réunion d'équipe...",
      description: "Description",
      descriptionPlaceholder: "Ordre du jour, informations importantes...",
      startImmediately: "Démarrer immédiatement",
      dateTime: "Date et heure",
      participants_select: "Participants",
      noSpecialistsAvailable: "Aucun intervenant disponible",
      participantsSelected: "participant(s) sélectionné(s)",
      connectionError: "Erreur de visioconférence",
      meetingCreated: "Réunion créée",
      meetingCreatedDesc: "Réunion créée avec succès",
      cannotCreateMeeting: "Impossible de créer la réunion",
      meetingJoined: "Réunion rejointe",
      meetingJoinedDesc: "Vous avez rejoint la réunion avec succès",
      cannotJoinMeeting: "Impossible de rejoindre la réunion",
      meetingEnded: "Réunion terminée",
      meetingEndedDesc: "La réunion a été terminée avec succès",
      cannotEndMeeting: "Impossible de terminer la réunion",
      meetingIdCopied: "ID de réunion copié",
      meetingIdCopiedDesc: "ID de réunion copié dans le presse-papiers",
      copyMeetingId: "Copier l'ID",
      invalidMeetingId: "ID de réunion invalide",
      enterValidMeetingId: "Veuillez saisir un ID de réunion valide"
    },
    projects: {
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
    },
    projectDetails: {
      back: "Retour aux projets",
      tabs: {
        info: "Informations du projet",
        structure: "Structure du projet",
        tasks: "Mes tâches"
      },
      info: {
        title: "Informations générales",
        description: "Description",
        startDate: "Date de début",
        status: "Statut",
        members: "Membres du projet",
        noMembers: "Aucun membre assigné"
      },
      structure: {
        title: "Structure du projet",
        conception: "Conception",
        realization: "Réalisation",
        noTasks: "Aucune tâche dans cette section",
        viewInfoSheet: "Voir la fiche informative",
        downloadInfoSheet: "Télécharger la fiche"
      },
      tasks: {
        title: "Mes tâches assignées",
        noTasks: "Aucune tâche assignée",
        deadline: "Échéance",
        validationDeadline: "Échéance de validation",
        assignedTo: "Assigné à",
        validators: "Validateurs",
        status: "Statut",
        actions: "Actions",
        viewDetails: "Voir les détails",
        submit: "Soumettre",
        download: "Télécharger"
      },
      taskDetails: {
        title: "Détails de la tâche",
        close: "Fermer",
        taskName: "Nom de la tâche",
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
        completionRate: "Taux de completion",
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
          assigned: "Assigné",
          in_progress: "En cours",
          submitted: "Soumis",
          validated: "Validé",
          rejected: "Rejeté"
        }
      },
      infoSheet: {
        title: "Fiche informative",
        close: "Fermer",
        loading: "Chargement de la fiche...",
        error: "Erreur lors du chargement de la fiche"
      }
    },
    tasks: {
      title: "Mes Tâches",
      subtitle: "Gérez vos tâches assignées",
      search: {
        placeholder: "Rechercher une tâche...",
        noResults: "Aucune tâche trouvée"
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
        realization: "Réalisation"
      },
      status: {
        assigned: "Assignée",
        inProgress: "En cours",
        submitted: "Soumise",
        validated: "Validée",
        rejected: "Rejetée"
      },
      card: {
        deadline: "Échéance",
        validationDeadline: "Validation",
        phase: "Phase",
        section: "Section",
        project: "Projet",
        viewDetails: "Voir détails",
        submit: "Soumettre",
        download: "Télécharger"
      },
      empty: {
        noTasks: "Aucune tâche assignée",
        noTasksDesc: "Vous n'avez aucune tâche assignée pour le moment",
        noResults: "Aucune tâche trouvée",
        noResultsDesc: "Aucune tâche ne correspond à vos critères de recherche"
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
        actions: "Actions",
        close: "Fermer"
      }
    }
  },
  es: {
    meta: {
      title: "APHS  | Gestión de Proyectos de Construcción",
      description: "Software avanzado de gestión de proyectos de construcción que ayuda a los equipos a entregar proyectos a tiempo y dentro del presupuesto."
    },
    navbar: {
      home: "Inicio",
      accompagnement: "acompañamiento",
      support: "Soporte",
      benefits: "Beneficios",
      testimonials: "Testimonios",
      about: "Nosotros",
      contact: "Contacto"
    },
    loginPage: {
      title: "Iniciar Sesión",
      subtitle: "Inicie sesión para acceder a su espacio de trabajo",
      email: "Correo Electrónico",
      emailPlaceholder: "su@email.com",
      password: "Contraseña",
      passwordPlaceholder: "••••••••",
      forgotPassword: "¿Olvidó su contraseña?",
      loginButton: "Iniciar Sesión",
      loadingButton: "Iniciando sesión...",
      contactAdmin: "Contacte a su administrador si no tiene una cuenta.",
      welcomeTitle: "Bienvenido a la plataforma",
      welcomeSubtitle: "Gestione sus proyectos y colabore eficientemente con todos sus interesados.",
      projectManagement: "Gestión de Proyectos",
      projectManagementDesc: "Rastree el progreso de sus proyectos en tiempo real",
      collaboration: "Colaboración",
      collaborationDesc: "Trabaje en equipo con herramientas poderosas",
      communication: "Comunicación",
      communicationDesc: "Intercambie con sus colaboradores rápidamente",
      analysis: "Análisis",
      analysisDesc: "Visualice informes detallados sobre sus actividades"
    },
    sidebar: {
      dashboard: "Panel de Control",
      projects: "Proyectos",
      myProjects: "Mis Proyectos",
      tasks: "Tareas",
      intervenants: "Especialistas",
      companies: "Empresas",
      workgroups: "Grupos",
      messages: "Mensajes",
      videoconference: "Videoconferencia",
      settings: "Configuración"
    },
    dashboard: {
      admin: {
        title: "Panel de Control",
        lastUpdate: "Última actualización",
        refresh: "Actualizar",
        retry: "Reintentar",
        reloadPage: "Recargar página",
        noData: "No hay datos disponibles",
        loading: "Cargando estadísticas...",
        projects: {
          title: "Proyectos",
          active: "activos",
          completed: "completados",
          viewAll: "Ver todos los proyectos"
        },
        specialists: {
          title: "Especialistas",
          active: "activos",
          manage: "Gestionar especialistas"
        },
        tasks: {
          title: "Tareas",
          completed: "completadas",
          pending: "pendientes",
          overdue: "vencidas",
          viewTasks: "Ver tareas"
        },
        quickActions: {
          title: "Acciones rápidas",
          description: "Acceso rápido a las principales características de administración",
          projects: "Proyectos",
          tasks: "Tareas",
          specialists: "Especialistas",
          messages: "Mensajes",
          companies: "Empresas",
          groups: "Grupos",
          videoconference: "Videoconferencia",
          settings: "Configuración"
        }
      },
      specialist: {
        title: "Mi Panel de Control",
        subtitle: "Seguimiento de sus tareas y proyectos",
        refresh: "Actualizar",
        retry: "Reintentar",
        reloadPage: "Recargar página",
        noData: "No hay datos disponibles",
        loading: "Cargando sus datos...",
        stats: {
          totalTasks: "Total de tareas",
          allTasks: "Todas sus tareas",
          successRate: "Tasa de éxito",
          validated: "validadas",
          inProgress: "En progreso",
          inProgressTasks: "Tareas en progreso",
          overdue: "Vencidas",
          overdueTasks: "Tareas vencidas"
        },
        recentTasks: {
          title: "Mis tareas recientes",
          description: "Sus 10 últimas tareas asignadas",
          deadline: "Fecha límite",
          noTasks: "No hay tareas asignadas"
        },
        recentActivities: {
          title: "Actividades recientes",
          description: "Sus últimas actividades",
          noActivities: "No hay actividades recientes"
        },
        myProjects: {
          title: "Mis proyectos",
          description: "Proyectos en los que está asignado",
          active: "Activo",
          progress: "Progreso",
          tasks: "tareas",
          startDate: "Inicio",
          noProjects: "No hay proyectos asignados",
          viewAll: "Ver todos mis proyectos"
        },
        quickActions: {
          title: "Acciones rápidas",
          description: "Acceso rápido a sus principales características",
          myTasks: "Mis tareas",
          myProjects: "Mis proyectos",
          messages: "Mensajes",
          videoconference: "Videoconferencia"
        }
      }
    },
    messages: {
      title: "Mensajes",
      subtitle: "Comuníquese con sus colegas y grupos de trabajo",
      search: "Buscar...",
      tabs: {
        all: "Todos",
        direct: "Directos",
        groups: "Grupos"
      },
      noConversations: "No se encontraron conversaciones",
      tryOtherSearch: "Intente con otra búsqueda",
      newConversation: "Nueva conversación",
      loading: "Cargando mensajes...",
      errorConnection: "Error de conexión",
      cannotLoadContacts: "No se pueden cargar sus contactos.",
      cannotLoadConversations: "No se pueden cargar sus conversaciones.",
      checkConnection: "Verifique su conexión a Internet e intente nuevamente.",
      retry: "Reintentar",
      lastUpdate: "Última actualización",
      refresh: "Actualizar",
      updated: "Actualización",
      messagesUpdated: "Los mensajes han sido actualizados",
      cannotRefresh: "No se pueden actualizar los mensajes",
      yesterday: "Ayer",
      members: "miembros",
      online: "En línea",
      away: "Ausente",
      offline: "Desconectado",
      noMessages: "No hay mensajes en esta conversación",
      startConversation: "Inicie la conversación enviando un mensaje",
      typePlaceholder: "Escriba su mensaje...",
      send: "Enviar",
      newConversationTitle: "Nueva conversación",
      directConversation: "Conversación directa",
      groupConversation: "Conversación grupal",
      selectContact: "Seleccionar un contacto",
      selectContactPlaceholder: "Elija un contacto...",
      groupName: "Nombre del grupo",
      groupNamePlaceholder: "Nombre del grupo...",
      selectMembers: "Seleccionar miembros",
      noContactsAvailable: "No hay contactos disponibles",
      create: "Crear",
      cancel: "Cancelar"
    },
    videoConference: {
      title: "Videoconferencia",
      subtitle: "Únase a reuniones en vivo o programe sus videoconferencias",
      currentMeeting: "Videoconferencia en curso",
      myMeetings: "Mis reuniones",
      requestMeeting: "Solicitar una reunión",
      meetingRequests: "Solicitudes de reunión",
      createMeeting: "Crear una reunión",
      schedule: "Programar",
      enterMeetingId: "Ingrese el ID de reunión...",
      join: "Unirse",
      endMeeting: "Finalizar reunión",
      leave: "Salir",
      inProgress: "En curso",
      joinMeeting: "Unirse a la reunión",
      end: "Finalizar",
      all: "Todas",
      active: "Activas",
      scheduled: "Programadas",
      loadingMeetings: "Cargando reuniones...",
      scheduled_badge: "Programada",
      active_badge: "Activa",
      ended_badge: "Finalizada",
      participants: "Participantes",
      host: "Anfitrión",
      newVideoConference: "Nueva videoconferencia",
      meetingTitle: "Título de la reunión *",
      meetingPlaceholder: "Reunión de equipo...",
      description: "Descripción",
      descriptionPlaceholder: "Agenda, información importante...",
      startImmediately: "Iniciar inmediatamente",
      dateTime: "Fecha y hora",
      participants_select: "Participantes",
      noSpecialistsAvailable: "No hay especialistas disponibles",
      participantsSelected: "participante(s) seleccionado(s)",
      connectionError: "Error de videoconferencia",
      meetingCreated: "Reunión creada",
      meetingCreatedDesc: "Reunión creada exitosamente",
      cannotCreateMeeting: "No se puede crear la reunión",
      meetingJoined: "Reunión unida",
      meetingJoinedDesc: "Se ha unido a la reunión exitosamente",
      cannotJoinMeeting: "No se puede unir a la reunión",
      meetingEnded: "Reunión finalizada",
      meetingEndedDesc: "La reunión ha sido finalizada exitosamente",
      cannotEndMeeting: "No se puede finalizar la reunión",
      meetingIdCopied: "ID de reunión copiado",
      meetingIdCopiedDesc: "ID de reunión copiado al portapapeles",
      copyMeetingId: "Copiar ID",
      invalidMeetingId: "ID de reunión inválido",
      enterValidMeetingId: "Por favor ingrese un ID de reunión válido"
    },
    heroSection: {
      title: "Simplifique la Gestión de sus Proyectos de Construcción",
      subtitle: "Optimice los flujos de trabajo, mejore la comunicación y entregue proyectos a tiempo con APHS - la solución todo en uno para la gestión de proyectos de construcción.",
      cta: {
        primary: "Comenzar Prueba Gratuita",
        secondary: "Ver Demostración"
      }
    },
    featuresSection: {
      title: "Potentes Características para Profesionales de la Construcción",
      subtitle: "Todo lo que necesita para gestionar eficientemente proyectos de construcción complejos en una plataforma.",
      features: [
        {
          title: "Seguimiento de Proyectos en Tiempo Real",
          description: "Monitoree todos sus proyectos en tiempo real con paneles e informes completos."
        },
        {
          title: "Gestión de Recursos",
          description: "Asigne recursos eficientemente, controle la utilización y optimice la planificación del personal."
        },
        {
          title: "Control de Documentos",
          description: "Centralice todos los documentos del proyecto, asegurando que todos accedan a las últimas versiones."
        },
        {
          title: "Monitoreo de Presupuesto",
          description: "Controle gastos contra presupuestos en tiempo real para prevenir sobrecostos."
        },
        {
          title: "Automatización de Tareas",
          description: "Automatice tareas rutinarias y notificaciones para ahorrar tiempo y reducir errores."
        },
        {
          title: "Herramientas de Colaboración",
          description: "Mejore la comunicación del equipo con mensajería incorporada y compartición de archivos."
        }
      ]
    },
    benefitsSection: {
      title: "Transforme su Gestión de Construcción",
      subtitle: "Resultados reales de empresas de construcción como la suya que implementaron APHS.",
      benefits: [
        {
          title: "Entrega de Proyectos 15% Más Rápida",
          description: "Acelere los cronogramas de proyectos con flujos de trabajo optimizados y automatización."
        },
        {
          title: "Reducción de Costos del 10%",
          description: "Minimice los sobrecostos con seguimiento financiero en tiempo real y análisis."
        },
        {
          title: "Colaboración de Equipo Mejorada en un 30%",
          description: "Mejore la comunicación y reduzca errores con información centralizada."
        }
      ],
      cta: {
        title: "¿Listo para revolucionar cómo gestiona sus proyectos de construcción?",
        subtitle: "Únase a cientos de empresas de construcción que ya están ahorrando tiempo y dinero con APHS.",
        button: "Agendar una Demostración"
      }
    },
    testimonialsSection: {
      title: "Lo que Dicen Nuestros Clientes",
      subtitle: "No tome solo nuestra palabra - escuche a los profesionales de la construcción que utilizan APHS."
    },
    aboutSection: {
      title: "Quiénes Somos",
      subtitle: "Conozca al equipo detrás de APHS, dedicado a revolucionar la gestión de proyectos de construcción.",
      mission: {
        title: "Nuestra Misión",
        content: "En APHS, nos comprometemos a simplificar la gestión de proyectos de construcción a través de tecnología innovadora, ayudando a los equipos a ahorrar tiempo, reducir costos y mejorar la colaboración.",
        vision: "Nuestra visión es convertirnos en el estándar de la industria para la gestión de proyectos de construcción en todo el mundo."
      },
      values: {
        title: "Nuestros Valores",
        list: [
          "Excelencia en todo lo que hacemos",
          "Innovación que resuelve problemas reales",
          "El éxito del cliente es nuestro éxito",
          "Transparencia e integridad"
        ]
      }
    },
    ctaSection: {
      title: "¿Listo para Transformar su Gestión de Construcción?",
      subtitle: "Comience con APHS hoy y únase a cientos de empresas de construcción que ya están mejorando sus resultados de proyecto.",
      buttons: {
        trial: "Comenzar",
        demo: "Reservar una Demostración"
      },
      testimonial: {
        quote: "Redujimos nuestros retrasos de proyecto en un 20%",
        author: "David Miller, Director de Proyecto"
      },
      form: {
        name: "Nombre Completo",
        email: "Correo Electrónico de Trabajo",
        company: "Empresa",
        submit: "Empezar"
      }
    },
    footer: {
      copyright: "© 2025 APHS. Todos los derechos reservados."
    },
    projects: {
      title: "Mes Proyectos",
      subtitle: "Consultez los proyectos a los que está asignado",
      specialistMode: "Modo Especialista",
      search: {
        placeholder: "Buscar proyecto...",
        results: "proyecto(s) encontrado(s)"
      },
      empty: {
        noProjects: "No hay proyecto asignado",
        noProjectsDesc: "No está asignado a ningún proyecto en este momento",
        noResults: "No se encontró proyecto",
        noResultsDesc: "Intente con otros términos de búsqueda"
      },
      card: {
        startDate: "Inicio",
        progress: "Progreso",
        tasksCompleted: "tareas terminadas",
        member: "Miembro",
        view: "Ver"
      },
      status: {
        active: "Activo",
        completed: "Completado",
        paused: "En pausa",
        cancelled: "Cancelado"
      }
    },
    projectDetails: {
      back: "Regresar a proyectos",
      tabs: {
        info: "Información del proyecto",
        structure: "Estructura del proyecto",
        tasks: "Mis tareas"
      },
      info: {
        title: "Información general",
        description: "Descripción",
        startDate: "Fecha de inicio",
        status: "Estado",
        members: "Miembros del proyecto",
        noMembers: "No hay miembro asignado"
      },
      structure: {
        title: "Estructura del proyecto",
        conception: "Concepción",
        realization: "Realización",
        noTasks: "No hay tarea en esta sección",
        viewInfoSheet: "Ver hoja informativa",
        downloadInfoSheet: "Descargar hoja"
      },
      tasks: {
        title: "Tareas asignadas",
        noTasks: "No hay tarea asignada",
        deadline: "Plazo",
        validationDeadline: "Plazo de validación",
        assignedTo: "Asignado a",
        validators: "Validadores",
        status: "Estado",
        actions: "Acciones",
        viewDetails: "Ver detalles",
        submit: "Enviar",
        download: "Descargar"
      },
      taskDetails: {
        title: "Detalles de la tarea",
        close: "Cerrar",
        taskName: "Nombre de la tarea",
        phase: "Fase",
        section: "Sección",
        subsection: "Subsección",
        assignedTo: "Asignado a",
        deadline: "Plazo",
        validationDeadline: "Plazo de validación",
        validators: "Validadores",
        status: "Estado",
        comment: "Comentario",
        validationComment: "Comentario de validación",
        submittedAt: "Enviado el",
        validatedAt: "Validado el",
        validatedBy: "Validado por",
        file: "Archivo",
        noFile: "No hay archivo",
        fileFormat: "Formato de archivo",
        document: "Documento",
        downloadDocument: "Descargar documento",
        backToProjects: "Volver a proyectos",
        noTasksAssigned: "Ninguna tarea asignada",
        noTasksMessage: "Este proyecto no tiene tareas asignadas en este momento.",
        projectOverview: "Resumen del proyecto",
        projectDescription: "Descripción",
        projectStartDate: "Fecha de inicio",
        completionRate: "Tasa de finalización",
        progress: "Progreso",
        tasksValidated: "tareas validadas",
        assignedIntervenants: "Especialistas asignados",
        activeMember: "miembro(s) activo(s)",
        tasksAssigned: "Tareas asignadas",
        loading: "Cargando...",
        error: "Error",
        projectNotFound: "Proyecto no encontrado",
        projectNotFoundMessage: "El proyecto que busca no existe o ha sido eliminado.",
        cannotLoadDetails: "No se pueden cargar los detalles del proyecto",
        cannotLoadTasks: "Error al recuperar las tareas",
        statusLabels: {
          assigned: "Asignado",
          in_progress: "En progreso",
          submitted: "Enviado",
          validated: "Validado",
          rejected: "Rechazado"
        }
      },
      infoSheet: {
        title: "Hoja informativa",
        close: "Cerrar",
        loading: "Cargando hoja...",
        error: "Error al cargar la hoja"
      }
    },
    tasks: {
      title: "Mis Tareas",
      subtitle: "Gestiona tus tareas asignadas",
      search: {
        placeholder: "Buscar una tarea...",
        noResults: "No se encontraron tareas"
      },
      filters: {
        all: "Todas",
        assigned: "Asignadas",
        inProgress: "En Progreso",
        submitted: "Enviadas",
        validated: "Validadas",
        rejected: "Rechazadas",
        phase: "Fase",
        allPhases: "Todas las fases",
        conception: "Concepción",
        realization: "Réalisation"
      },
      status: {
        assigned: "Asignada",
        inProgress: "En Progreso",
        submitted: "Soumise",
        validated: "Validada",
        rejected: "Rejetée"
      },
      card: {
        deadline: "Plazo",
        validationDeadline: "Validación",
        phase: "Fase",
        section: "Sección",
        project: "Proyecto",
        viewDetails: "Ver detalles",
        submit: "Enviar",
        download: "Descargar"
      },
      empty: {
        noTasks: "No hay tareas asignadas",
        noTasksDesc: "No tienes tareas asignadas en este momento",
        noResults: "No se encontraron tareas",
        noResultsDesc: "Ninguna tarea coincide con tus criterios de búsqueda"
      },
      details: {
        title: "Detalles de la tarea",
        taskName: "Nombre de la tarea",
        project: "Proyecto",
        phase: "Fase",
        section: "Sección",
        subsection: "Subsección",
        assignedTo: "Asignado a",
        deadline: "Plazo",
        validationDeadline: "Plazo de validación",
        validators: "Validadores",
        status: "Estado",
        comment: "Comentario",
        validationComment: "Comentario de validación",
        submittedAt: "Soumis le",
        validatedAt: "Validé le",
        validatedBy: "Validé par",
        file: "Archivo",
        noFile: "No hay archivo",
        actions: "Acciones",
        close: "Cerrar"
      }
    }
  },
  ar: {
    meta: {
      title: "APHS  | إدارة مشاريع البناء",
      description: "برنامج متقدم لإدارة مشاريع البناء يساعد الفرق على تسليم المشاريع في الوقت المحدد وضمن الميزانية."
    },
    navbar: {
      home: "الرئيسية",
      accompagnement: "مرافقة",
      support: "الدعم",
      benefits: "الفوائد",
      testimonials: "الشهادات",
      about: "من نحن",
      contact: "اتصل بنا"
    },
    loginPage: {
      title: "تسجيل الدخول",
      subtitle: "سجل الدخول للوصول إلى مساحة العمل الخاصة بك",
      email: "البريد الإلكتروني",
      emailPlaceholder: "بريدك@الإلكتروني.com",
      password: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      forgotPassword: "هل نسيت كلمة المرور؟",
      loginButton: "تسجيل الدخول",
      loadingButton: "جاري تسجيل الدخول...",
      contactAdmin: "اتصل بالمسؤول إذا لم يكن لديك حساب.",
      welcomeTitle: "مرحباً بك في المنصة",
      welcomeSubtitle: "قم بإدارة مشاريعك والتعاون بكفاءة مع جميع أصحاب المصلحة.",
      projectManagement: "إدارة المشاريع",
      projectManagementDesc: "تتبع تقدم مشاريعك في الوقت الفعلي",
      collaboration: "التعاون",
      collaborationDesc: "اعمل كفريق مع أدوات قوية",
      communication: "التواصل",
      communicationDesc: "تبادل مع زملائك بسرعة",
      analysis: "التحليل",
      analysisDesc: "اعرض تقارير مفصلة عن أنشطتك"
    },
    sidebar: {
      dashboard: "لوحة القيادة",
      projects: "المشاريع",
      myProjects: "مشاريعي",
      tasks: "المهام",
      intervenants: "المتخصصين",
      companies: "الشركات",
      workgroups: "المجموعات",
      messages: "الرسائل",
      videoconference: "مؤتمر فيديو",
      settings: "الإعدادات"
    },
    dashboard: {
      admin: {
        title: "لوحة القيادة",
        lastUpdate: "آخر تحديث",
        refresh: "تحديث",
        retry: "إعادة المحاولة",
        reloadPage: "إعادة تحميل الصفحة",
        noData: "لا توجد بيانات متاحة",
        loading: "تحميل الإحصائيات...",
        projects: {
          title: "المشاريع",
          active: "نشطة",
          completed: "مكتملة",
          viewAll: "عرض جميع المشاريع"
        },
        specialists: {
          title: "المتخصصون",
          active: "نشطون",
          manage: "إدارة المتخصصين"
        },
        tasks: {
          title: "المهام",
          completed: "مكتملة",
          pending: "قيد الانتظار",
          overdue: "متأخرة",
          viewTasks: "عرض المهام"
        },
        quickActions: {
          title: "إجراءات سريعة",
          description: "وصول سريع إلى الخصائص الرئيسية للإدارة",
          projects: "المشاريع",
          tasks: "المهام",
          specialists: "المتخصصون",
          messages: "الرسائل",
          companies: "الشركات",
          groups: "المجموعات",
          videoconference: "مؤتمر فيديو",
          settings: "الإعدادات"
        }
      },
      specialist: {
        title: "لوحة قيادتي",
        subtitle: "تتبع مهامك ومشاريعك",
        refresh: "تحديث",
        retry: "إعادة المحاولة",
        reloadPage: "إعادة تحميل الصفحة",
        noData: "لا توجد بيانات متاحة",
        loading: "تحميل بياناتك...",
        stats: {
          totalTasks: "إجمالي المهام",
          allTasks: "جميع مهامك",
          successRate: "معدل النجاح",
          validated: "مصدّقة",
          inProgress: "قيد التنفيذ",
          inProgressTasks: "مهام قيد التنفيذ",
          overdue: "متأخرة",
          overdueTasks: "مهام متأخرة"
        },
        recentTasks: {
          title: "مهامي الأخيرة",
          description: "آخر 10 مهام تم تعيينها لك",
          deadline: "الموعد النهائي",
          noTasks: "لا توجد مهام معينة"
        },
        recentActivities: {
          title: "الأنشطة الأخيرة",
          description: "آخر أنشطتك",
          noActivities: "لا توجد أنشطة حديثة"
        },
        myProjects: {
          title: "مشاريعي",
          description: "المشاريع التي تم تعيينك بها",
          active: "نشط",
          progress: "التقدم",
          tasks: "مهام",
          startDate: "البداية",
          noProjects: "لا توجد مشاريع معينة",
          viewAll: "عرض جميع مشاريعي"
        },
        quickActions: {
          title: "إجراءات سريعة",
          description: "وصول سريع إلى خصائصك الرئيسية",
          myTasks: "مهامي",
          myProjects: "مشاريعي",
          messages: "الرسائل",
          videoconference: "مؤتمر فيديو"
        }
      }
    },
    messages: {
      title: "الرسائل",
      subtitle: "تواصل مع زملائك ومجموعات العمل",
      search: "بحث...",
      tabs: {
        all: "الكل",
        direct: "مباشر",
        groups: "مجموعات"
      },
      noConversations: "لم يتم العثور على محادثات",
      tryOtherSearch: "جرب بحثاً آخر",
      newConversation: "محادثة جديدة",
      loading: "تحميل الرسائل...",
      errorConnection: "خطأ في الاتصال",
      cannotLoadContacts: "لا يمكن تحميل جهات الاتصال الخاصة بك.",
      cannotLoadConversations: "لا يمكن تحميل محادثاتك.",
      checkConnection: "تحقق من اتصالك بالإنترنت وأعد المحاولة.",
      retry: "إعادة المحاولة",
      lastUpdate: "آخر تحديث",
      refresh: "تحديث",
      updated: "تحديث",
      messagesUpdated: "تم تحديث الرسائل",
      cannotRefresh: "لا يمكن تحديث الرسائل",
      yesterday: "أمس",
      members: "أعضاء",
      online: "متصل",
      away: "غائب",
      offline: "غير متصل",
      noMessages: "لا توجد رسائل في هذه المحادثة",
      startConversation: "ابدأ المحادثة بإرسال رسالة",
      typePlaceholder: "اكتب رسالتك...",
      send: "إرسال",
      newConversationTitle: "محادثة جديدة",
      directConversation: "محادثة مباشرة",
      groupConversation: "محادثة جماعية",
      selectContact: "اختر جهة اتصال",
      selectContactPlaceholder: "اختر جهة اتصال...",
      groupName: "اسم المجموعة",
      groupNamePlaceholder: "اسم المجموعة...",
      selectMembers: "اختر الأعضاء",
      noContactsAvailable: "لا توجد جهات اتصال متاحة",
      create: "إنشاء",
      cancel: "إلغاء"
    },
    videoConference: {
      title: "مؤتمر فيديو",
      subtitle: "انضم إلى اجتماعات مباشرة أو جدول مؤتمرات الفيديو الخاصة بك",
      currentMeeting: "مؤتمر فيديو جاري",
      myMeetings: "اجتماعاتي",
      requestMeeting: "طلب اجتماع",
      meetingRequests: "طلبات الاجتماع",
      createMeeting: "إنشاء اجتماع",
      schedule: "جدولة",
      enterMeetingId: "أدخل معرف الاجتماع...",
      join: "انضمام",
      endMeeting: "إنهاء الاجتماع",
      leave: "خروج",
      inProgress: "جاري",
      joinMeeting: "انضم للاجتماع",
      end: "إنهاء",
      all: "الكل",
      active: "نشطة",
      scheduled: "مجدولة",
      loadingMeetings: "تحميل الاجتماعات...",
      scheduled_badge: "مجدول",
      active_badge: "نشط",
      ended_badge: "منتهي",
      participants: "المشاركون",
      host: "المضيف",
      newVideoConference: "مؤتمر فيديو جديد",
      meetingTitle: "عنوان الاجتماع *",
      meetingPlaceholder: "اجتماع الفريق...",
      description: "الوصف",
      descriptionPlaceholder: "جدول الأعمال، معلومات مهمة...",
      startImmediately: "ابدأ فوراً",
      dateTime: "التاريخ والوقت",
      participants_select: "المشاركون",
      noSpecialistsAvailable: "لا يوجد متخصصون متاحون",
      participantsSelected: "مشارك (مشاركون) محدد",
      connectionError: "خطأ في مؤتمر الفيديو",
      meetingCreated: "تم إنشاء الاجتماع",
      meetingCreatedDesc: "تم إنشاء الاجتماع بنجاح",
      cannotCreateMeeting: "لا يمكن إنشاء الاجتماع",
      meetingJoined: "تم الانضمام للاجتماع",
      meetingJoinedDesc: "لقد انضممت للاجتماع بنجاح",
      cannotJoinMeeting: "لا يمكن الانضمام للاجتماع",
      meetingEnded: "تم إنهاء الاجتماع",
      meetingEndedDesc: "تم إنهاء الاجتماع بنجاح",
      cannotEndMeeting: "لا يمكن إنهاء الاجتماع",
      meetingIdCopied: "تم نسخ معرف الاجتماع",
      meetingIdCopiedDesc: "تم نسخ معرف الاجتماع إلى الحافظة",
      copyMeetingId: "نسخ المعرف",
      invalidMeetingId: "معرف اجتماع غير صالح",
      enterValidMeetingId: "يرجى إدخال معرف اجتماع صالح"
    },
    heroSection: {
      title: "بسّط إدارة مشاريع البناء الخاصة بك",
      subtitle: "قم بتبسيط سير العمل، وتعزيز التواصل، وتسليم المشاريع في الوقت المحدد مع APHS - الحل الشامل لإدارة مشاريع البناء.",
      cta: {
        primary: "ابدأ النسخة التجريبية المجانية",
        secondary: "شاهد العرض التوضيحي"
      }
    },
    featuresSection: {
      title: "ميزات قوية لمحترفي البناء",
      subtitle: "كل ما تحتاجه لإدارة مشاريع البناء المعقدة بكفاءة في منصة واحدة.",
      features: [
        {
          title: "تتبع المشروع في الوقت الفعلي",
          description: "مراقبة جميع مشاريعك في الوقت الفعلي مع لوحات التحكم والتحليلات الشاملة."
        },
        {
          title: "إدارة الموارد",
          description: "تخصيص الموارد بكفاءة، وتتبع الاستخدام، وتحسين تخطيط القوى العاملة."
        },
        {
          title: "التحكم في الوثائق",
          description: "مركزية جميع وثائق المشروع، مما يضمن وصول الجميع إلى أحدث الإصدارات."
        },
        {
          title: "مراقبة الميزانية",
          description: "تتبع النفقات مقابل الميزانيات في الوقت الفعلي لمنع تجاوز التكاليف."
        },
        {
          title: "أتمتة المهام",
          description: "أتمتة المهام الروتينية والإشعارات لتوفير الوقت وتقليل الأخطاء."
        },
        {
          title: "أدوات التعاون",
          description: "تعزيز التواصل في الفريق مع المراسلة المدمجة ومشاركة الملفات."
        }
      ]
    },
    benefitsSection: {
      title: "حوّل إدارة البناء الخاصة بك",
      subtitle: "نتائج حقيقية من شركات البناء مثل شركتك التي نفذت APHS.",
      benefits: [
        {
          title: "تسليم المشروع أسرع بنسبة 15%",
          description: "تسريع الجداول الزمنية للمشروع من خلال سير عمل مبسط والأتمتة."
        },
        {
          title: "تخفيض التكاليف بنسبة 10%",
          description: "تقليل تجاوزات الميزانية مع التتبع المالي في الوقت الفعلي والتحليلات."
        },
        {
          title: "تحسين تعاون الفريق بنسبة 30%",
          description: "تعزيز التواصل وتقليل الأخطاء مع المعلومات المركزية."
        }
      ],
      cta: {
        title: "هل أنت مستعد لإحداث ثورة في طريقة إدارتك لمشاريع البناء؟",
        subtitle: "انضم إلى مئات شركات البناء التي توفر بالفعل الوقت والمال مع APHS.",
        button: "احجز عرضًا توضيحيًا"
      }
    },
    testimonialsSection: {
      title: "ما يقوله عملاؤنا",
      subtitle: "لا تأخذ كلمتنا فقط - اسمع من محترفي البناء الذين يستخدمون APHS."
    },
    aboutSection: {
      title: "من نحن",
      subtitle: "تعرف على الفريق وراء APHS، المكرس لإحداث ثورة في إدارة مشاريع البناء.",
      mission: {
        title: "مهمتنا",
        content: "في APHS، نلتزم بتبسيط إدارة مشاريع البناء من خلال التكنولوجيا المبتكرة، مما يساعد الفرق على توفير الوقت وتقليل التكاليف وتحسين التعاون.",
        vision: "رؤيتنا هي أن نصبح المعيار الصناعي لإدارة مشاريع البناء في جميع أنحاء العالم."
      },
      values: {
        title: "قيمنا",
        list: [
          "التميز في كل ما نقوم به",
          "الابتكار الذي يحل المشكلات الحقيقية",
          "نجاح العميل هو نجاحنا",
          "الشفافية والنزاهة"
        ]
      }
    },
    ctaSection: {
      title: "هل أنت مستعد لتحويل إدارة البناء الخاصة بك؟",
      subtitle: "ابدأ مع APHS اليوم وانضم إلى مئات شركات البناء التي تحسن بالفعل نتائج مشاريعها.",
      buttons: {
        trial: "ابدأ الآن",
        demo: "احجز عرضًا توضيحيًا"
      },
      testimonial: {
        quote: "قمنا بتقليل تأخيرات المشروع بنسبة 20%",
        author: "ديفيد ميلر، مدير المشروع"
      },
      form: {
        name: "الاسم الكامل",
        email: "البريد الإلكتروني للعمل",
        company: "الشركة",
        submit: "ابدأ الآن"
      }
    },
    footer: {
      copyright: "© 2025 APHS. جميع الحقوق محفوظة."
    },
    projects: {
      title: "مشاريعي",
      subtitle: "تحقق من المشاريع التي تم تعيينك فيها",
      specialistMode: "وضع الخبير",
      search: {
        placeholder: "البحث عن مشروع...",
        results: "مشروع (م) تم العثور عليه (م)"
      },
      empty: {
        noProjects: "لا توجد مشاريع مخصصة",
        noProjectsDesc: "لم تُعين إلى أي مشروع في الوقت الحالي",
        noResults: "لم يتم العثور على مشروع",
        noResultsDesc: "حاول بكلمات بحث أخرى"
      },
      card: {
        startDate: "بداية",
        progress: "تقدم",
        tasksCompleted: "مهام مكتملة",
        member: "أعضاء",
        view: "إظهار"
      },
      status: {
        active: "نشط",
        completed: "مكتمل",
        paused: "موقف",
        cancelled: "ملغي"
      }
    },
    projectDetails: {
      back: "العودة إلى المشاريع",
      tabs: {
        info: "معلومات المشروع",
        structure: "هيكل المشروع",
        tasks: "مهامي"
      },
      info: {
        title: "المعلومات العامة",
        description: "الوصف",
        startDate: "تاريخ البدء",
        status: "الحالة",
        members: "أعضاء المشروع",
        noMembers: "لم يتم تعيين عضو"
      },
      structure: {
        title: "هيكل المشروع",
        conception: "التصميم",
        realization: "التنفيذ",
        noTasks: "لا توجد مهمة في هذا القسم",
        viewInfoSheet: "إظهار ورقة معلومات",
        downloadInfoSheet: "تحميل ورقة معلومات"
      },
      tasks: {
        title: "مهامي المعينة",
        noTasks: "لم تُعين مهمة",
        deadline: "الموعد",
        validationDeadline: "موعد التحقق",
        assignedTo: "معين ل",
        validators: "المعالجين",
        status: "الحالة",
        actions: "الإجراءات",
        viewDetails: "إظهار التفاصيل",
        submit: "إرسال",
        download: "تحميل"
      },
      taskDetails: {
        title: "تفاصيل المهمة",
        close: "إغلاق",
        taskName: "اسم المهمة",
        phase: "المرحلة",
        section: "القسم",
        subsection: "القسم الفرعي",
        assignedTo: "معين ل",
        deadline: "الموعد",
        validationDeadline: "موعد التحقق",
        validators: "المعالجين",
        status: "الحالة",
        comment: "تعليق",
        validationComment: "تعليق التحقق",
        submittedAt: "إرسال في",
        validatedAt: "تم التحقق في",
        validatedBy: "تم التحقق بواسطة",
        file: "الملف",
        noFile: "لا يوجد ملف",
        fileFormat: "تنسيق الملف",
        document: "المستند",
        downloadDocument: "تحميل المستند",
        backToProjects: "العودة إلى المشاريع",
        noTasksAssigned: "لا توجد مهام مخصصة",
        noTasksMessage: "هذا المشروع ليس لديه مهام مخصصة في الوقت الحالي.",
        projectOverview: "نظرة عامة على المشروع",
        projectDescription: "الوصف",
        projectStartDate: "تاريخ البداية",
        completionRate: "معدل الإنجاز",
        progress: "التقدم",
        tasksValidated: "المهام المعتمدة",
        assignedIntervenants: "المختصون المخصصون",
        activeMember: "عضو نشط",
        tasksAssigned: "المهام المخصصة",
        loading: "جاري التحميل...",
        error: "خطأ",
        projectNotFound: "المشروع غير موجود",
        projectNotFoundMessage: "المشروع الذي تبحث عنه غير موجود أو تم حذفه.",
        cannotLoadDetails: "تعذر تحميل تفاصيل المشروع",
        cannotLoadTasks: "خطأ في استرداد المهام",
        statusLabels: {
          assigned: "مخصص",
          in_progress: "قيد التقدم",
          submitted: "مرسل",
          validated: "معتمد",
          rejected: "مرفوض"
        }
      },
      infoSheet: {
        title: "ورقة معلومات",
        close: "إغلاق",
        loading: "تحميل ورقة المعلومات...",
        error: "خطأ عند تحميل ورقة المعلومات"
      }
    },
    tasks: {
      title: "مهامي",
      subtitle: "إدارة المهام المخصصة لك",
      search: {
        placeholder: "البحث عن مهمة...",
        noResults: "لم يتم العثور على مهام"
      },
      filters: {
        all: "الكل",
        assigned: "مخصصة",
        inProgress: "قيد التنفيذ",
        submitted: "مرسلة",
        validated: "معتمدة",
        rejected: "مرفوضة",
        phase: "المرحلة",
        allPhases: "جميع المراحل",
        conception: "التصميم",
        realization: "التنفيذ"
      },
      status: {
        assigned: "مخصصة",
        inProgress: "قيد التنفيذ",
        submitted: "مرسلة",
        validated: "معتمدة",
        rejected: "مرفوضة"
      },
      card: {
        deadline: "الموعد النهائي",
        validationDeadline: "التحقق",
        phase: "المرحلة",
        section: "القسم",
        project: "المشروع",
        viewDetails: "عرض التفاصيل",
        submit: "إرسال",
        download: "تحميل"
      },
      empty: {
        noTasks: "لا توجد مهام مخصصة",
        noTasksDesc: "ليس لديك مهام مخصصة في الوقت الحالي",
        noResults: "لم يتم العثور على مهام",
        noResultsDesc: "لا توجد مهام تطابق معايير البحث الخاصة بك"
      },
      details: {
        title: "تفاصيل المهمة",
        taskName: "اسم المهمة",
        project: "المشروع",
        phase: "المرحلة",
        section: "القسم",
        subsection: "القسم الفرعي",
        assignedTo: "مخصصة لـ",
        deadline: "الموعد النهائي",
        validationDeadline: "موعد التحقق",
        validators: "المدققين",
        status: "الحالة",
        comment: "تعليق",
        validationComment: "تعليق التحقق",
        submittedAt: "أرسلت في",
        validatedAt: "اعتمدت في",
        validatedBy: "اعتمدت بواسطة",
        file: "الملف",
        noFile: "لا يوجد ملف",
        actions: "الإجراءات",
        close: "إغلاق"
      }
    }
  }
};
