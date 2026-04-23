// Traductions en français uniquement - Site monolingue
// Ce fichier a été simplifié pour ne garder que le français

export const translations = {
  fr: {
    meta: {
      title: "APS | Gestion de Projets de Construction",
      description: "Logiciel avancé de gestion de projets de construction aidant les équipes à livrer des projets à temps et dans les limites du budget."
    },
    navbar: {
      home: "Accueil",
      accompagnement: "Accompagnement",
      support: "Fonctionnalités",
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
      forgotPassword: "Mot de passe oublié ?",
      loginButton: "Se connecter",
      loadingButton: "Connexion en cours...",
      contactAdmin: "Contactez votre administrateur si vous n'avez pas de compte.",
      welcomeTitle: "Bienvenue sur la plateforme",
      welcomeSubtitle: "Gérez vos projets et collaborez efficacement avec tous vos intervenants.",
      projectManagement: "Gestion de Projets",
      projectManagementDesc: "Suivez l'avancement de vos projets en temps réel",
      collaboration: "Collaboration",
      collaborationDesc: "Travaillez en équipe avec des outils puissants",
      communication: "Communication",
      communicationDesc: "Échangez avec vos collaborateurs rapidement",
      analysis: "Analyse",
      analysisDesc: "Consultez des rapports détaillés sur vos activités"
    },
    sidebar: {
      dashboard: "Tableau de bord",
      projects: "Projets",
      myProjects: "Mes Projets",
      tasks: "Tâches",
      intervenants: "Intervenants",
      companies: "Entreprises",
      workgroups: "Groupes de travail",
      messages: "Messages",
      videoconference: "Visioconférence",
      settings: "Paramètres"
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
      },
      masterOwner: {
        title: "Project Owner Dashboard",
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
    notifications: {
      // Types de notifications système
      types: {
        file_uploaded: {
          title: "Nouveau fichier uploadé",
          message: "{uploaderName} uploaded the file \"{fileName}\"{projectName, select, undefined {} other { in project {projectName}}}"
        },
        task_validated: {
          title: "Task validated",
          message: "{validatorName} validated the task \"{taskName}\"{projectName, select, undefined {} other { in project {projectName}}}"
        },
        message_received: {
          title: "New message",
          message: "You received a new message from {senderName}{subject, select, undefined {} other { : \"{subject}\"}}"
        },
        meeting_request: {
          title: "Meeting request",
          message: "{requesterName} requested a meeting: \"{meetingTitle}\" scheduled for {scheduledDate}"
        },
        document_signed: {
          title: "Document signed",
          message: "{signerName} signed the document \"{documentName}\"{projectName, select, undefined {} other { for project {projectName}}}"
        },
        document_rejected: {
          title: "Document refused",
          message: "{signerName} refused to sign the document \"{documentName}\"{projectName, select, undefined {} other { for project {projectName}}}{reason, select, undefined {} other {. Reason: {reason}}}"
        },
        task_assigned: {
          title: "New task assigned",
          message: "A new task \"{taskName}\" has been assigned to you{projectName, select, undefined {} other { for project {projectName}}}{assignerName, select, undefined {} other { by {assignerName}}}"
        },
        project_added: {
          title: "Added to new project",
          message: "You have been added to project \"{projectName}\"{adminName, select, undefined {} other { by {adminName}}}"
        },
        task_validation_request: {
          title: "Task validation request",
          message: "{intervenantName} requests validation of task \"{taskName}\"{projectName, select, undefined {} other { in project {projectName}}}"
        },
        file_validation_request: {
          title: "File to validate",
          message: "{uploaderName} uploaded the file \"{fileName}\" that requires your validation{projectName, select, undefined {} other { for project {projectName}}}"
        },
        meeting_request_approved: {
          title: "Meeting request approved",
          message: "Your meeting request \"{meetingTitle}\" has been approved{adminName, select, undefined {} other { by {adminName}}}{responseMessage, select, undefined {} other {. Message: {responseMessage}}}"
        },
        meeting_request_rejected: {
          title: "Meeting request rejected",
          message: "Your meeting request \"{meetingTitle}\" has been rejected{adminName, select, undefined {} other { by {adminName}}}{responseMessage, select, undefined {} other {. Message: {responseMessage}}}"
        },
        meeting_invitation: {
          title: "Meeting invitation",
          message: "{organizerName} invites you to the meeting \"{meetingTitle}\" scheduled for {scheduledDate}"
        },
        meeting_started: {
          title: "Meeting started",
          message: "The meeting \"{meetingTitle}\" has started! Join now."
        }
      },
      // Messages toast communs
      common: {
        success: "Success",
        error: "Error",
        warning: "Warning",
        info: "Information",
        loading: "Loading...",
        saved: "Saved successfully",
        deleted: "Deleted successfully",
        updated: "Updated successfully",
        created: "Created successfully",
        cancelled: "Cancelled",
        confirm: "Are you sure?",
        confirmDelete: "Are you sure you want to delete this item?",
        cannotUndo: "This action cannot be undone.",
        networkError: "Network error",
        checkConnection: "Please check your internet connection",
        unknownError: "An unknown error occurred",
        tryAgain: "Please try again",
        missingFields: "Please fill in all required fields",
        invalidEmail: "Please enter a valid email address",
        passwordTooShort: "Password must be at least 6 characters long",
        passwordsDontMatch: "Passwords do not match",
        fileUploadError: "Error uploading file",
        fileTooLarge: "File is too large",
        invalidFileType: "Invalid file type",
        taskSubmitted: "Task submitted successfully",
        taskAssigned: "Task assigned successfully",
        taskUpdated: "Assignment updated successfully",
        meetingRequested: "Meeting request sent successfully",
        cannotSendMeetingRequest: "Unable to send your meeting request",
        missingTitle: "Title missing",
        enterMeetingTitle: "Please enter a title for the meeting request",
        missingDate: "Date missing",
        selectMeetingDate: "Please select a date for the meeting",
        missingProject: "Project missing",
        selectProjectForMeeting: "Please select a project for this meeting",
        requestSent: "Request sent",
        cannotSubmitTask: "Unable to submit task",
        companyCreated: "Company \"{name}\" has been created successfully",
        companyUpdated: "Company \"{name}\" has been updated successfully",
        cannotCreateCompany: "Unable to create company. Check the information and try again.",
        cannotUpdateCompany: "Unable to update company. Check the information and try again.",
        passwordUpdateError: "Unable to update your password",
        notificationPrefsError: "Unable to update your notification preferences",
        // Propriétés pour l'interface des notifications
        notifications: "Notifications",
        markAllRead: "Mark all as read",
        noNotifications: "No important notifications",
        viewAll: "View recent activity"
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
      admin: {
        deleteConversation: "Delete Conversation",
        deleteConfirmTitle: "Delete Conversation",
        deleteConfirmMessage: "Are you sure you want to delete this conversation? This action cannot be undone and will permanently delete all messages.",
        deleteSuccess: "Conversation deleted successfully",
        deleteError: "Error deleting conversation",
        cannotDeleteWorkgroup: "Cannot delete workgroup conversations",
        accessDenied: "Access denied: Admin permissions required"
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
      subtitle: "Streamline workflows, enhance communication, and deliver projects on time with APS : the all-in-one construction project management solution.",
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
      subtitle: "Real results from construction companies like yours who implemented APS.",
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
        subtitle: "Join hundreds of construction companies already saving time and money with APS.",
        button: "Book a Demo"
      }
    },
    testimonialsSection: {
      title: "What Our Clients Say",
      subtitle: "Don't take our word for it - hear from construction professionals using APS."
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
      subtitle: "Get started with APS today and join hundreds of construction companies already improving their project outcomes.",
      buttons: {
        trial: "Start",
        demo: "Book a Demo"
      },
      form: {
        name: "Full Name",
        email: "Work Email",
        company: "Company",
        submit: "Get Started"
      }
    },
    footer: {
      copyright: "© 2026 APS. All rights reserved.",
      description: "Advanced construction project management software helping teams deliver projects on time and within budget.",
      sections: {
        product: {
          title: "Product",
          features: "Features",
          pricing: "Pricing",
          demo: "Request Demo"
        },
        company: {
          title: "Company",
          about: "About Us",
          careers: "Careers",
          contact: "Contact"
        },
        legal: {
          title: "Legal",
          privacy: "Privacy Policy",
          terms: "Terms of Service",
          cookies: "Cookie Policy",
          legalNotice: "Legal Notice"
        }
      }
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
        noResults: "No tasks found",
        label: "Search"
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
        realization: "Realization",
        statusLabel: "Status",
        clearFilters: "Clear filters",
        clear: "Clear",
        project: "Project",
        allProjects: "All projects",
        sortBy: "Sort by",
        deadline: "Deadline",
        taskName: "Task name",
        order: "Order",
        ascending: "Ascending",
        descending: "Descending"
      },
      status: {
        assigned: "Assigned",
        inProgress: "In Progress",
        submitted: "Submitted",
        validated: "Validated",
        rejected: "Rejected",
        unknown: "Unknown"
      },
      card: {
        deadline: "Deadline",
        validationDeadline: "Validation",
        phase: "Phase",
        section: "Section",
        project: "Project",
        viewDetails: "View details",
        submit: "Submit",
        download: "Download",
        task: "Task",
        taskList: "Task list",
        taskListDesc: "Click on a task to view details.",
        type: "Type"
      },
      empty: {
        noTasks: "No assigned tasks",
        noTasksDesc: "You have no assigned tasks at the moment",
        noResults: "No tasks found",
        noResultsDesc: "No tasks match your search criteria"
      },
      dateFormat: {
        invalidDate: "Invalid date",
        today: "Today",
        daysRemaining: "days remaining",
        daysOverdue: "days overdue",
        overdue: "Overdue by"
      },
      messages: {
        warning: "Warning",
        error: "Error",
        errorLoadingTasks: "Unable to load your tasks",
        errorLoadingProjects: "Unable to load projects"
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
        close: "Close",
        taskNotFound: "Task not found",
        taskNotFoundMessage: "The task you are looking for does not exist or has been deleted.",
        backToTasks: "Back to tasks",
        assignedSpecialist: "Assigned specialist",
        validationDeadlineShort: "Validation deadline",
        submissionDeadline: "Submission deadline",
        expectedFileFormat: "Expected file format",
        instructions: "Instructions",
        submittedFile: "Submitted file",
        downloadFile: "Download",
        infoSheet: "Info sheet",
        referenceDocument: "Reference document",
        clickToExpand: "Click to expand",
        clickToCollapse: "Click to collapse",
        detailedInstructions: "Click to view detailed instructions",
        history: "History",
        taskCreated: "Task created",
        noValidators: "No validators defined",
        unassigned: "Unassigned",
        overdue: "Overdue",
        remainingDays: "days remaining",
        start: "Start",
        submit: "Submit",
        validate: "Validate",
        reject: "Reject",
        finalize: "Finalize",
        pendingValidation: "Pending validation - waiting for validators to review",
        pendingSubmission: "Pending submission - task has been submitted but not yet validated",
        fileTypes: {
          pdf: "PDF Document (.pdf)",
          doc: "Word Document (.doc, .docx)",
          xls: "Excel Spreadsheet (.xls, .xlsx)",
          ppt: "PowerPoint Presentation (.ppt, .pptx)",
          txt: "Text File (.txt)",
          jpg: "JPEG Image (.jpg, .jpeg)",
          png: "PNG Image (.png)",
          zip: "ZIP Archive (.zip)",
          dwg: "AutoCAD Drawing (.dwg)",
          other: "Other format"
        },
                 toasts: {
           success: "Success",
           error: "Error",
           taskStarted: "Task started successfully",
           taskSubmitted: "Task submitted successfully",
           taskValidated: "Task validated successfully",
           taskRejected: "Task rejected",
           taskFinalized: "Task finalized and permanently closed",
           cannotLoadDetails: "Unable to load task details",
           cannotStartTask: "Unable to start task",
           cannotSubmitTask: "Unable to submit task",
           cannotValidateTask: "Unable to validate task",
           cannotRejectTask: "Unable to reject task",
           cannotFinalizeTask: "Unable to finalize task"
         },
         taskFinalized: "This task has been finalized and permanently closed by administration"
      }
    }
  },
  fr: {
    meta: {
      title: "APS | Gestion de Projets de Construction",
      description: "Logiciel avancé de gestion de projets de construction aidant les équipes à livrer des projets à temps et dans les limites du budget."
    },
    navbar: {
      home: "Accueil",
      accompagnement: "Accompagnement",
      support: "Fonctionnalités",
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
      subtitle: "Rationalisez les flux de travail, améliorez la communication et livrez les projets à temps avec APS : la solution tout-en-un de gestion de projets de construction.",
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
      subtitle: "Résultats réels d'entreprises de construction comme la vôtre qui ont mis en œuvre APS.",
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
        subtitle: "Rejoignez des centaines d'entreprises de construction qui économisent déjà du temps et de l'argent avec APS.",
        button: "Réserver une Démo"
      }
    },
    testimonialsSection: {
      title: "Ce que Disent Nos Clients",
      subtitle: "Ne nous croyez pas sur parole - écoutez les professionnels de la construction qui utilisent APS."
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
      subtitle: "Commencez avec APS aujourd'hui et rejoignez des centaines d'entreprises de construction qui améliorent déjà leurs résultats de projet.",
      buttons: {
        trial: "Démarrer",
        demo: "Réserver une Démo"
      },
      form: {
        name: "Nom Complet",
        email: "Email Professionnel",
        company: "Entreprise",
        submit: "Commencer"
      }
    },
    footer: {
      copyright: "© 2026 APS. Tous droits réservés.",
      description: "Logiciel de gestion de projets de construction avancé aidant les équipes à livrer leurs projets à temps et en respectant le budget.",
      sections: {
        product: {
          title: "Produit",
          features: "Fonctionnalités",
          pricing: "Tarification",
          demo: "Demander une Démo"
        },
        company: {
          title: "Entreprise",
          about: "À propos",
          careers: "Carrières",
          contact: "Contact"
        },
        legal: {
          title: "Légal",
          privacy: "Politique de confidentialité",
          terms: "Conditions d'utilisation",
          cookies: "Politique de cookies",
          legalNotice: "Mentions légales"
        }
      }
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
      },
      masterOwner: {
        title: "Tableau de Bord Maître d'ouvrage",
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
    notifications: {
      // Types de notifications système
      types: {
        file_uploaded: {
          title: "Nouveau fichier uploadé",
          message: "{uploaderName} a uploadé le fichier \"{fileName}\"{projectName, select, undefined {} other { dans le projet {projectName}}}"
        },
        task_validated: {
          title: "Tâche validée",
          message: "{validatorName} a validé la tâche \"{taskName}\"{projectName, select, undefined {} other { du projet {projectName}}}"
        },
        message_received: {
          title: "Nouveau message",
          message: "Vous avez reçu un nouveau message de {senderName}{subject, select, undefined {} other { : \"{subject}\"}}"
        },
        meeting_request: {
          title: "Demande de réunion",
          message: "{requesterName} a demandé une réunion : \"{meetingTitle}\" prévue le {scheduledDate}"
        },
        task_assigned: {
          title: "Nouvelle tâche assignée",
          message: "Une nouvelle tâche \"{taskName}\" vous a été assignée{projectName, select, undefined {} other { pour le projet {projectName}}}{assignerName, select, undefined {} other { par {assignerName}}}"
        },
        project_added: {
          title: "Ajouté à un nouveau projet",
          message: "Vous avez été ajouté au projet \"{projectName}\"{adminName, select, undefined {} other { par {adminName}}}"
        },
        task_validation_request: {
          title: "Demande de validation de tâche",
          message: "{intervenantName} demande la validation de la tâche \"{taskName}\"{projectName, select, undefined {} other { du projet {projectName}}}"
        },
        file_validation_request: {
          title: "Fichier à valider",
          message: "{uploaderName} a uploadé le fichier \"{fileName}\" qui nécessite votre validation{projectName, select, undefined {} other { pour le projet {projectName}}}"
        },
        task_status_changed: {
          title: "Statut de tâche modifié",
          message: "{userName} a {statusLabel} la tâche \"{taskName}\"{projectName, select, undefined {} other { du projet {projectName}}}"
        },
        meeting_request_approved: {
          title: "Demande de réunion approuvée",
          message: "Votre demande de réunion \"{meetingTitle}\" a été approuvée{adminName, select, undefined {} other { par {adminName}}}{responseMessage, select, undefined {} other {. Message : {responseMessage}}}"
        },
        meeting_request_rejected: {
          title: "Demande de réunion refusée",
          message: "Votre demande de réunion \"{meetingTitle}\" a été refusée{adminName, select, undefined {} other { par {adminName}}}{responseMessage, select, undefined {} other {. Message : {responseMessage}}}"
        },
        meeting_invitation: {
          title: "Invitation à une réunion",
          message: "{organizerName} vous invite à la réunion \"{meetingTitle}\" prévue le {scheduledDate}"
        },
        meeting_started: {
          title: "Réunion démarrée",
          message: "La réunion \"{meetingTitle}\" a démarré ! Rejoignez-la maintenant."
        }
      },
      // Messages toast communs
      common: {
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
        checkConnection: "Veuillez vérifier votre connexion Internet",
        unknownError: "Une erreur inconnue s'est produite",
        tryAgain: "Veuillez réessayer",
        missingFields: "Veuillez remplir tous les champs obligatoires",
        invalidEmail: "Veuillez saisir une adresse email valide",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
        passwordsDontMatch: "Les mots de passe ne correspondent pas",
        fileUploadError: "Erreur lors de l'upload du fichier",
        fileTooLarge: "Le fichier est trop volumineux",
        invalidFileType: "Type de fichier invalide",
        taskSubmitted: "Tâche soumise avec succès",
        taskAssigned: "Tâche assignée avec succès",
        taskUpdated: "Assignation mise à jour avec succès",
        meetingRequested: "Demande de réunion envoyée avec succès",
        cannotSendMeetingRequest: "Impossible d'envoyer votre demande de réunion",
        missingTitle: "Titre manquant",
        enterMeetingTitle: "Veuillez saisir un titre pour la demande de réunion",
        missingDate: "Date manquante",
        selectMeetingDate: "Veuillez sélectionner une date pour la réunion",
        missingProject: "Projet manquant",
        selectProjectForMeeting: "Veuillez sélectionner un projet pour cette réunion",
        requestSent: "Demande envoyée",
        cannotSubmitTask: "Impossible de soumettre la tâche",
        companyCreated: "L'entreprise \"{name}\" a été créée avec succès",
        companyUpdated: "L'entreprise \"{name}\" a été mise à jour avec succès",
        cannotCreateCompany: "Impossible de créer l'entreprise. Vérifiez les informations et réessayez.",
        cannotUpdateCompany: "Impossible de modifier l'entreprise. Vérifiez les informations et réessayez.",
        passwordUpdateError: "Impossible de mettre à jour votre mot de passe",
        notificationPrefsError: "Impossible de mettre à jour vos préférences de notification"
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
      admin: {
        deleteConversation: "Supprimer la conversation",
        deleteConfirmTitle: "Supprimer la conversation",
        deleteConfirmMessage: "Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action ne peut pas être annulée et supprimera définitivement tous les messages.",
        deleteSuccess: "Conversation supprimée avec succès",
        deleteError: "Erreur lors de la suppression de la conversation",
        cannotDeleteWorkgroup: "Impossible de supprimer les conversations de workgroup",
        accessDenied: "Accès refusé : Permissions administrateur requises"
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
        unknown: "Inconnue"
      },
      card: {
        deadline: "Échéance",
        validationDeadline: "Validation",
        phase: "Phase",
        section: "Section",
        project: "Projet",
        viewDetails: "Voir détails",
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
        overdue: "Dépassée de"
      },
      messages: {
        warning: "Avertissement",
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
        actions: "Actions",
        close: "Fermer",
        taskNotFound: "Tâche non trouvée",
        taskNotFoundMessage: "La tâche que vous recherchez n'existe pas ou a été supprimée.",
        backToTasks: "Retour aux tâches",
        assignedSpecialist: "Intervenant assigné",
        validationDeadlineShort: "Date limite de validation",
        submissionDeadline: "Date limite de livraison",
        expectedFileFormat: "Format de fichier attendu",
        instructions: "Instructions",
        submittedFile: "Fichier soumis",
        downloadFile: "Télécharger",
        infoSheet: "Fiche informative",
        referenceDocument: "Document de référence",
        clickToExpand: "Cliquez pour développer",
        clickToCollapse: "Cliquez pour réduire",
        detailedInstructions: "Cliquez pour afficher les instructions détaillées",
        history: "Historique",
        taskCreated: "Tâche créée",
        noValidators: "Aucun validateur défini",
        unassigned: "Non assigné",
        overdue: "Délai dépassé",
        remainingDays: "jours restants",
        start: "Démarrer",
        submit: "Soumettre",
        validate: "Valider",
        reject: "Rejeter",
        finalize: "Finaliser",
        pendingValidation: "En attente de validation - en attente de révision par les validateurs",
        pendingSubmission: "En attente de soumission - tâche soumise mais pas encore validée",
        fileTypes: {
          pdf: "Document PDF (.pdf)",
          doc: "Document Word (.doc, .docx)",
          xls: "Feuille de calcul Excel (.xls, .xlsx)",
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
         },
         taskFinalized: "Cette tâche a été finalisée et clôturée définitivement par l'administration"
      }
    }
  }
};
export default translations;
