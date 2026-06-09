# Todo List — Projet Docker ESGI

Application full-stack de gestion de tâches conteneurisée avec Docker. Le projet met en œuvre les notions vues en cours : images multi-stage, réseaux personnalisés, volumes, healthchecks et orchestration avec Docker Compose.

> Le code applicatif est volontairement minimal. L'évaluation porte sur la configuration Docker.

---

## Stack

| Couche | Technologie | Conteneur |
|--------|-------------|-----------|
| Front-end | Vue.js 3 + Vite, servi par Nginx | `todo-frontend` |
| Back-end | Node.js 20 + Express | `todo-backend` |
| Base de données | MariaDB 11.4 | `todo-db` |

---

## Architecture

```
                        HÔTE
                 http://localhost:8080
                          │  (seul port publié)
   ┌──────────────────────┼──────────────────────────────┐
   │  DOCKER              ▼                               │
   │  ┌─────── frontend-net (bridge) ──────────────┐     │
   │  │                                             │     │
   │  │  ┌──────────────┐        ┌──────────────┐  │     │
   │  │  │ todo-frontend│──/api─▶│ todo-backend │  │     │
   │  │  │   Nginx :80  │        │ Express :3000│  │     │
   │  │  └──────────────┘        └──────┬───────┘  │     │
   │  └─────────────────────────────────┼──────────┘     │
   │                                    │                  │
   │  ┌──── backend-net (bridge, internal) ┼────────┐     │
   │  │                                   ▼         │     │
   │  │                          ┌──────────────┐   │     │
   │  │                          │   todo-db    │   │     │
   │  │                          │ MariaDB :3306│   │     │
   │  │                          └──────┬───────┘   │     │
   │  └──────────────────────────────────┼──────────┘     │
   │                               volume db_data          │
   └───────────────────────────────────────────────────────┘

  todo-frontend n'est pas sur backend-net : il ne peut pas atteindre todo-db.
```

Flux d'une requête : navigateur → Nginx (8080) → reverse proxy `/api` → Express → MariaDB.

---

## Prérequis

- Docker et Docker Compose v2
- Port 8080 libre

---

## Installation

```bash
git clone https://github.com/ziriatamine-nf/docker-soutenance.git
cd docker-soutenance

cp .env.example .env
# Éditer .env : renseigner DOCKERHUB_USER et les mots de passe MariaDB

docker compose up --build -d
```

Ouvrir **http://localhost:8080**.

```bash
docker compose down            # arrête la stack, conserve le volume
docker compose down --volumes  # arrête la stack et supprime les données
```

---

## Services, réseaux et volumes

### Services

| Service | Image | Port publié | Réseaux | Dépend de |
|---------|-------|-------------|---------|-----------|
| `frontend` | build local (multi-stage) | 8080:80 | frontend-net | backend (healthy) |
| `backend` | build local | aucun | frontend-net, backend-net | db (healthy) |
| `db` | mariadb:11.4 | aucun | backend-net | — |

### Réseaux

| Réseau | Driver | Membres | Remarque |
|--------|--------|---------|----------|
| `frontend-net` | bridge | frontend, backend | communication front ↔ back |
| `backend-net` | bridge | backend, db | `internal: true` — aucun accès extérieur |

### Volume

| Volume | Monté sur | Type |
|--------|-----------|------|
| `db_data` | `/var/lib/mysql` | volume nommé (persistance MariaDB) |

Le fichier `db/init.sql` est monté en bind mount dans `/docker-entrypoint-initdb.d/` et exécuté automatiquement au premier démarrage.

---

## Tests

### Communication et isolation réseau

```bash
# Vérification applicative (backend connecté à la base)
curl http://localhost:8080/api/health
# -> {"status":"ok","db":"connected"}

# Connexion TCP du backend vers la base (réseau backend-net)
docker exec todo-backend nc -z -v db 3306
# -> db (172.x.x.x:3306) open

# Le frontend ne peut pas résoudre "db" (pas sur backend-net)
docker exec todo-frontend ping -c 2 db
# -> ping: bad address 'db'

# Inspecter les membres du réseau backend-net
docker network inspect docker-soutenance_backend-net
# -> backend + db uniquement, Internal: true
```

### Persistance des données

```bash
# Ajouter des tâches via l'interface, puis :
docker compose down
docker compose up -d
# Les tâches sont toujours présentes (volume db_data conservé)

# Supprimer le volume (données perdues, init.sql rejoué)
docker compose down --volumes
docker compose up -d
```

### Commandes utiles

```bash
docker compose ps
docker compose logs -f [service]
docker volume inspect docker-soutenance_db_data
docker stats
```

---

## Structure

```
docker-soutenance/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── front/
│   ├── Dockerfile          # multi-stage : Node (build) → Nginx (prod)
│   ├── nginx.conf          # SPA + reverse proxy /api
│   └── src/
├── back/
│   ├── Dockerfile          # Node 20, cache de layers, utilisateur non-root
│   └── server.js
└── db/
    └── init.sql
```

---

## Docker Hub

Les commandes de publication des images sont dans `docker-hub.md`.
