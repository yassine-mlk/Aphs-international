-- Script SQL pour créer la table task_info_sheets
-- Table des fiches informatives des tâches - créée dans l'onglet "Paramètres du projet" de l'espace admin
-- SANS politiques RLS comme demandé

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS task_info_sheets CASCADE;

-- Créer la table task_info_sheets
CREATE TABLE task_info_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phase_id TEXT NOT NULL CHECK (phase_id IN ('conception', 'realisation')),
    section_id TEXT NOT NULL,
    subsection_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    info_sheet TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'es', 'ar')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Commentaires sur les colonnes
COMMENT ON TABLE task_info_sheets IS 'Table des fiches informatives des tâches - Créée depuis l''onglet Paramètres du projet de l''espace admin';
COMMENT ON COLUMN task_info_sheets.id IS 'Identifiant unique de la fiche informative';
COMMENT ON COLUMN task_info_sheets.phase_id IS 'Phase du projet: conception ou realisation';
COMMENT ON COLUMN task_info_sheets.section_id IS 'ID de la section (A, B, C, etc.)';
COMMENT ON COLUMN task_info_sheets.subsection_id IS 'ID de la sous-section (A1, A2, B1, etc.)';
COMMENT ON COLUMN task_info_sheets.task_name IS 'Nom de la tâche correspondante';
COMMENT ON COLUMN task_info_sheets.info_sheet IS 'Contenu de la fiche informative (texte détaillé)';
COMMENT ON COLUMN task_info_sheets.language IS 'Langue de la fiche: fr, en, es, ar';
COMMENT ON COLUMN task_info_sheets.created_by IS 'UUID de l''administrateur qui a créé la fiche';
COMMENT ON COLUMN task_info_sheets.created_at IS 'Date de création de la fiche';
COMMENT ON COLUMN task_info_sheets.updated_at IS 'Date de dernière mise à jour';

-- Créer des index pour améliorer les performances
CREATE INDEX idx_task_info_sheets_phase_id ON task_info_sheets(phase_id);
CREATE INDEX idx_task_info_sheets_section_id ON task_info_sheets(section_id);
CREATE INDEX idx_task_info_sheets_subsection_id ON task_info_sheets(subsection_id);
CREATE INDEX idx_task_info_sheets_task_name ON task_info_sheets(task_name);
CREATE INDEX idx_task_info_sheets_language ON task_info_sheets(language);
CREATE INDEX idx_task_info_sheets_created_by ON task_info_sheets(created_by);

-- Index composite pour optimiser les requêtes de recherche de fiche par tâche
CREATE INDEX idx_task_info_sheets_task_lookup ON task_info_sheets(
    phase_id, section_id, subsection_id, task_name, language
);

-- Index unique pour éviter les doublons de fiches pour une même tâche dans une même langue
CREATE UNIQUE INDEX idx_task_info_sheets_unique_task_language ON task_info_sheets(
    phase_id, section_id, subsection_id, task_name, language
);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_info_sheets_updated_at 
    BEFORE UPDATE ON task_info_sheets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- AUCUNE POLITIQUE RLS (Row Level Security) COMME DEMANDÉ
-- La table sera accessible sans restrictions pour tous les utilisateurs

-- Données d'exemple (optionnel)
-- Ces exemples correspondent aux tâches de la structure de projet
-- Décommentez pour insérer des exemples
/*
INSERT INTO task_info_sheets (
    phase_id, section_id, subsection_id, task_name, info_sheet, language, created_by
) VALUES
(
    'conception', 'A', 'A1', 'ETUDE PRÉALABLE',
    'Cette fiche informative détaille les étapes pour réaliser l''étude préalable du projet.

Objectifs :
- Analyser les besoins et contraintes du projet
- Définir les premières orientations techniques
- Évaluer la faisabilité générale

Livrables attendus :
- Rapport d''étude préalable
- Analyse des contraintes
- Premières recommandations

Documents à consulter :
- Cahier des charges initial
- Réglementation en vigueur
- Études existantes sur le site',
    'fr',
    NULL -- Remplacez par l'UUID d'un administrateur valide
),
(
    'conception', 'A', 'A1', 'AVIS SERVICES EXTERIEURS',
    'Cette fiche décrit le processus de consultation des services extérieurs.

Objectifs :
- Recueillir les avis des services compétents
- Identifier les contraintes réglementaires
- Obtenir les autorisations préalables

Services à consulter :
- Services techniques municipaux
- Services départementaux
- Organismes de contrôle
- Concessionnaires de réseaux

Délais à prévoir :
- Délai de consultation : 2-4 semaines
- Délai de réponse : 4-8 semaines',
    'fr',
    NULL
),
(
    'realisation', 'I', 'I1', 'FORME DU MARCHÉ',
    'Cette fiche guide le choix de la forme de marché adaptée au projet.

Types de marchés :
- Marché à prix global et forfaitaire
- Marché à prix unitaires
- Marché à prix révisables

Critères de choix :
- Nature des travaux
- Complexité technique
- Durée d''exécution
- Risques identifiés

Documents à produire :
- Note de justification du choix
- Projet de marché
- Cahier des charges',
    'fr',
    NULL
);
*/

-- Afficher le résultat
SELECT 'Table task_info_sheets créée avec succès!' as message;

-- Afficher les colonnes créées
SELECT 
    'Colonnes créées: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) as colonnes
FROM information_schema.columns 
WHERE table_name = 'task_info_sheets' 
    AND table_schema = 'public';

-- Afficher les index créés
SELECT 'Index créés: ' || string_agg(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'task_info_sheets';

-- Afficher les contraintes
SELECT 'Contraintes créées: ' || string_agg(conname, ', ') as constraints
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'task_info_sheets'; 