import React from 'react';
import { usePlan } from '../../hooks/usePlan';
import { PlanLimits } from '../../types/tenant';

interface FeatureGateProps {
  feature: keyof PlanLimits | 'sequential';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  children,
  fallback
}: FeatureGateProps) {
  const { can, plan, isLoading } = usePlan();
  
  if (isLoading) return null;
  
  if (!can(feature)) {
    return (fallback as React.ReactElement) ?? (
      <UpgradePrompt feature={feature} currentPlan={plan} />
    );
  }
  
  return <>{children}</>;
}

// Composant affiché quand la feature est bloquée
function UpgradePrompt({
  feature,
  currentPlan
}: {
  feature: string;
  currentPlan: string;
}) {
  const messages: Record<string, string> = {
    videoconference: 'La visioconférence est disponible à partir du plan Pro.',
    sequential: 'Le workflow documentaire est disponible à partir du plan Pro.',
    esignature: 'La signature électronique est disponible avec le plan Business.',
    custom_structure: 'La personnalisation de structure est disponible avec le plan Business.',
    advanced_fiches: 'Les fiches informatives avancées sont disponibles avec le plan Business.',
    api_access: "L'accès API est disponible avec le plan Business.",
  };

  // Map limits keys to user-friendly names if not in messages
  const featureName = messages[feature] ?? `Cette fonctionnalité nécessite un plan supérieur (actuellement: ${currentPlan}).`;

  return (
    <div style={{
      padding: '32px',
      textAlign: 'center',
      border: '1.5px dashed #E0E0E0',
      borderRadius: '16px',
      background: '#FAFAFA',
      margin: '16px 0'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
      <p style={{ fontWeight: '600', marginBottom: '8px' }}>
        Fonctionnalité non disponible
      </p>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
        {featureName}
      </p>
      <a
        href="mailto:contact@aps-construction.fr"
        style={{
          background: '#1A4FFF',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '100px',
          fontSize: '14px',
          textDecoration: 'none',
          fontWeight: '500',
          display: 'inline-block'
        }}
      >
        Contacter notre équipe commerciale
      </a>
    </div>
  );
}
