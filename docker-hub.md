# Publication des images sur Docker Hub

> Ce fichier contient **les commandes exactes à exécuter vous-même** pour
> publier les images sur Docker Hub. Aucune image n'est poussée automatiquement.
>
> Remplacez partout `VOTRE_PSEUDO` par votre identifiant Docker Hub (la même
> valeur que `DOCKERHUB_USER` dans votre fichier `.env`).

---

## 1. Pré-requis : construire et taguer les images

Grâce aux clés `image:` du `docker-compose.yml`, les images sont **déjà taguées**
au format `VOTRE_PSEUDO/todo-*:v1.0` lors du build :

```bash
# Construit frontend + backend et les tague selon la clé "image:" du compose
docker compose build
```

Vérifiez que les images existent :

```bash
docker images | grep todo
# VOTRE_PSEUDO/todo-frontend   v1.0   ...
# VOTRE_PSEUDO/todo-backend    v1.0   ...
```

---

## 2. Se connecter à Docker Hub

```bash
docker login
# Username : VOTRE_PSEUDO
# Password : votre mot de passe (ou un Access Token Docker Hub, recommandé)
```

---

## 3. Taguer les versions (v1.0 ET latest)

Bonne pratique vue en cours : on pousse une **version figée** (`v1.0`, pour la
traçabilité / reproductibilité) **et** le tag `latest` (le « dernier en date »,
pratique mais à ne jamais utiliser seul en production).

Le tag `v1.0` existe déjà (créé par `docker compose build`). On ajoute `latest` :

```bash
# Frontend
docker tag VOTRE_PSEUDO/todo-frontend:v1.0 VOTRE_PSEUDO/todo-frontend:latest

# Backend
docker tag VOTRE_PSEUDO/todo-backend:v1.0  VOTRE_PSEUDO/todo-backend:latest
```

> Rappel : `docker tag` ne duplique pas l'image, il crée seulement un second
> « nom » (étiquette) qui pointe vers la même image (même identifiant/digest).

---

## 4. Pousser les images

```bash
# Frontend : les deux tags
docker push VOTRE_PSEUDO/todo-frontend:v1.0
docker push VOTRE_PSEUDO/todo-frontend:latest

# Backend : les deux tags
docker push VOTRE_PSEUDO/todo-backend:v1.0
docker push VOTRE_PSEUDO/todo-backend:latest
```

Astuce — pousser **tous** les tags d'un dépôt en une commande :

```bash
docker push --all-tags VOTRE_PSEUDO/todo-frontend
docker push --all-tags VOTRE_PSEUDO/todo-backend
```

---

## 5. Vérifier

Vos images sont visibles sur `https://hub.docker.com/r/VOTRE_PSEUDO/todo-frontend`
et `.../todo-backend`. Pour tester le tirage depuis un poste vierge :

```bash
docker pull VOTRE_PSEUDO/todo-frontend:v1.0
docker pull VOTRE_PSEUDO/todo-backend:v1.0
```

---

## 6. Pourquoi on ne pousse PAS l'image MariaDB

On ne publie **que nos deux images** (`todo-frontend` et `todo-backend`), pas la
base de données. Raisons :

1. **C'est une image officielle non modifiée.** Le service `db` utilise
   directement `mariadb:11.4` (déclaré dans `docker-compose.yml`). Nous n'avons
   écrit aucun `Dockerfile` pour la base : il n'y a donc **aucune image
   personnalisée** à pousser.
2. **Republier une image officielle est inutile et déconseillé.** Elle est déjà
   disponible sur Docker Hub. La re-pousser sous notre compte gaspillerait de
   l'espace, créerait une copie qui ne recevrait pas les mises à jour de sécurité
   officielles, et prêterait à confusion.
3. **Notre personnalisation de la base n'est pas DANS une image** : elle vit dans
   le `init.sql` (monté via bind mount) et dans les variables d'environnement.
   Ces éléments font partie de notre dépôt git / `docker-compose.yml`, pas d'une
   image à publier.

> En résumé : on publie ce qu'on a **construit** (frontend, backend) ; on
> **réutilise** ce qui existe déjà (MariaDB).
