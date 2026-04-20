import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Search, Filter, Download, RefreshCw, ChevronDown, ChevronRight,
  FileText, Clock, CheckCircle, XCircle, RotateCcw, Repeat
} from "lucide-react";
import { VisaInstance, VisaStep } from "@/types/visa";

interface VisaDashboardProps {
  instances: Array<VisaInstance & {
    project_name: string;
    circuit_name: string;
    file_name: string;
    steps: VisaStep[];
  }>;
  onRefresh: () => void;
  onRepeatTask: (instanceId: string) => void;
  onExport: () => void;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'valide', label: 'Validé' },
  { value: 'refuse', label: 'Refusé' },
];

export const VisaDashboard: React.FC<VisaDashboardProps> = ({
  instances,
  onRefresh,
  onRepeatTask,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = 
      instance.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.circuit_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.emitted_by_role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Clock },
      valide: { label: 'Validé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      refuse: { label: 'Refusé (VAR)', color: 'bg-red-100 text-red-800', icon: XCircle },
      suspendu: { label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800', icon: RotateCcw },
    };
    const config = configs[status] || configs.en_cours;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStepProgress = (instance: VisaInstance, steps: VisaStep[]) => {
    const completed = steps.filter(s => s.completed_at).length;
    const total = instance.total_steps;
    const current = instance.current_step_index;
    
    if (instance.status === 'valide') {
      return <span className="text-green-600 font-medium">Terminé</span>;
    }
    if (instance.status === 'refuse') {
      return <span className="text-red-600 font-medium">VAR - À refaire</span>;
    }
    
    const currentStep = steps.find(s => s.step_order === current && !s.completed_at);
    return (
      <span className="text-blue-600">
        Étape {current + 1}/{total} ({completed} validée{completed > 1 ? 's' : ''})
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Tableau de suivi des visas</h2>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher document, projet, circuit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline">
          {filteredInstances.length} document{filteredInstances.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Document</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucun document trouvé</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstances.map((instance) => (
                  <React.Fragment key={instance.id}>
                    <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedRow(expandedRow === instance.id ? null : instance.id)}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedRow === instance.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {instance.file_name}
                        <p className="text-xs text-gray-500">{instance.circuit_name}</p>
                      </TableCell>
                      <TableCell>{instance.project_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">V{instance.version_index}</Badge>
                      </TableCell>
                      <TableCell>{getStepProgress(instance, instance.steps)}</TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell>
                        {instance.status === 'refuse' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRepeatTask(instance.id);
                            }}
                          >
                            <Repeat className="h-3 w-3 mr-1" />
                            Créer occurrence
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Row expanded */}
                    {expandedRow === instance.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-gray-50">
                          <div className="py-2">
                            <p className="font-medium mb-2">Détail des étapes:</p>
                            <div className="space-y-2">
                              {instance.steps.map((step, idx) => (
                                <div 
                                  key={step.id} 
                                  className={`flex items-center gap-3 p-2 rounded ${
                                    step.step_order === instance.current_step_index && !step.completed_at
                                      ? 'bg-blue-100 border border-blue-300'
                                      : step.completed_at
                                      ? 'bg-green-50'
                                      : 'bg-white'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    step.completed_at ? 'bg-green-500 text-white' :
                                    step.step_order === instance.current_step_index ? 'bg-blue-500 text-white' :
                                    'bg-gray-200 text-gray-600'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-medium">{step.validator_role}</span>
                                    {step.opinion && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {step.opinion}
                                      </Badge>
                                    )}
                                    {step.visa_status && (
                                      <Badge 
                                        variant="outline" 
                                        className={`ml-2 text-xs ${
                                          step.visa_status === 'VSO' ? 'border-green-500 text-green-700' :
                                          step.visa_status === 'VAO' ? 'border-yellow-500 text-yellow-700' :
                                          'border-red-500 text-red-700'
                                        }`}
                                      >
                                        {step.visa_status}
                                      </Badge>
                                    )}
                                  </div>
                                  {step.completed_at && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(step.completed_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                  {step.step_order === instance.current_step_index && !step.completed_at && (
                                    <Badge variant="outline" className="text-xs bg-blue-50">
                                      En attente
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
