import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Trash2, 
  Plus,
  Settings,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface StructureItem {
  id: string;
  title: string;
  tasks: Task[];
}

interface StructureSection {
  id: string;
  title: string;
  items: StructureItem[];
}

interface ProjectManageStructureTabProps {
  conceptionStructure: StructureSection[];
  realizationStructure: StructureSection[];
  phaseStructure: 'conception' | 'realisation';
  onPhaseChange: (phase: 'conception' | 'realisation') => void;
  onAddSection: (phase: 'conception' | 'realisation') => void;
  onAddSubsection: (sectionId: string, phase: 'conception' | 'realisation') => void;
  onDeleteSection: (sectionId: string, phase: 'conception' | 'realisation') => void;
  onDeleteSubsection: (sectionId: string, subsectionId: string, phase: 'conception' | 'realisation') => void;
  newSectionTitle: string;
  setNewSectionTitle: (title: string) => void;
  newSubsectionTitle: string;
  setNewSubsectionTitle: (title: string) => void;
  addingToSection: string | null;
  setAddingToSection: (sectionId: string | null) => void;
}

const ProjectManageStructureTab: React.FC<ProjectManageStructureTabProps> = ({
  conceptionStructure,
  realizationStructure,
  phaseStructure,
  onPhaseChange,
  onAddSection,
  onAddSubsection,
  onDeleteSection,
  onDeleteSubsection,
  newSectionTitle,
  setNewSectionTitle,
  newSubsectionTitle,
  setNewSubsectionTitle,
  addingToSection,
  setAddingToSection
}) => {
  const currentStructure = phaseStructure === 'conception' 
    ? conceptionStructure 
    : realizationStructure;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gestion de la structure
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Modifiez les lots et phases du projet
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Attention</h4>
                <p className="text-sm text-yellow-700">
                  La suppression d'une étape ou sous-étape supprimera également toutes les tâches assignées associées. 
                  Cette action est irréversible.
                </p>
              </div>
            </div>
          </div>

          {/* Phase Selector */}
          <div className="flex gap-2 mb-6">
            <Button 
              variant={phaseStructure === 'conception' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('conception')}
            >
              Phase Conception
            </Button>
            <Button 
              variant={phaseStructure === 'realisation' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('realisation')}
            >
              Phase Réalisation
            </Button>
          </div>

          {/* Add Section */}
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="Nom de la nouvelle section (lot)..."
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => onAddSection(phaseStructure)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un lot
            </Button>
          </div>

          {/* Structure List */}
          <div className="space-y-4">
            <Accordion type="multiple" className="w-full">
              {currentStructure.map((section, sIdx) => {
                const sLabel = String.fromCharCode(65 + sIdx);
                
                return (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id}
                    className="border rounded-lg mb-4 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 bg-gray-50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-700">{sLabel} -</span>
                          <span className="font-medium">{section.title}</span>
                          <Badge variant="outline">{section.items.length} sous-étapes</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSection(section.id, phaseStructure);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 py-3">
                      <div className="space-y-2">
                        {section.items.map((item, iIdx) => {
                          const iLabel = `${sLabel}${iIdx + 1}`;
                          
                          return (
                            <div 
                              key={item.id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-600">{iLabel} -</span>
                                <span>{item.title}</span>
                                {item.tasks.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.tasks.length} tâche{item.tasks.length > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDeleteSubsection(section.id, item.id, phaseStructure)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}

                        {/* Add Subsection */}
                        {addingToSection === section.id ? (
                          <div className="flex gap-2 mt-3">
                            <Input 
                              placeholder="Nom de la sous-étape..."
                              value={newSubsectionTitle}
                              onChange={(e) => setNewSubsectionTitle(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button 
                              size="sm"
                              onClick={() => onAddSubsection(section.id, phaseStructure)}
                            >
                              Ajouter
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setAddingToSection(null);
                                setNewSubsectionTitle('');
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-3"
                            onClick={() => setAddingToSection(section.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une sous-étape
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {currentStructure.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Aucune structure définie pour cette phase</p>
                <p className="text-sm text-gray-400 mt-1">
                  Ajoutez des lots pour organiser votre projet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManageStructureTab;
