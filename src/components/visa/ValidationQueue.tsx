import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, Clock, AlertTriangle, Eye, Filter,
  ChevronRight, Search, Inbox 
} from "lucide-react";
import { VisaValidatorQueue } from "@/types/visa";
import { ValidatorQueueBadge } from "./VisaStatusBadge";

interface ValidationQueueProps {
  queue: VisaValidatorQueue[];
  loading: boolean;
  onViewDocument: (item: VisaValidatorQueue) => void;
  filterProjectId?: string;
}

export const ValidationQueue: React.FC<ValidationQueueProps> = ({
  queue,
  loading,
  onViewDocument,
  filterProjectId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLateOnly, setShowLateOnly] = useState(false);

  const filteredQueue = queue.filter(item => {
    // Filtre projet
    if (filterProjectId && item.project_id !== filterProjectId) return false;
    
    // Filtre recherche
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      item.file_name.toLowerCase().includes(searchLower) ||
      item.circuit_name.toLowerCase().includes(searchLower) ||
      item.project_title.toLowerCase().includes(searchLower);
    
    // Filtre retard
    if (showLateOnly) {
      const deadline = item.deadline_at ? new Date(item.deadline_at) : null;
      const isLate = deadline ? deadline < new Date() : false;
      if (!isLate) return false;
    }

    return matchesSearch;
  });

  // Trier: retards d'abord, puis deadline croissante
  const sortedQueue = [...filteredQueue].sort((a, b) => {
    const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
    const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
    const aLate = aDeadline < Date.now();
    const bLate = bDeadline < Date.now();
    
    if (aLate && !bLate) return -1;
    if (!aLate && bLate) return 1;
    return aDeadline - bDeadline;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Inbox className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <CardTitle className="text-lg text-gray-600">File d'attente vide</CardTitle>
          <CardDescription>
            Aucun document ne vous est soumis pour validation actuellement
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button
          variant={showLateOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowLateOnly(!showLateOnly)}
          className={showLateOnly ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Retards uniquement
        </Button>
        
        <Badge variant="outline" className="font-normal">
          {sortedQueue.length} document{sortedQueue.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {sortedQueue.map((item) => {
          const isLate = item.deadline_at ? new Date(item.deadline_at) < new Date() : false;
          
          return (
            <Card 
              key={item.step_id} 
              className={`hover:shadow-md transition-shadow ${isLate ? 'border-red-300' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icône document */}
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium truncate">{item.file_name}</h4>
                        <p className="text-sm text-gray-500">
                          {item.project_title} • {item.circuit_name}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ValidatorQueueBadge deadlineAt={item.deadline_at} isLate={isLate} />
                        <Button size="sm" onClick={() => onViewDocument(item)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Valider
                        </Button>
                      </div>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Déposé le {new Date(item.submitted_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span>•</span>
                      <span>Étape {item.step_order + 1}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">Version {item.version_index}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedQueue.length === 0 && queue.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>Aucun document ne correspond aux filtres</p>
        </div>
      )}
    </div>
  );
};
