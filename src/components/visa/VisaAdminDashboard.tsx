import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Search, Filter, Download, RefreshCw, FileText, Clock, 
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  FileSpreadsheet, FileDown, Eye, Calendar, User
} from "lucide-react";
import { VisaInstance, VisaStep, TaskSubmission } from "@/types/visa";

interface VisaAdminDashboardProps {
  instances: Array<VisaInstance & {
    project_name: string;
    circuit_name: string;
    file_name: string;
    emitted_by_name?: string;
    steps: VisaStep[];
    submissions?: TaskSubmission[];
  }>;
  circuits: Array<{ id: string; name: string; project_id: string }>;
  projects: Array<{ id: string; name: string }>;
  onRefresh: () => void;
  onViewInstance: (instanceId: string) => void;
  onGenerateReport: (instanceId: string) => void;
}

type FilterStatus = 'all' | 'en_cours' | 'valide' | 'refuse' | 'suspendu' | 'retard';
type FilterProject = 'all' | string;
type FilterCircuit = 'all' | string;

export const VisaAdminDashboard: React.FC<VisaAdminDashboardProps> = ({
  instances,
  circuits,
  projects,
  onRefresh,
  onViewInstance,
  onGenerateReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [projectFilter, setProjectFilter] = useState<FilterProject>('all');
  const [circuitFilter, setCircuitFilter] = useState<FilterCircuit>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  // Index alphabétique (A=0, B=1, C=2...)
  const getVersionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // 65 = 'A'
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = instances.length;
    const enCours = instances.filter(i => i.status === 'en_cours').length;
    const valide = instances.filter(i => i.status === 'valide').length;
    const refuses = instances.filter(i => i.status === 'refuse').length;
    const retards = instances.filter(i => {
      if (i.status !== 'en_cours') return false;
      const currentStep = i.steps[i.current_step_index];
      if (!currentStep?.deadline_at) return false;
      return new Date(currentStep.deadline_at) < new Date();
    }).length;
    return { total, enCours, valide, refuses, retards };
  }, [instances]);

  // Filtrer les instances
  const filteredInstances = useMemo(() => {
    return instances.filter(instance => {
      const matchesSearch = 
        instance.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instance.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instance.circuit_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (instance.emitted_by_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'retard' ? instance.status === 'en_cours' && isOverdue(instance) : instance.status === statusFilter);
      
      const matchesProject = projectFilter === 'all' || (instance as any).project_id === projectFilter;
      const matchesCircuit = circuitFilter === 'all' || instance.circuit_id === circuitFilter;
      
      return matchesSearch && matchesStatus && matchesProject && matchesCircuit;
    });
  }, [instances, searchQuery, statusFilter, projectFilter, circuitFilter]);

  const isOverdue = (instance: VisaInstance & { steps: VisaStep[] }) => {
    if (instance.status !== 'en_cours') return false;
    const currentStep = instance.steps[instance.current_step_index];
    if (!currentStep?.deadline_at) return false;
    return new Date(currentStep.deadline_at) < new Date();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  // Export Excel
  const exportToExcel = () => {
    const headers = ['Document', 'Projet', 'Circuit', 'Émetteur', 'Version', 'Date dépôt', 'Statut', 'Échéance', 'Validateur actuel'];
    const rows = filteredInstances.map(i => {
      const currentStep = i.steps[i.current_step_index];
      return [
        i.file_name,
        i.project_name,
        i.circuit_name,
        i.emitted_by_name || 'Inconnu',
        getVersionLabel(i.current_step_index),
        new Date(i.created_at).toLocaleDateString('fr-FR'),
        i.status,
        currentStep?.deadline_at ? new Date(currentStep.deadline_at).toLocaleDateString('fr-FR') : '-',
        (currentStep as any)?.validator_name || '-'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visa-synthese-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (instance: VisaInstance & { steps: VisaStep[] }) => {
    const isLate = isOverdue(instance);
    
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      en_cours: { 
        label: isLate ? 'En retard' : 'En cours', 
        color: isLate ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800', 
        icon: isLate ? AlertTriangle : Clock 
      },
      valide: { label: 'Validé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      refuse: { label: 'Refusé (VAR)', color: 'bg-red-100 text-red-800', icon: XCircle },
      suspendu: { label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };
    
    const config = configs[instance.status] || configs.en_cours;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total circuits</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.enCours}</div>
            <div className="text-sm text-gray-500">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.valide}</div>
            <div className="text-sm text-gray-500">Validés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.refuses}</div>
            <div className="text-sm text-gray-500">Refusés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.retards}</div>
            <div className="text-sm text-gray-500">En retard</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Document, projet, circuit, émetteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Statut</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="valide">Validés</SelectItem>
                  <SelectItem value="refuse">Refusés</SelectItem>
                  <SelectItem value="retard">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Projet</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les projets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Circuit</label>
              <Select value={circuitFilter} onValueChange={setCircuitFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les circuits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les circuits</SelectItem>
                  {circuits.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau de synthèse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tableau de synthèse des validations</span>
            <span className="text-sm font-normal text-gray-500">
              {filteredInstances.length} document{filteredInstances.length > 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Projet / Circuit</TableHead>
                <TableHead>Émetteur</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead>Date dépôt</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Validateur actuel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.map((instance) => {
                const isExpanded = expandedRows.has(instance.id);
                const currentStep = instance.steps[instance.current_step_index];
                
                return (
                  <React.Fragment key={instance.id}>
                    <TableRow className={isOverdue(instance) ? 'bg-red-50' : ''}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(instance.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{instance.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{instance.project_name}</div>
                          <div className="text-gray-500">{instance.circuit_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {instance.emitted_by_name || 'Inconnu'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {getVersionLabel(instance.current_step_index)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(instance.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(instance)}</TableCell>
                      <TableCell>
                        {currentStep?.deadline_at ? (
                          <span className={isOverdue(instance) ? 'text-red-600 font-medium' : ''}>
                            {new Date(currentStep.deadline_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {(currentStep as any)?.validator_name || 
                         (instance.status === 'valide' ? 'Terminé' : '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewInstance(instance.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onGenerateReport(instance.id)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Détail des étapes */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-gray-50 p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Circuit de validation</h4>
                            <div className="flex gap-2">
                              {instance.steps.map((step, idx) => (
                                <div
                                  key={step.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                    idx === instance.current_step_index
                                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                      : (step as any).completed_at
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <span className="font-mono text-xs">{getVersionLabel(idx)}</span>
                                  <span>{(step as any).validator_name || step.validator_role}</span>
                                  {(step as any).completed_at && <CheckCircle className="h-3 w-3" />}
                                  {idx === instance.current_step_index && <Clock className="h-3 w-3" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisaAdminDashboard;
