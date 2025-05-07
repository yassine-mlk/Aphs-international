import { useEffect } from 'react';
import { useSupabase } from '../hooks/useSupabase';

// Ce composant ne fait plus rien actuellement car la création de buckets
// nécessite des permissions administratives dans Supabase
// Les buckets doivent être créés manuellement dans l'interface Supabase
const StorageInitializer = () => {
  useEffect(() => {
    console.log('Storage initializer: les buckets doivent être créés manuellement dans Supabase');
  }, []);

  // Ce composant ne rend rien visuellement
  return null;
};

export default StorageInitializer; 