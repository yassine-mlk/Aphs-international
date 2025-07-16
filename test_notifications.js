// Script de test pour vérifier les notifications
// À exécuter dans la console du navigateur

// Test des notifications
async function testNotifications() {
  console.log('🧪 Test des notifications...');
  
  try {
    // Simuler une notification de changement de statut
    const testNotification = {
      user_id: 'test-user-id',
      type: 'task_status_changed',
      title: 'Test de notification',
      message: 'Ceci est un test de notification',
      data: {
        taskName: 'Tâche de test',
        statusLabel: 'validée',
        userName: 'Utilisateur Test',
        projectName: 'Projet Test'
      }
    };
    
    // Vérifier si la table notifications existe
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur lors de la vérification de la table notifications:', error);
      return;
    }
    
    console.log('✅ Table notifications accessible');
    
    // Vérifier les types de notifications supportés
    const { data: types, error: typesError } = await supabase
      .from('notifications')
      .select('type')
      .limit(10);
    
    if (typesError) {
      console.error('❌ Erreur lors de la récupération des types:', typesError);
    } else {
      console.log('📋 Types de notifications existants:', [...new Set(types.map(n => n.type))]);
    }
    
    // Vérifier les membres d'un projet
    const { data: members, error: membersError } = await supabase
      .from('membre')
      .select('*')
      .limit(5);
    
    if (membersError) {
      console.error('❌ Erreur lors de la récupération des membres:', membersError);
    } else {
      console.log('👥 Membres trouvés:', members.length);
    }
    
    // Vérifier les tâches assignées
    const { data: tasks, error: tasksError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(5);
    
    if (tasksError) {
      console.error('❌ Erreur lors de la récupération des tâches:', tasksError);
    } else {
      console.log('📋 Tâches trouvées:', tasks.length);
      if (tasks.length > 0) {
        console.log('📋 Exemple de tâche:', tasks[0]);
      }
    }
    
    console.log('✅ Test terminé');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test des fonctions de notification
async function testNotificationFunctions() {
  console.log('🧪 Test des fonctions de notification...');
  
  try {
    // Simuler une notification pour tous les membres d'un projet
    const projectId = 'test-project-id';
    
    // Récupérer les membres du projet
    const { data: members, error: membersError } = await supabase
      .from('membre')
      .select('user_id')
      .eq('project_id', projectId);
    
    if (membersError) {
      console.error('❌ Erreur lors de la récupération des membres:', membersError);
      return;
    }
    
    console.log('👥 Membres du projet:', members?.length || 0);
    
    // Créer une notification de test pour chaque membre
    if (members && members.length > 0) {
      const notificationPromises = members.map(member => 
        supabase
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'task_status_changed',
            title: 'Test de notification',
            message: 'Ceci est un test de notification pour tous les membres',
            data: {
              taskName: 'Tâche de test',
              statusLabel: 'validée',
              userName: 'Utilisateur Test',
              projectName: 'Projet Test'
            }
          })
      );
      
      const results = await Promise.all(notificationPromises);
      const successCount = results.filter(r => !r.error).length;
      
      console.log(`✅ ${successCount}/${results.length} notifications créées avec succès`);
      
      if (successCount < results.length) {
        console.log('❌ Erreurs lors de la création des notifications:');
        results.forEach((result, index) => {
          if (result.error) {
            console.error(`  - Membre ${index}:`, result.error);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test des fonctions:', error);
  }
}

// Fonction pour nettoyer les notifications de test
async function cleanupTestNotifications() {
  console.log('🧹 Nettoyage des notifications de test...');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('title', 'Test de notification');
    
    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    } else {
      console.log('✅ Notifications de test supprimées');
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécuter les tests
console.log('🚀 Démarrage des tests de notifications...');
testNotifications().then(() => {
  testNotificationFunctions().then(() => {
    console.log('🎉 Tous les tests terminés');
  });
});

// Exporter les fonctions pour utilisation manuelle
window.testNotifications = testNotifications;
window.testNotificationFunctions = testNotificationFunctions;
window.cleanupTestNotifications = cleanupTestNotifications; 