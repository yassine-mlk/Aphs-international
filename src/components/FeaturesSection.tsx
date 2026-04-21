import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, delay = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('opacity-100', 'translate-y-0');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={cardRef}
      classNimport React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interfatiimport { cn } from '@/lib/utils';

interface Fea0 
interface FeatureCardProps {
  had  title: string;
  descr-1"
      )}
    >
     icon: React.Rme="w-12  delay?: number;
}

cod-}

const Featurenter   const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = newfo
  useEffect(() => {
    const observer = new        const observerxt      (entries) => {
        entries.fo
  );
};        entries.forti          if (entry.isIntersecting)io            setTimeout(()ent>(null);

              entry.target.cl o            }, delay);
            observer.unobserve(entry.target);
   .f            observer.            }
        });
      },
      { thr   entry.targe     ssList.add('opac    );

    if (cardRef0'
             observer.observe(ca(e    }

    return () => observer.discon  
  },
   }, [delay]);

  retur
    );

    if (
  return (
 rrent) {
        server      classNimportf.import { cn } from '@/lib/utils';

interfatiimport { cn }  }, 
interfatiimport { cn } from   {
  
interface Fea0 
interface FeatureCardProscrinterface Featfi  had  title: string;
  desoj  dese construction en    ps réel avec de  outi}

cod-}

const Featurenter   const cardRe xmlns="http
  useEffect(() => {
    const observer = newfo
  useEffect(()x="0     const observerur  useEffect(() => {
    cth    const observerun        entries.fo
  );
};        entries.forti          if (ent-2H5a  );
};        en2 0 002
              entry.target.cl o            }, delay);
            observer.unobserve(entry.tar 01            observer.unobserve(entry.target);
   .f />   .f            observer.            }
    ti        });
      },
   el",
      description: "Suivez l'ava
    if (cardRef0'
             observer.observe(catemps réel.",
      
    return () => observer.discon  
  .w3  },
   }, [delay]);

  retur
   " fill="none" viewBox="0    );24" stroke "currentColor">
           pa
interfatiimport { cn }  }, 
interfatiimport { cn } from   {
  
in"M1interfatiimport { c 11-18 0   
interface Fea0 
interf </svg>i  interface Feat    desoj  dese construction en    ps réel avec de  outi}

codlez 
cod-}

const Featurenter   const cardRe xmlns="http
  e c
conali  useEffect(() => {
    const observer = nett   /www.w3.org/2000/  useEffect(()x="0     cofi    cth    const observerun        entries.fo
  );
};        );
};        entries.forti          if ejoin}; ou};        en2 0 002
              entry.target.c6-   57M17 20H7m10 0v-            observer.unobserve(entry.tar 01       .356   .f />   .f            observer.            }
    ti        });
      },
   el",
-6 0 3    ti        });
      },
   el",
      descra2   0 11-4 0 2 2 0     0z" /            if (cardRef0'
      
    {
      title: "Sécur      
    return () => observer.discon  
  .do   ?es   .w3  },
   }, [delay])formes aux normes du 
  retur
   " con   " fio           pa
interfatiimport { cn }  }, 
interfatiimport2000/svg" classNainterfatiimport { cn } froie  
in"M1interfatiimport="currentiolinterface Fea0 
interf </svg>i  in="inted" strokeLin
codlez 
cod-}

const Featurenter   const cardRe xmlns="http
  e c
conali  useEffe944a11.9cod11.95
co 01-  e c
conali  useEffect(() => {
    const o4 con29     const observer = net.0  );
};        );
};        entries.forti          if ejoin}; ou};        en2 0 002
              entry.target.c6- ure}; cl};   me="py-2              entry.target.c6-   57M17 20H7m10 0v-           er mx    ti        });
      },
   el",
-6 0 3    ti        });
      },
   el",
      descra2   0 11-4 0 2 2 0     0z" /            if (cardRef0'
      
 00   -4">
            Fonctionnalité      },
   s
             el",         <      
    {
      title: "Sécur      
    return () => observous avez b    n     return () => obsets de   .do   ?es   .w3  },
   }, [d        }, [delay])formesv   retur
   " con   " fio          d- ols-2 linterfatiimport { cn }  },    interfatiimport2000/svg" cinin"M1interfatiimport="currentiolinterface Fea0 
interf </ture.tinterf </svg>i  in="inted" strokeLin
codlez 
c  codlez 
cod-}

const Featurentercriptcod}
   
con     e c
conali  useEffe944a11.9cod11.95
delay={index co 01-  e c
conali  useEff      conal           const o4 con29     c</};        );
};        entries.forti      ection;
