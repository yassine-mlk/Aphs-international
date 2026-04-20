import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useVisaValidatorQueue } from '@/hooks/useVisaValidatorQueue';
import { useVisaWorkflow } from '@/hooks/useVisaWorkflow';
import { ValidationQueue, OpinionForm } from '@/components/visa';
import { VisaValidatorQueue, OpinionType, VisaStatus } from '@/types/visa';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";

export const Validations: React.FC = () => {
  const { user } = useAuth();
  const { queue, loading, fetchQueue, getStepDetails } = useVisaValidatorQueue(user?.id || null);
  const { submitOpinion } = useVisaWorkflow();
  
  const [selectedItem, setSelectedItem] = useState<VisaValidatorQueue | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stepDetails, setStepDetails] = useState<{ step: any; instance: any } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleViewDocument = async (item: VisaValidatorQueue) => {
    setSelectedItem(item);
    const details = await getStepDetails(item.step_id);
    setStepDetails(details);
    setIsDialogOpen(true);
  };

  const handleSubmitOpinion = async (
    opinion: OpinionType, 
    visaStatus: VisaStatus, 
    comments: string
  ) => {
    if (!selectedItem || !user) return;
    
    setSubmitting(true);
    const result = await submitOpinion(
      selectedItem.step_id,
      opinion,
      visaStatus,
      comments,
      user.id,
      user.role || 'validator'
    );
    
    if (result.success) {
      setIsDialogOpen(false);
      setSelectedItem(null);
      setStepDetails(null);
      fetchQueue();
    }
    setSubmitting(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes validations</h1>
          <p className="text-gray-500">Documents soumis pour votre avis technique</p>
        </div>
      </div>

      <ValidationQueue 
        queue={queue}
        loading={loading}
        onViewDocument={handleViewDocument}
      />

      {/* Dialog pour donner son avis */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDialogOpen(false)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Donner votre avis technique</DialogTitle>
            </div>
          </DialogHeader>
          
          {stepDetails && selectedItem && (
            <OpinionForm
              step={stepDetails.step}
              fileUrl={stepDetails.instance?.submission?.file_url || ''}
              fileName={stepDetails.instance?.submission?.file_name || selectedItem.file_name}
              projectName={selectedItem.project_title}
              circuitName={selectedItem.circuit_name}
              versionIndex={selectedItem.version_index}
              onSubmit={handleSubmitOpinion}
              onCancel={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Validations;
