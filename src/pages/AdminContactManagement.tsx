import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Trash2, 
  Users, 
  UserCheck, 
  UserX,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from "@/components/ui/use-toast";
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty: string;
  status: string;
}

interface ContactPermission {
  permission_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  contact_id: string;
  contact_email: string;
  contact_name: string;
  granted_by: string;
  granted_by_email: string;
  granted_at: string;
  revoked_by?: string;
  revoked_by_email?: string;
  revoked_at?: string;
  is_active: boolean;
  notes?: string;
}

interface PermissionStats {
  total_permissions: number;
  active_permissions: number;
  revoked_permissions: number;
  total_users: number;
  users_with_permissions: number;
}

const AdminContactManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];
  const { supabase } = useSupabase();
  
  // États
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<ContactPermission[]>([]);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked'>('all');
  
  // États pour les dialogues
  const [grantPermissionDialogOpen, setGrantPermissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [permissionNotes, setPermissionNotes] = useState("");
  const [revokePermissionDialogOpen, setRevokePermissionDialogOpen] = useState(false);
  const [permissionToRevoke, setPermissionToRevoke] = useState<ContactPermission | null>(null);
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  // Charger les données
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les utilisateurs
      // Utiliser une fonction existante ou récupérer depuis la table profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, role, specialty, status')
        .eq('status', 'active')
        .neq('role', 'admin')
        .order('first_name', { ascending: true });
      
      if (usersError) throw usersError;
      setUsers(usersData || []);
      
      // Charger les permissions
      // Pour l'instant, utiliser un tableau vide car la table n'existe pas encore
      // TODO: Implémenter quand le script SQL sera exécuté
      setPermissions([]);
      
      // Charger les statistiques
      // Pour l'instant, utiliser des statistiques par défaut
      // TODO: Implémenter quand le script SQL sera exécuté
      setStats({
        total_permissions: 0,
        active_permissions: 0,
        revoked_permissions: 0,
        total_users: usersData?.length || 0,
        users_with_permissions: 0
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Accorder une permission
  const handleGrantPermission = async () => {
    if (!selectedUserId || !selectedContactId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur et un contact",
        variant: "destructive"
      });
      return;
    }

    try {
      // Pour l'instant, simuler l'accord de permission
      // TODO: Implémenter quand le script SQL sera exécuté
      console.log('Accord de permission simulé:', {
        user_id: selectedUserId,
        contact_id: selectedContactId,
        admin_id: user?.id,
        notes: permissionNotes
      });

      toast({
        title: "Succès",
        description: "Permission accordée avec succès",
      });

      // Fermer le dialogue et réinitialiser
      setGrantPermissionDialogOpen(false);
      setSelectedUserId("");
      setSelectedContactId("");
      setPermissionNotes("");
      
      // Recharger les données
      await loadData();
      
    } catch (error) {
      console.error('Erreur lors de l\'accord de la permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accorder la permission",
        variant: "destructive"
      });
    }
  };

  // Révoquer une permission
  const handleRevokePermission = async () => {
    if (!permissionToRevoke) return;

    try {
      // Pour l'instant, simuler la révocation de permission
      // TODO: Implémenter quand le script SQL sera exécuté
      console.log('Révocation de permission simulée:', {
        user_id: permissionToRevoke.user_id,
        contact_id: permissionToRevoke.contact_id,
        admin_id: user?.id
      });

      toast({
        title: "Succès",
        description: "Permission révoquée avec succès",
      });

      // Fermer le dialogue
      setRevokePermissionDialogOpen(false);
      setPermissionToRevoke(null);
      
      // Recharger les données
      await loadData();
      
    } catch (error) {
      console.error('Erreur lors de la révocation de la permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de révoquer la permission",
        variant: "destructive"
      });
    }
  };

  // Filtrer les permissions
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && permission.is_active) ||
      (filterStatus === 'revoked' && !permission.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Obtenir les initiales d'un utilisateur
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Formater une date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous devez être administrateur pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Contacts</h1>
          <p className="text-muted-foreground">
            Gérez les permissions de contact entre les intervenants
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Permissions Actives</p>
                  <p className="text-2xl font-bold">{stats.active_permissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <UserX className="h-8 w-8 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Permissions Révoquées</p>
                  <p className="text-2xl font-bold">{stats.revoked_permissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Utilisateurs avec Permissions</p>
                  <p className="text-2xl font-bold">{stats.users_with_permissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-orange-500" />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Total Permissions</p>
                  <p className="text-2xl font-bold">{stats.total_permissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permissions">Permissions de Contact</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'revoked') => setFilterStatus(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="revoked">Révoqués</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={grantPermissionDialogOpen} onOpenChange={setGrantPermissionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Accorder une Permission
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Accorder une Permission de Contact</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un utilisateur et un contact pour accorder la permission de communication.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="user" className="text-sm font-medium">
                      Utilisateur
                    </label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Sélectionnez un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.first_name} {user.last_name} ({user.email})
                            {user.specialty && (
                              <span className="text-xs text-gray-500 ml-1">
                                • {user.specialty}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="contact" className="text-sm font-medium">
                      Contact
                    </label>
                    <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                      <SelectTrigger id="contact">
                        <SelectValue placeholder="Sélectionnez un contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(u => u.user_id !== selectedUserId)
                          .map(user => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.first_name} {user.last_name} ({user.email})
                              {user.specialty && (
                                <span className="text-xs text-gray-500 ml-1">
                                  • {user.specialty}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Notes (optionnel)
                    </label>
                    <Textarea
                      id="notes"
                      placeholder="Notes sur cette permission..."
                      value={permissionNotes}
                      onChange={(e) => setPermissionNotes(e.target.value)}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button onClick={handleGrantPermission}>
                    Accorder la Permission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table des permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions de Contact ({filteredPermissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Accordé par</TableHead>
                    <TableHead>Date d'accord</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.map((permission) => (
                    <TableRow key={permission.permission_id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(permission.user_name.split(' ')[0] || '', permission.user_name.split(' ')[1] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{permission.user_name}</p>
                            <p className="text-sm text-muted-foreground">{permission.user_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(permission.contact_name.split(' ')[0] || '', permission.contact_name.split(' ')[1] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{permission.contact_name}</p>
                            <p className="text-sm text-muted-foreground">{permission.contact_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {permission.is_active ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Révoqué
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{permission.granted_by_email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(permission.granted_at)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground max-w-32 truncate">
                          {permission.notes || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {permission.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPermissionToRevoke(permission);
                              setRevokePermissionDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredPermissions.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune permission trouvée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs Disponibles ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Spécialité</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {user.specialty || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogue de révocation */}
      <Dialog open={revokePermissionDialogOpen} onOpenChange={setRevokePermissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer la Permission</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir révoquer cette permission de contact ?
            </DialogDescription>
          </DialogHeader>
          
          {permissionToRevoke && (
            <div className="py-4">
              <p className="text-sm">
                <strong>{permissionToRevoke.user_name}</strong> ne pourra plus contacter{' '}
                <strong>{permissionToRevoke.contact_name}</strong>.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRevokePermission}>
              Révoquer la Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactManagement; 