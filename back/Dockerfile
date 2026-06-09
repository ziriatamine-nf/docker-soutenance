# ============================================================================
#  Dockerfile du BACK-END (API Node.js / Express)
#  Image simple (mono-stage) : l'API a juste besoin de Node pour s'exécuter.
# ============================================================================

# FROM : image de base. node:20-alpine = Node.js 20 sur Alpine Linux,
# une distribution ultra-légère (~50 Mo) -> image finale petite et sûre.
FROM node:20-alpine

# WORKDIR : dossier de travail dans le conteneur. Toutes les instructions
# suivantes (COPY, RUN, CMD) s'exécutent relativement à /app.
# Le dossier est créé automatiquement s'il n'existe pas.
WORKDIR /app

# --- OPTIMISATION DU CACHE DE LAYERS (point clé à expliquer à l'oral) -------
# On copie D'ABORD uniquement package.json + package-lock.json, PUIS on installe
# les dépendances. Tant que ces fichiers ne changent pas, Docker réutilise le
# layer "npm install" depuis le cache : les rebuilds sont quasi instantanés.
# Si on copiait tout le code AVANT npm install, la moindre modif d'une ligne de
# server.js invaliderait le cache et relancerait un npm install complet.
COPY package*.json ./
RUN npm install --omit=dev

# Maintenant seulement on copie le reste du code source applicatif.
# (Le .dockerignore empêche de copier node_modules, .env, etc.)
COPY . .

# --- Variables d'environnement par défaut -----------------------------------
# Valeurs surchargées par docker-compose (environment / env_file).
# Elles servent de documentation et de valeurs de repli.
ENV NODE_ENV=production \
    PORT=3000

# USER : on bascule sur un utilisateur NON-ROOT (bonne pratique de sécurité).
# L'image node fournit déjà un utilisateur "node" (uid 1000). Si l'application
# était compromise, l'attaquant n'aurait pas les droits root dans le conteneur.
USER node

# EXPOSE : documente que le conteneur écoute sur le port 3000.
# /!\ EXPOSE ne publie RIEN sur l'hôte : c'est purement informatif.
# La publication réelle se fait avec "ports:" dans compose (ici on NE publie PAS
# le backend : il reste accessible uniquement via le réseau Docker interne).
EXPOSE 3000

# CMD : commande lancée au démarrage du conteneur (forme "exec", recommandée).
# Différence avec RUN : RUN s'exécute pendant le BUILD de l'image ;
# CMD s'exécute au DÉMARRAGE du conteneur.
CMD ["node", "server.js"]
