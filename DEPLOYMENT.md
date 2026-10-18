# Guide de Déploiement Cloud Gratuit (Render + PostgreSQL Neon)

Ce guide permet de mettre en ligne l'API et la base de données gratuitement, pour que le **Directeur d'interclubs** et les **membres du club** puissent y accéder de partout sans rien avoir à installer ni lancer sur leur PC.

---

## Étape 1 : Créer la Base de Données PostgreSQL Gratuite (Neon.tech)

1. Rendez-vous sur [neon.tech](https://neon.tech) et connectez-vous (avec GitHub ou Google).
2. Cliquez sur **« Create Project »** :
   - **Nom du projet** : `interclub-db`
   - **Région** : Europe (Frankfurt)
3. Neon affiche immédiatement votre chaîne de connexion `Connection Details` :
   - Copiez la chaîne au format **Node.js / Prisma** :
     ```text
     postgresql://neondb_owner:VOTRE_MDP@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require
     ```
4. *(Optionnel)* Exécutez une fois la migration depuis votre terminal local pour créer les tables :
   ```bash
   cd server
   # Remplacez DATABASE_URL dans server/.env par votre lien Neon, puis :
   npm run prisma:push
   ```
   *(Render pourra aussi exécuter les migrations automatiquement grâce au Dockerfile).*

---

## Étape 2 : Déployer l'API Express sur Render (Web Service Gratuit)

1. Rendez-vous sur [render.com](https://render.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **« New + »** puis **« Web Service »**.
3. Sélectionnez votre dépôt GitHub **`BastienJonniaux/interclub-dashboard`**.
4. Remplissez les champs de configuration :
   - **Name** : `interclub-api` (ou le nom de votre choix)
   - **Region** : Frankfurt (EU Central)
   - **Root Directory** : `server`
   - **Language / Runtime** : **`Docker`** *(Render utilise automatiquement le `Dockerfile` situé dans `server/`)*
   - **Instance Type** : **Free** (0 $/mois)
5. Dans la section **Environment Variables**, ajoutez :
   - `DATABASE_URL` = *(La chaîne copiée depuis Neon à l'étape 1)*
   - `DIRECTOR_KEY` = *(Le mot de passe secret que vous donnerez au Directeur, ex: `club-leuze-2026`)*
   - `CORS_ORIGIN` = `*`
   - `NODE_ENV` = `production`
6. Cliquez sur **« Deploy Web Service »**.
   Render va construire l'image Docker, exécuter Prisma et démarrer le serveur.
7. Une fois le déploiement terminé, Render vous donne l'URL de votre API :
   `https://interclub-api.onrender.com`

---

## Étape 3 : Lier le Frontend à l'API Render

Dans le projet frontend `interclub-dashboard` :
1. Créez un fichier `.env.production` (ou ajoutez dans vos variables d'environnement Vercel/Netlify/Render) :
   ```env
   VITE_API_URL=https://interclub-api.onrender.com
   ```
2. Rebuildez ou redéployez le frontend.
3. Ouvrez le Simulateur : le voyant affichera :
   **🟢 Base de données : Connectée (PostgreSQL)**.

---

## Étape 4 : Utilisation par le Directeur & les Membres

1. **Pour le Directeur** :
   - Compose ses équipes dans le Simulateur.
   - Clique sur **« Sauvegarder (Serveur) »** : la première fois, la pop-up lui demande sa clé Directeur.
   - Une fois saisie, la clé est mémorisée dans son navigateur.
   - Il peut cliquer sur **« Verrouiller »** pour figer officiellement la ronde.
2. **Pour les membres du club** :
   - Viennent sur le site depuis leur téléphone ou PC.
   - Les compositions officielles s'affichent en lecture seule.

