import { useState } from 'react';
import { toast } from 'sonner';

interface ContactFormData {
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  fonction: string;
  telephone: string;
  nbProjets: string;
  message: string;
}

export const useContactForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    nom: '',
    prenom: '',
    email: '',
    entreprise: '',
    fonction: '',
    telephone: '',
    nbProjets: '1',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      toast.error('L\'email professionnel est requis');
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('L\'email n\'est pas valide');
      return false;
    }
    if (!formData.entreprise.trim()) {
      toast.error('La société est requise');
      return false;
    }
    if (!formData.fonction.trim()) {
      toast.error('Le poste / fonction est requis');
      return false;
    }
    if (!formData.telephone.trim()) {
      toast.error('Le téléphone est requis');
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
      // Note: Utilisation de contact@aps-construction.fr comme demandé
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'contact@aps-construction.fr',
          to: 'contact@aps-construction.fr',
          subject: `Demande APS - ${formData.prenom} ${formData.nom} (${formData.entreprise})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Nouvelle demande de contact / démo</h2>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin-bottom: 10px;"><strong>Identité:</strong> ${formData.prenom} ${formData.nom}</p>
                <p style="margin-bottom: 10px;"><strong>Société:</strong> ${formData.entreprise}</p>
                <p style="margin-bottom: 10px;"><strong>Poste:</strong> ${formData.fonction}</p>
                <p style="margin-bottom: 10px;"><strong>Email:</strong> <a href="mailto:${formData.email}" style="color: #2563eb;">${formData.email}</a></p>
                <p style="margin-bottom: 10px;"><strong>Téléphone:</strong> ${formData.telephone}</p>
                <p style="margin-bottom: 10px;"><strong>Projets à gérer:</strong> ${formData.nbProjets}</p>
                
                <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;">
                
                <p style="font-weight: bold; margin-bottom: 10px;">Message / Besoin spécifique:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.6;">
                  ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>Aucun message spécifique</em>'}
                </div>
              </div>
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                Cette demande a été envoyée depuis le formulaire de contact d'APS Construction.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        toast.success('Votre demande a été envoyée avec succès ! Un conseiller vous contactera sous 24h.');
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          entreprise: '',
          fonction: '',
          telephone: '',
          nbProjets: '1',
          message: ''
        });
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Contact error:', error);
      toast.error('Une erreur est survenue lors de l\'envoi. Veuillez réessayer plus tard ou nous contacter directement par email.');
    } finally {
      setIsLoading(true); // On laisse à true pour éviter le double clic ou on remet à false
      setIsLoading(false);
    }
  };

  return { formData, isLoading, handleInputChange, handleSubmit };
};
