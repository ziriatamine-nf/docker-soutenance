-- ===========================================================================
--  Script d'initialisation de la base de données (MariaDB)
--  ---------------------------------------------------------------------------
--  Ce fichier est monté (bind mount) dans /docker-entrypoint-initdb.d/ du
--  conteneur MariaDB. L'image officielle exécute AUTOMATIQUEMENT tous les
--  fichiers .sql / .sh de ce dossier, mais UNIQUEMENT au PREMIER démarrage,
--  c'est-à-dire quand le volume de données (/var/lib/mysql) est encore vide.
--
--  -> Si on relance le conteneur avec le volume déjà rempli, ce script est
--     IGNORÉ : c'est exactement ce qui permet la PERSISTANCE des données.
--
--  Pas besoin de "CREATE DATABASE" ni de "USE" : l'entrypoint sélectionne déjà
--  la base définie par la variable MYSQL_DATABASE (todo_db) avant d'exécuter ce
--  script.
-- ===========================================================================

-- Table des tâches : structure demandée (id, title, done, created_at).
CREATE TABLE IF NOT EXISTS tasks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  done       BOOLEAN      NOT NULL DEFAULT FALSE,   -- BOOLEAN = TINYINT(1) en MariaDB
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Quelques données de démonstration pour que l'app ne soit pas vide au lancement.
INSERT INTO tasks (title, done) VALUES
  ('Réviser les notions Docker',            TRUE),
  ('Construire les images (docker build)',  FALSE),
  ('Lancer la stack (docker compose up)',   FALSE),
  ('Prouver l''isolation réseau au jury',   FALSE),
  ('Réussir la soutenance ESGI',            FALSE);
