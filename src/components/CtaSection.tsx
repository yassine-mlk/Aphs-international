import React from 'react';
import { Button } from "@/components/ui/button";

const CtaSection: React.FC = () => {
  return (
    <section className="py-20 bg-blue-600">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Prêt à Transformer Votre Gestion de Projets ?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Rejoignez des centaines d'entreprises qui font confiance à APS pour leurs projets de construction.
        </p>
        <Button 
          variant="outline"
          className="bg-white text-blue-600 border-white hover:bg-blue-50 text-lg px-8 py-3"
        >
          Commencer Gratuitement
        </Button>
      </div>
    </section>
  );
};

export default CtaSection;
