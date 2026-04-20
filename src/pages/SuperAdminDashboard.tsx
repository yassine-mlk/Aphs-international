import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, HardDrive, Search,
  CheckCircle2, XCircle, Clock, Settings,
  Crown, Loader2, Edit3, Ban, Play, Trash2, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useSuperAdmin } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabase';
import type { Tenant, TenantPlan, TenantStatus } from '@/types/tenant';
import { formatStorage } from '@/types/tenant';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isSuperAdmin,
    isLoading: isAuthLoading,
    deleteTenant,
    getAllTenants,
    updateTenantLimits,
    suspendTenant,
    activateTenant,
  } = useSuperAdmin();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editLimits, setEditLimits] = useState({ maxProjects: 0, maxIntervenants: 0, maxStorageGb: 0 });

  const reload = async () => {
    const data = await getAllTenants();
    setTenants(data);
  };

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      navigate('/super-admin-login');
      return;
    }
    if (isSuperAdmin) {
      setIsLoading(true);
      getAllTenants().then(data => { setTenants(data); setIsLoading(false); });
    }
  }, [isSuperAdmin, isAuthLoading]);

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    trial: tenants.filter(t => t.status === 'trial').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userRole');
    localStorage.removeItem('isSuperAdmin');
    navigate('/super-admin-login');
  };

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
    if (success) { setIsEditDialogOpen(false); reload(); }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    if (tenant.status === 'suspended') {
      await activateTenant(tenant.id);
    } else {
      await suspendTenant(tenant.id);
    }
    reload();
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    const success = await deleteTenant(selectedTenant.id, true);
    if (success) { setIsDeleteDialogOpen(false); reload(); }
  };

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Actif</Badge>;
      case 'trial': return <Badge className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" />Essai</Badge>;
      case 'suspended': return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Suspendu</Badge>;
      default: return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const getPlanColor = (plan: TenantPlan) => ({
    starter: 'bg-gray-500', pro: 'bg-blue-500', enterprise: 'bg-purple-500', custom: 'bg-orange-500'
  })[plan] ?? 'bg-gray-400';

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground font-medium">Super Admin</span>
            </div>
            <h1 className="text-3xl font-black">Dashboard SaaS</h1>
            <p className="text-muted-foreground text-sm">Gestion des clients</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />Déconnexion
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total clients', value: stats.total, icon: Building2, color: 'text-foreground' },
            { label: 'Actifs', value: stats.active, icon: CheckCircle2, color: 'text-green-500' },
            { label: 'En essai', value: stats.trial, icon: Clock, color: 'text-blue-500' },
            { label: 'Suspendus', value: stats.suspended, icon: Ban, color: 'text-red-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Instruction création client */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">📋 Comment créer un nouveau client :</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Supabase Dashboard → <strong>Authentication → Users → Add user</strong> (email + mot de passe)</li>
            <li>Copiez l'UUID généré</li>
            <li>SQL Editor → exécutez le script d'association (voir <code>superadmin-setup.sql</code>)</li>
            <li>Le client apparaît ici et peut se connecter immédiatement</li>
          </ol>
        </div>

        {/* Liste des clients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Clients ({filteredTenants.length})</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
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
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Admin</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-4">
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${getPlanColor(tenant.plan)} text-white capitalize`}>{tenant.plan}</Badge>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(tenant.status)}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Settings className="h-3 w-3 text-muted-foreground" />
                                <span>{tenant.currentProjectsCount}/{tenant.maxProjects} projets</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span>{tenant.currentIntervenantsCount}/{tenant.maxIntervenants} intervenants</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <HardDrive className="h-3 w-3 text-muted-foreground" />
                                <span>{formatStorage(tenant.currentStorageUsedBytes)} / {tenant.maxStorageGb} GB</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{tenant.ownerEmail}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(tenant)} title="Modifier les limites">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(tenant)}
                                title={tenant.status === 'suspended' ? 'Réactiver' : 'Suspendre'}>
                                {tenant.status === 'suspended'
                                  ? <Play className="h-4 w-4 text-green-500" />
                                  : <Ban className="h-4 w-4 text-orange-500" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="hover:bg-red-50"
                                onClick={() => { setSelectedTenant(tenant); setIsDeleteDialogOpen(true); }}
                                title="Supprimer définitivement">
                                <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Dialog confirmation suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Supprimer le client
            </DialogTitle>
            <DialogDescription>
              Supprimer définitivement <strong>{selectedTenant?.name}</strong> et toutes ses données (projets, intervenants, tâches, messages) ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteTenant}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
