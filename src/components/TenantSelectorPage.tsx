import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ChevronRight, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  intervenant: 'Intervenant',
  owner: 'Propriétaire',
};

const TenantSelectorPage: React.FC = () => {
  const { availableTenants, setActiveTenantId, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (tenantId: string) => {
    setActiveTenantId(tenantId);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <img src="/aps-logo.svg" alt="APS Construction" className="h-20 mx-auto mb-6" />
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Choisissez votre espace de travail
            </h1>
            <p className="text-gray-500 font-medium">
              Vous avez accès à plusieurs espaces. Sélectionnez celui que vous souhaitez rejoindre.
            </p>
          </div>

          <div className="grid gap-4">
            {availableTenants.map((tenant, index) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card
                  className="cursor-pointer hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 transition-all group"
                  onClick={() => handleSelect(tenant.id)}
                >
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{tenant.name}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {roleLabels[tenant.role] || tenant.role}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-red-600"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSelectorPage;
