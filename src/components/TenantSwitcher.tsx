import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  intervenant: 'Intervenant',
  owner: 'Propriétaire',
};

const TenantSwitcher: React.FC = () => {
  const { tenant, switchTenant, isLoading } = useTenant();
  const { availableTenants, activeTenantId, setActiveTenantId } = useAuth();
  const navigate = useNavigate();

  if (!tenant || availableTenants.length <= 1) return null;

  const handleSwitch = async (tenantId: string) => {
    setActiveTenantId(tenantId);
    await switchTenant(tenantId);
    navigate('/dashboard');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all"
          disabled={isLoading}
        >
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700 max-w-[140px] truncate">
            {tenant.name}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Mes espaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => handleSwitch(t.id)}
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-gray-400">{roleLabels[t.role] || t.role}</p>
              </div>
            </div>
            {t.id === activeTenantId && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TenantSwitcher;
