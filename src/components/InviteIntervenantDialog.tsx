import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft, User, Building2, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useSupabase } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase';
import PasswordInput from '@/components/ui/password-input';
import { inviteIntervenant } from '@/lib/invite';

type Step = 'email' | 'invite' | 'create';

interface CheckResult {
  exists: boolean;
  firstName?: string;
  lastName?: string;
  userId?: string;
}

const CONCEPTION_SPECIALTIES = [
  'MOA Maître d\'ouvrage', 'AMO Assistant maîtrise d\'ouvrage', 'Géomètre',
  'MOE Maître d\'oeuvre', 'Commission de sécurité', 'Monuments historiques',
  'Elus locaux', 'Futurs usagers', 'Gestionnaire', 'Programmiste',
  'Architectes', 'Membres du Jury', 'Bureau de contrôle',
  'Bureau d\'étude de sol', 'Bureau d\'étude structure',
  'Bureau d\'étude thermique', 'Bureau d\'étude acoustique',
  'Bureau d\'étude électricité',
  'Bureau d\'étude plomberie, chauffage, ventilation, climatisation',
  'Bureau d\'étude VRD voirie, réseaux divers', 'Architecte d\'intérieur',
  'COORDINATEUR OPC', 'COORDINATEUR SPS', 'COORDINATEUR SSI',
];

const REALISATION_SPECIALTIES = [
  'Entreprise fondation', 'Entreprise Gros-Œuvre',
  'Entreprise VRD voirie-réseaux divers',
  'Entreprise Charpente/Couverture/Étanchéité',
  'Entreprise Menuiseries extérieures', 'Entreprise Menuiseries intérieures',
  'Entreprise Électricité', 'Entreprise Plomberie/Chauffage/Ventilation/Climatisation',
  'Entreprise Cloison/Doublage', 'Entreprise Revêtement de sol',
  'Entreprise Métallerie/Serrurerie', 'Entreprise Peinture',
  'Entreprise Ascenseur', 'Entreprise Agencement',
  'Entreprise Paysage/Espace vert', 'Fournisseurs indirects',
  'Services extérieurs',
];

interface InviteIntervenantDialogProps {
  onSuccess?: () => void;
}

const InviteIntervenantDialog: React.FC<InviteIntervenantDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [company, setCompany] = useState('Indépendant');
  const [companyId, setCompanyId] = useState('');
  const [companyInputMode, setCompanyInputMode] = useState<'select' | 'input'>('select');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'exists' | 'error'; message: string } | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { adminCreateUser, getCompanies } = useSupabase();

  const reset = () => {
    setStep('email');
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setCategory('');
    setSpecialty('');
    setCompany('Indépendant');
    setCompanyId('');
    setCompanyInputMode('select');
    setResult(null);
    setCheckResult(null);
  };

  useEffect(() => {
    if (open) {
      setLoadingCompanies(true);
      getCompanies().then(data => {
        setCompanies(data);
        setLoadingCompanies(false);
      }).catch(() => setLoadingCompanies(false));
    }
  }, [open, getCompanies]);

  const getSpecialtiesByCategory = useCallback((cat: string) => {
    return cat === 'conception' ? CONCEPTION_SPECIALTIES :
           cat === 'realisation' ? REALISATION_SPECIALTIES :
           [];
  }, []);

  useEffect(() => {
    setSpecialty('');
  }, [category]);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    setIsSubmitting(false);

    if (profile) {
      setCheckResult({
        exists: true,
        firstName: profile.first_name || firstName,
        lastName: profile.last_name || lastName,
        userId: profile.user_id,
      });
      setStep('invite');
    } else {
      setCheckResult({ exists: false });
      setStep('create');
    }
  };

  const handleInvite = async () => {
    if (!user || !tenant || !checkResult?.userId) return;
    setIsSubmitting(true);

    const res = await inviteIntervenant(email, tenant.id, user.id, tenant.name, firstName || checkResult.firstName, lastName || checkResult.lastName);

    setIsSubmitting(false);

    if (res.success) {
      setResult({
        type: 'exists',
        message: `${email} a été ajouté à ${tenant.name}. Il recevra une notification.`,
      });
    } else {
      setResult({ type: 'error', message: res.error || 'Une erreur est survenue.' });
    }
    setStep('email');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenant) return;
    if (!email || !password || !firstName || !lastName || !category || !specialty) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const additionalData: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      specialty,
      tenant_id: tenant.id,
    };

    if (companyInputMode === 'select' && companyId && companyId !== 'independant') {
      additionalData.company_id = companyId;
      const selected = companies.find(c => c.id === companyId);
      if (selected) additionalData.company = selected.name;
    } else {
      additionalData.company = company;
    }

    const res = await adminCreateUser(email, password, 'intervenant', additionalData);

    setIsSubmitting(false);

    if (res.success) {
      setResult({
        type: 'success',
        message: `Le compte ${firstName} ${lastName} a été créé et ajouté à ${tenant.name}.`,
      });
    } else {
      setResult({ type: 'error', message: res.error?.message || 'Une erreur est survenue.' });
    }
  };

  const handleClose = () => {
    if (result?.type === 'success' || result?.type === 'exists') {
      onSuccess?.();
    }
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un intervenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' && 'Ajouter un intervenant'}
            {step === 'invite' && 'Inviter un intervenant existant'}
            {step === 'create' && 'Créer un nouvel intervenant'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && `Ajoutez un intervenant à ${tenant?.name}.`}
            {step === 'invite' && `Un compte existe déjà pour ${email}.`}
            {step === 'create' && 'Créez un compte complet pour le nouvel intervenant.'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl ${
              result.type === 'success' ? 'bg-green-50 text-green-800' :
              result.type === 'exists' ? 'bg-blue-50 text-blue-800' :
              'bg-red-50 text-red-800'
            }`}>
              {result.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" /> :
               result.type === 'exists' ? <Mail className="h-5 w-5 mt-0.5 shrink-0" /> :
               <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />}
              <p className="text-sm">{result.message}</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : step === 'email' ? (
          <form onSubmit={handleCheckEmail} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-firstname">Prénom</Label>
                <Input
                  id="invite-firstname"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-lastname">Nom</Label>
                <Input
                  id="invite-lastname"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || !email}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vérification...</>
                ) : 'Vérifier l\'email'}
              </Button>
            </DialogFooter>
          </form>
        ) : step === 'invite' ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 text-blue-800">
              <User className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{checkResult?.firstName || firstName} {checkResult?.lastName || lastName}</p>
                <p className="text-blue-600">{email}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Cet utilisateur sera ajouté à <strong>{tenant?.name}</strong> et recevra une notification.
            </p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('email')} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={handleInvite} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ajout...</>
                ) : "Ajouter à l'espace"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-0.5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} readOnly disabled className="bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-firstname">Prénom *</Label>
                <Input id="create-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-lastname">Nom *</Label>
                <Input id="create-lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Mot de passe *</Label>
              <PasswordInput
                id="create-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="create-company">Entreprise</Label>
                <Button type="button" variant="link" className="text-xs h-6 px-0"
                  onClick={() => {
                    setCompanyInputMode(m => m === 'select' ? 'input' : 'select');
                    setCompanyId('');
                    setCompany('Indépendant');
                  }}>
                  {companyInputMode === 'select' ? 'Saisir un nouveau nom' : 'Sélectionner une entreprise'}
                </Button>
              </div>
              {companyInputMode === 'select' ? (
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independant">Indépendant</SelectItem>
                    {loadingCompanies ? (
                      <div className="py-2 px-2 text-sm text-gray-500">Chargement...</div>
                    ) : companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom de l'entreprise" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">Catégorie *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conception">Conception</SelectItem>
                  <SelectItem value="realisation">Réalisation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-specialty">Spécialité *</Label>
              <Select value={specialty} onValueChange={setSpecialty} required disabled={!category}>
                <SelectTrigger>
                  <SelectValue placeholder={!category ? "Sélectionnez d'abord une catégorie" : "Sélectionner une spécialité"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getSpecialtiesByCategory(category).map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setStep('email'); setPassword(''); }} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button type="submit" disabled={isSubmitting || !email || !password || !firstName || !lastName || !category || !specialty}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</>
                ) : 'Créer l\'intervenant'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteIntervenantDialog;
