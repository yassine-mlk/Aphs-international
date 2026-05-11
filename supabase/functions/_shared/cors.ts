export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  
  // Lire les origines autorisées depuis les variables d'environnement
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  
  // Origines par défaut
  const defaultOrigins = [
    'https://www.aps-construction.com', 
    'https://aps-construction.com', 
    'http://localhost:8080'
  ];
  
  // Si ALLOWED_ORIGINS est défini à "*", on retourne "*"
  if (envOrigins === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Max-Age': '86400',
    };
  }

  const allowedOriginsList = envOrigins 
    ? envOrigins.split(',').map(o => o.trim())
    : defaultOrigins;
    
  // Vérifier si l'origine de la requête est autorisée
  const allowedOrigin = allowedOriginsList.includes(origin) ? origin : allowedOriginsList[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};
