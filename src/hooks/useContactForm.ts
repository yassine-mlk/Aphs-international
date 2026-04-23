import { useState } from 'react';
import { toast } from 'sonner';

interface ContactFormData {
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  message: string;
}

export const useContactForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    nom: '',
    prenom: '',
    email: '',
    entreprise: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.nom.trim()) {
      toast.error('Le nom est requis');
      return false;
    }
    if (!formData.prenom.trim()) {
      toast.error('Le prénom est requis');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('L\'email est requis');
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('L\'email n\'est pas valide');
      return false;
    }
    if (!formData.message.trim()) {
      toast.error('Le message est requis');
      return false;
    }
    if (formData.message.trim().length < 10) {
      toast.error('Le message doit contenir au moins 10 caractères');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Envoyer l'email via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'contact@aps-international.com',
          to: 'contact@aps-international.com',
          subject: `Nouveau message de ${formData.prenom} ${formData.nom}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Nouveau message de contact</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nom:</strong> ${formData.nom} ${formData.prenom}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Entreprise:</strong> ${formData.entreprise || 'Non spécifiée'}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
                <p><strong>Message:</strong></p>
                <p style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #1e40af;">
                  ${formData.message}
                </p>
              </div>
              <p style="color: #6c757d; font-size: 12px;">
                Envoyé depuis le formulaire de contact du site APS International
              </p>
            </div>
          `
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }

      toast.success('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
      
      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        entreprise: '',
        message: ''
      });
      
    } catch (error) {
      console.error('Erreur contact form:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    isLoading,
    handleInputChange,
    handleSubmit
  };
};
