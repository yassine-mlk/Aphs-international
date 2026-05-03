import { sendNotification, getUserName } from './sendNotification';

/**
 * Notifier un membre quand il est ajouté à un projet
 */
export async function notifyMemberAdded(payload: {
  userId: string;
  projectName: string;
  addedByName: string;
  role: string;
}) {
  await sendNotification({
    userId: payload.userId,
    type: 'member_added',
    title: `🎉 Bienvenue dans le projet ${payload.projectName}`,
    message: `Vous avez été ajouté au projet ${payload.projectName} par ${payload.addedByName} en tant que ${payload.role}.`,
    link: '/dashboard/projets',
    sendEmail: true,
    emailData: {
      to: '', // Récupéré auto
      subject: `Vous avez été ajouté au projet ${payload.projectName}`,
      template: 'member_added',
      variables: {
        projectName: payload.projectName,
        addedByName: payload.addedByName,
        role: payload.role,
        appUrl: window.location.origin
      }
    }
  });
}
