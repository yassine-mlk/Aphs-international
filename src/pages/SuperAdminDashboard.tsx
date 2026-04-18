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
  Play
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
    activateTenant
  } = useSuperAdmin();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  // Générer slug automatiquement
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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
      maxProjects: tenant.maxProjects,
      maxIntervenants: tenant.maxIntervenants,
      maxStorageGb: tenant.maxStorageGb
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
                                onClick={() => openEditDialog(tenant)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleStatus(tenant)}
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
    </div>
  );
};

export default SuperAdminDashboard;
