import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  HardDrive, 
  Plus, 
  Search, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Crown,
  Loader2,
  AlertTriangle,
  Edit3,
  Ban,
  Play,
  UserPlus,
  Link,
  Trash2,
  UserX,
  Users2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useSuperAdmin } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabase';
import type { Tenant, TenantPlan, TenantStatus } from '@/types/tenant';
import { TENANT_PLANS, formatStorage, formatPercentage } from '@/types/tenant';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isSuperAdmin, 
    isLoading: isAuthLoading, 
    createTenant, 
    getAllTenants,
    updateTenantLimits,
    suspendTenant,
    activateTenant,
    associateUserToTenant,
    removeUserFromTenant,
    deleteUser
  } = useSuperAdmin();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [associateForm, setAssociateForm] = useState({
    userId: '',
    role: 'intervenant' as 'admin' | 'intervenant'
  });
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Stats globales
  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active').length,
    trialTenants: tenants.filter(t => t.status === 'trial').length,
    suspendedTenants: tenants.filter(t => t.status === 'suspended').length,
    totalProjects: tenants.reduce((acc, t) => acc + t.currentProjectsCount, 0),
    totalIntervenants: tenants.reduce((acc, t) => acc + t.currentIntervenantsCount, 0),
    totalStorage: tenants.reduce((acc, t) => acc + t.currentStorageUsedBytes, 0)
  };

  // Charger les tenants
  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      navigate('/dashboard');
      return;
    }

    const loadTenants = async () => {
      setIsLoading(true);
      const data = await getAllTenants();
      setTenants(data);
      setIsLoading(false);
    };

    if (isSuperAdmin) {
      loadTenants();
    }
  }, [isSuperAdmin, isAuthLoading, navigate, getAllTenants]);

  // Filtrer les tenants
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formulaire de création
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    plan: 'starter' as TenantPlan,
    trialDays: '14'
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tenant = await createTenant({
      name: createForm.name,
      slug: createForm.slug,
      ownerEmail: createForm.ownerEmail,
      ownerFirstName: createForm.ownerFirstName,
      ownerLastName: createForm.ownerLastName,
      plan: createForm.plan,
      trialDays: parseInt(createForm.trialDays)
    });

    if (tenant) {
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: '',
        slug: '',
        ownerEmail: '',
        ownerFirstName: '',
        ownerLastName: '',
        plan: 'starter',
        trialDays: '14'
      });
      // Rafraîchir la liste
      const data = await getAllTenants();
      setTenants(data);
    }
  };

  // Générer slug automatiquement avec suffixe unique
  const generateSlug = (name: string) => {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    // Ajouter un suffixe aléatoire de 4 caractères pour garantir l'unicité
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  };

  const handleNameChange = (name: string) => {
    setCreateForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  // Éditer les limites
  const [editLimits, setEditLimits] = useState({
    maxProjects: 0,
    maxIntervenants: 0,
    maxStorageGb: 0
  });

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditLimits({
      maxProjects: tenant.maxProjects ?? 5,
      maxIntervenants: tenant.maxIntervenants ?? 10,
      maxStorageGb: tenant.maxStorageGb ?? 10
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateLimits = async () => {
    if (!selectedTenant) return;
    
    const success = await updateTenantLimits(selectedTenant.id, editLimits);
    if (success) {
      setIsEditDialogOpen(false);
      const data = await getAllTenants();
      setTenants(data);
    }
  };

  // Suspendre/Réactiver
  const handleToggleStatus = async (tenant: Tenant) => {
    if (tenant.status === 'suspended') {
      const success = await activateTenant(tenant.id);
      if (success) {
        const data = await getAllTenants();
        setTenants(data);
      }
    } else {
      const success = await suspendTenant(tenant.id);
      if (success) {
        const data = await getAllTenants();
        setTenants(data);
      }
    }
  };

  // Associer un utilisateur
  const openAssociateDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setAssociateForm({ userId: '', role: 'intervenant' });
    setIsAssociateDialogOpen(true);
  };

  const handleAssociateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    const success = await associateUserToTenant(
      selectedTenant.id,
      associateForm.userId,
      associateForm.role
    );

    if (success) {
      setIsAssociateDialogOpen(false);
      const data = await getAllTenants();
      setTenants(data);
    }
  };

  // Charger les utilisateurs d'un tenant
  const loadTenantUsers = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          *,
          profiles:user_id(*)
        `)
        .eq('tenant_id', tenant.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setTenantUsers(data || []);
      setIsUsersDialogOpen(true);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Retirer un utilisateur du tenant
  const handleRemoveUser = async (userId: string) => {
    if (!selectedTenant) return;
    if (!confirm('Retirer cet utilisateur du tenant ? Il ne pourra plus accéder aux données.')) return;

    const success = await removeUserFromTenant(selectedTenant.id, userId);
    if (success) {
      setTenantUsers(tenantUsers.filter(u => u.user_id !== userId));
    }
  };

  // Supprimer complètement un utilisateur
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('SUPPRIMER DÉFINITIVEMENT ce compte ? Cette action est irréversible !')) return;

    const success = await deleteUser(userId);
    if (success) {
      setTenantUsers(tenantUsers.filter(u => u.user_id !== userId));
    }
  };

  // Badge de statut
  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Actif</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" /> Essai</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" /> Suspendu</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Résilié</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Badge de plan
  const getPlanBadge = (plan: TenantPlan) => {
    const colors: Record<TenantPlan, string> = {
      starter: 'bg-gray-500',
      pro: 'bg-blue-500',
      enterprise: 'bg-purple-500',
      custom: 'bg-orange-500'
    };
    return (
      <Badge className={`${colors[plan]} text-white capitalize`}>
        {plan}
      </Badge>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // Redirection gérée dans useEffect
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <span className="text-sm text-muted-foreground font-medium">Super Admin</span>
            </div>
            <h1 className="text-4xl font-black text-foreground">Dashboard SaaS</h1>
            <p className="text-muted-foreground">Gestion des clients et ressources</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Client
          </Button>
        </motion.div>

        {/* Stats globales */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTenants}</div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-green-500">{stats.activeTenants} actifs</span>
                <span className="text-xs text-blue-500">{stats.trialTenants} essai</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projets Globaux</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-2">Total sur tous les tenants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Intervenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalIntervenants}</div>
              <p className="text-xs text-muted-foreground mt-2">Utilisateurs actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stockage Total</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatStorage(stats.totalStorage)}</div>
              <p className="text-xs text-muted-foreground mt-2">Données uploadées</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Liste des tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Clients</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Usage</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Propriétaire</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getPlanBadge(tenant.plan)}</td>
                          <td className="py-3 px-4">{getStatusBadge(tenant.status)}</td>
                          <td className="py-3 px-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Settings className="h-3 w-3" />
                                <span>{tenant.currentProjectsCount}/{tenant.maxProjects} projets</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>{tenant.currentIntervenantsCount}/{tenant.maxIntervenants} intervenants</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-3 w-3" />
                                <span>{formatStorage(tenant.currentStorageUsedBytes)} / {tenant.maxStorageGb} GB</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {tenant.ownerEmail}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => loadTenantUsers(tenant)}
                                title="Voir les utilisateurs"
                              >
                                <Users2 className="h-4 w-4 text-indigo-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openAssociateDialog(tenant)}
                                title="Associer un utilisateur"
                              >
                                <UserPlus className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditDialog(tenant)}
                                title="Modifier les limites"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleStatus(tenant)}
                                title={tenant.status === 'suspended' ? "Réactiver" : "Suspendre"}
                              >
                                {tenant.status === 'suspended' ? (
                                  <Play className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Ban className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTenants.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Aucun client trouvé</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialog de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
            <DialogDescription>
              Créer un nouveau compte tenant avec son administrateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'entreprise</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="APS Construction Paris"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Identifiant (slug)</Label>
              <Input
                id="slug"
                value={createForm.slug}
                onChange={(e) => setCreateForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="aps-construction-paris"
                required
              />
              <p className="text-xs text-muted-foreground">
                Utilisé dans les URLs: /t/{createForm.slug || 'exemple'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom admin</Label>
                <Input
                  id="firstName"
                  value={createForm.ownerFirstName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, ownerFirstName: e.target.value }))}
                  placeholder="Jean"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom admin</Label>
                <Input
                  id="lastName"
                  value={createForm.ownerLastName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, ownerLastName: e.target.value }))}
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email admin</Label>
              <Input
                id="email"
                type="email"
                value={createForm.ownerEmail}
                onChange={(e) => setCreateForm(prev => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="jean.dupont@entreprise.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={createForm.plan}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, plan: value as TenantPlan }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENANT_PLANS.map(plan => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trialDays">Jours d'essai</Label>
                <Input
                  id="trialDays"
                  type="number"
                  value={createForm.trialDays}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, trialDays: e.target.value }))}
                  min="1"
                  max="90"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer le client</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition des limites */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Modifier les limites</DialogTitle>
            <DialogDescription>
              {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projets max</Label>
              <Input
                type="number"
                value={editLimits.maxProjects}
                onChange={(e) => setEditLimits(prev => ({ ...prev, maxProjects: parseInt(e.target.value) }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Intervenants max</Label>
              <Input
                type="number"
                value={editLimits.maxIntervenants}
                onChange={(e) => setEditLimits(prev => ({ ...prev, maxIntervenants: parseInt(e.target.value) }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Stockage max (GB)</Label>
              <Input
                type="number"
                value={editLimits.maxStorageGb}
                onChange={(e) => setEditLimits(prev => ({ ...prev, maxStorageGb: parseInt(e.target.value) }))}
                min="1"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateLimits}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'association d'utilisateur */}
      <Dialog open={isAssociateDialogOpen} onOpenChange={setIsAssociateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Associer un utilisateur</DialogTitle>
            <DialogDescription>
              Associer un utilisateur existant au tenant <strong>{selectedTenant?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssociateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID Utilisateur (UUID)</Label>
              <Input
                id="userId"
                value={associateForm.userId}
                onChange={(e) => setAssociateForm(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-muted-foreground">
                Trouvez l'UUID dans Supabase Auth → Users
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={associateForm.role}
                onValueChange={(value) => setAssociateForm(prev => ({ ...prev, role: value as 'admin' | 'intervenant' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="intervenant">Intervenant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">⚠️ Important :</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>L'utilisateur doit déjà exister dans Supabase Auth</li>
                <li>Si admin : deviendra propriétaire du tenant</li>
                <li>Si intervenant : rejoindra comme membre</li>
              </ul>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssociateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                <Link className="h-4 w-4 mr-2" />
                Associer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog des utilisateurs du tenant */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Utilisateurs de {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              Gérer les membres de ce tenant. Vous pouvez les retirer du tenant ou supprimer définitivement leur compte.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tenantUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun utilisateur associé à ce tenant.</p>
              <p className="text-sm mt-1">Utilisez le bouton "Associer un utilisateur" pour en ajouter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenantUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.profiles?.first_name?.[0]}{user.profiles?.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.profiles?.first_name} {user.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.profiles?.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {user.role}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user.user_id)}
                      title="Retirer du tenant"
                    >
                      <UserX className="h-4 w-4 text-orange-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.user_id)}
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsUsersDialogOpen(false)}>
              Fermer
            </Button>
            <Button onClick={() => selectedTenant && openAssociateDialog(selectedTenant)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
