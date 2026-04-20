#!/bin/bash

# Script de déploiement des Edge Functions Visa Workflow
# Usage: ./deploy-edge-functions.sh [all|nom-fonction]

set -e

FUNCTIONS_DIR="supabase/functions"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Liste des fonctions à déployer
FUNCTIONS=(
    "start-visa"
    "submit-opinion"
    "resubmit-document"
    "notify-validator"
    "notify-emitter"
    "send-email"
)

# Vérifier que supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Fonction de déploiement
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}📦 Déploiement de ${func_name}...${NC}"
    
    if supabase functions deploy "$func_name"; then
        echo -e "${GREEN}✅ ${func_name} déployé avec succès${NC}"
    else
        echo -e "${RED}❌ Échec du déploiement de ${func_name}${NC}"
        return 1
    fi
}

# Vérifier la connexion au projet
check_link() {
    if [ -z "$PROJECT_REF" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_PROJECT_REF non défini${NC}"
        echo "Options:"
        echo "1. Définissez la variable: export SUPABASE_PROJECT_REF=votre-project-ref"
        echo "2. Ou liez le projet manuellement: supabase link --project-ref <ref>"
        exit 1
    fi
    
    echo -e "${GREEN}🔗 Connexion au projet: ${PROJECT_REF}${NC}"
    supabase link --project-ref "$PROJECT_REF" || true
}

# Main
main() {
    echo -e "${GREEN}🚀 Déploiement des Edge Functions Visa Workflow${NC}"
    echo "================================================"
    
    check_link
    
    # Déployer selon l'argument
    if [ "$1" = "all" ] || [ -z "$1" ]; then
        echo -e "${YELLOW}📦 Déploiement de toutes les fonctions...${NC}"
        for func in "${FUNCTIONS[@]}"; do
            deploy_function "$func"
        done
    else
        # Déployer une fonction spécifique
        if [ -d "$FUNCTIONS_DIR/$1" ]; then
            deploy_function "$1"
        else
            echo -e "${RED}❌ Fonction '$1' non trouvée dans $FUNCTIONS_DIR/${NC}"
            echo "Fonctions disponibles:"
            for func in "${FUNCTIONS[@]}"; do
                echo "  - $func"
            done
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Déploiement terminé !${NC}"
    echo ""
    echo "Vérification:"
    echo "  supabase functions list"
    echo ""
    echo "Configuration des secrets:"
    echo "  supabase secrets set RESEND_API_KEY=votre-cle"
    echo "  supabase secrets set EMAIL_FROM=noreply@votredomaine.com"
    echo "  supabase secrets set APP_URL=https://votredomaine.com"
}

# Exécuter
main "$@"
