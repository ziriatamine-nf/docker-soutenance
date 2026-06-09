# ============================================================================
#  Dockerfile du FRONT-END (Vue.js 3) — BUILD MULTI-STAGE
#  --------------------------------------------------------------------------
#  Pourquoi un multi-stage ? Parce que pour COMPILER l'application Vue on a
#  besoin de Node + npm + Vite (des centaines de Mo). Mais pour la SERVIR en
#  production, on a juste besoin d'un serveur web statique (Nginx).
#  -> Stage 1 (node) : compile et produit le dossier /dist
#  -> Stage 2 (nginx): ne récupère QUE le /dist, sans Node ni node_modules.
#  Résultat : image finale légère (~25 Mo) et sûre (aucun outil de build).
# ============================================================================


# ----------------------------------------------------------------------------
#  STAGE 1 : "build" — compilation de l'application Vue avec Node + Vite
# ----------------------------------------------------------------------------
# Le mot-clé "AS build" nomme cette étape pour pouvoir y faire référence plus bas.
FROM node:20-alpine AS build

WORKDIR /app

# Optimisation du cache : on copie d'abord package*.json, on installe, PUIS
# on copie le code. (Même principe que pour le backend.)
COPY package*.json ./
RUN npm install

# On copie le reste des sources (src/, index.html, vite.config.js…)
COPY . .

# Compilation : Vite génère le site statique optimisé dans /app/dist
RUN npm run build


# ----------------------------------------------------------------------------
#  STAGE 2 : image finale de production — Nginx sert les fichiers statiques
# ----------------------------------------------------------------------------
FROM nginx:alpine

# COPY --from=build : on récupère UNIQUEMENT le résultat de la compilation
# (le dossier /app/dist du stage 1) et on le place là où Nginx sert les fichiers.
# Tout le reste du stage 1 (Node, node_modules, sources) est jeté.
COPY --from=build /app/dist /usr/share/nginx/html

# On remplace la configuration Nginx par défaut par la nôtre, qui :
#   1) sert le site Vue (avec gestion du routage SPA)
#   2) fait office de REVERSE PROXY : /api -> http://backend:3000
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Le conteneur écoute sur le port 80 (port HTTP standard de Nginx).
EXPOSE 80

# Démarrage de Nginx au premier plan (daemon off) : indispensable pour que le
# processus reste le PID 1 du conteneur et que Docker garde le conteneur en vie.
CMD ["nginx", "-g", "daemon off;"]
