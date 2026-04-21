import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { HardHat, ArrowRight, CheckCircle } from 'lucide-react';

const CtaSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
    }
  };

  return (
    <section id="contact" className="py-24 px-4 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,193,7,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,193,7,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#FFC107]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B4513]/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="flex flex-col lg:flex-row">
              {/* Left Side - CTA */}
              <div className="w-full lg:w-1/2 p-12 lg:p-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/10 border border-[#FFC107]/30 mb-6">
                  <HardHat className="w-4 h-4 text-[#FFC107]" />
                  <span className="text-[#FFC107] text-sm font-medium">Démarrer gratuitement</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Prêt à révolutionner votre gestion de projet ?
                </h2>
                
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  Rejoignez les professionnels du BTP qui ont déjà adopté APS. 
                  Créez votre compte gratuitement et commencez à collaborer dès aujourd'hui.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "14 jours d'essai gratuit sans engagement",
                    "Accompagnement personnalisé à la mise en place",
                    "Migration de vos données existantes"
                  ].map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-[#FFC107] flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#FFC107] to-[#FF8F00] hover:from-[#FFB300] hover:to-[#F57C00] text-black font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#FFC107]/30 w-full sm:w-auto"
                  >
                    Créer mon compte
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="w-full lg:w-1/2 bg-[#0a0a0a]/50 backdrop-blur-sm p-12 lg:p-16 border-t lg:border-t-0 lg:border-l border-gray-800">
                <h3 className="text-2xl font-bold text-white mb-2">Être recontacté</h3>
                <p className="text-gray-400 mb-6">
                  Laissez-nous vos coordonnées, notre équipe vous recontactera sous 24h.
                </p>

                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#FFC107]/10 border border-[#FFC107]/30 rounded-xl p-6 text-center"
                  >
                    <CheckCircle className="w-12 h-12 text-[#FFC107] mx-auto mb-4" />
                    <h4 className="text-white font-bold mb-2">Message envoyé !</h4>
                    <p className="text-gray-400 text-sm">
                      Notre équipe vous recontactera très prochainement.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="cta-name" className="block text-white text-sm font-medium mb-2">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        id="cta-name"
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FFC107]/50 focus:ring-2 focus:ring-[#FFC107]/20 transition-all"
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="cta-email" className="block text-white text-sm font-medium mb-2">
                        Email professionnel
                      </label>
                      <input
                        type="email"
                        id="cta-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FFC107]/50 focus:ring-2 focus:ring-[#FFC107]/20 transition-all"
                        placeholder="vous@entreprise.fr"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="cta-company" className="block text-white text-sm font-medium mb-2">
                        Entreprise
                      </label>
                      <input
                        type="text"
                        id="cta-company"
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FFC107]/50 focus:ring-2 focus:ring-[#FFC107]/20 transition-all"
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#FFC107] to-[#FF8F00] hover:from-[#FFB300] hover:to-[#F57C00] text-black font-bold py-4 rounded-xl transition-all"
                    >
                      Envoyer ma demande
                    </Button>
                    <p className="text-gray-500 text-xs text-center">
                      En soumettant ce formulaire, vous acceptez notre politique de confidentialité.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaSection;
