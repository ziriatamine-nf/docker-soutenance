
CREATE TABLE IF NOT EXISTS tasks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  done       BOOLEAN      NOT NULL DEFAULT FALSE,   
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO tasks (title, done) VALUES
  ('Réviser les notions Docker',            TRUE),
  ('Construire les images (docker build)',  FALSE),
  ('Lancer la stack (docker compose up)',   FALSE),
  ('Prouver l''isolation réseau au jury',   FALSE),
  ('Réussir la soutenance ESGI',            FALSE);
