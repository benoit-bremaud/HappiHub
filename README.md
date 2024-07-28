# HappiHub - La culture, le partage, la communauté

## Table des Matières

1. [Introduction](#introduction)
2. [Structure du Projet](#structure-du-projet)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
   - [Cloner le Dépôt](#cloner-le-dépôt)
   - [Installation des Dépendances](#installation-des-dépendances)
   - [Configuration Initiale](#configuration-initiale)
   - [Lancer l'Application](#lancer-lapplication)
5. [Configuration de l'Environnement](#configuration-de-lenvironnement)
   - [Backend](#backend)
   - [Frontend](#frontend)
6. [Démarrage des Conteneurs Docker](#démarrage-des-conteneurs-docker)
   - [Environnement de Développement (Défaut)](#environnement-de-développement-défaut)
   - [Environnement de Production](#environnement-de-production)
   - [Environnement de Test](#environnement-de-test)
7. [Vérification du Bon Fonctionnement](#vérification-du-bon-fonctionnement)
   - [Vérification du Backend](#vérification-du-backend)
   - [Vérification du Frontend](#vérification-du-frontend)
   - [Surveillance des Services](#surveillance-des-services)
8. [Tests](#tests)
   - [Exécution des Tests](#exécution-des-tests)
   - [Types de Tests](#types-de-tests)
9. [Correction des Erreurs Courantes](#correction-des-erreurs-courantes)
10. [Contribution](#contribution)
    - [Règles de Contribution](#règles-de-contribution)
    - [Processus de Pull Request](#processus-de-pull-request)
11. [Documentation](#documentation)
    - [Documentation de l'API](#documentation-de-lapi)
    - [Documentation de la Gestion des Tokens JWT](#documentation-de-la-gestion-des-tokens-jwt)
    - [Guide Général](#guide-général)
    - [FAQ](#faq)
12. [Changelog et Historique](#changelog-et-historique)
    - [Changelog](#changelog)
    - [Guide de Mise à Jour du Changelog](#guide-de-mise-à-jour-du-changelog)
13. [Sécurité](#sécurité)
14. [Code de Conduite](#code-de-conduite)
15. [Licence](#licence)
16. [Démarrage Manuel des Services](#démarrage-manuel-des-services)
17. [Contact et Support](#contact-et-support)

---

## Introduction

HappiHub est une application web de réseau social conçue pour connecter les personnes autour d'événements culturels et communautaires. Notre objectif est de faciliter l'organisation et la participation à ces événements, en créant une plateforme où les utilisateurs peuvent découvrir, partager et s'engager dans des activités locales et d'intérêt commun. Que vous soyez un organisateur d'événements ou un passionné à la recherche de nouvelles expériences, HappiHub offre une interface conviviale et des outils puissants pour vous aider à rester connecté avec votre communauté.


## Structure du Projet

Le projet HappiHub est organisé en plusieurs répertoires principaux, chacun servant un but spécifique :

- `client/` : Contient le code source du frontend React.
  - `src/` : Dossier principal contenant les composants, les pages, et les styles.
    - `components/` : Composants réutilisables de l'application.
    - `pages/` : Pages principales de l'application.
    - `styles/` : Feuilles de style CSS et SCSS.
  - `public/` : Contient les fichiers statiques publics comme `index.html`.

- `server/` : Contient le code source du backend Node.js/Express.
  - `models/` : Définitions des schémas et des modèles de base de données MongoDB.
  - `controllers/` : Logique métier et gestionnaires de routes.
  - `routes/` : Définition des routes API.
  - `middlewares/` : Middlewares pour le traitement des requêtes.
  - `config/` : Fichiers de configuration, comme la configuration de la base de données.
  - `tests/` : Tests unitaires, d'intégration et E2E.
    - `unit/` : Tests unitaires pour le backend.
    - `integration/` : Tests d'intégration pour vérifier les interactions entre les différents modules.
    - `e2e/` : Tests End-to-End pour simuler des scénarios utilisateur.

- `docs/` : Documentation du projet.
  - `jest/` : Documentation sur l'utilisation de Jest pour les tests.

- `scripts/` : Scripts utilitaires pour le projet, comme les scripts de déploiement ou de configuration.

- `config/` : Fichiers de configuration de l'application, comme `webpack.config.js` pour le frontend ou les configurations de l'environnement.

- `Dockerfile` : Fichier de configuration Docker pour la conteneurisation de l'application.

- `README.md` : Document d'accueil et d'introduction au projet.

---

## Prérequis

Pour travailler sur le projet HappiHub, assurez-vous d'avoir les éléments suivants installés :

### Outils Essentiels

- [Docker](https://www.docker.com/get-started) : Utilisé pour la conteneurisation des applications. Assurez-vous d'avoir Docker installé, de préférence la dernière version stable.
- [Docker Compose](https://docs.docker.com/compose/install/) : Utilisé pour orchestrer les conteneurs Docker. Vérifiez que Docker Compose est installé et fonctionnel, idéalement la dernière version stable.

### Prérequis Techniques

- [Node.js](https://nodejs.org/) : Bien que Docker soit utilisé, Node.js est recommandé pour les développeurs souhaitant exécuter des scripts locaux ou installer des dépendances sans Docker. La version recommandée est 14.x ou plus récente.
- [npm](https://www.npmjs.com/) : Le gestionnaire de paquets Node.js. Il est généralement installé avec Node.js.

### Environnement de Développement

- **Fichiers de Configuration** : Assurez-vous que les fichiers de configuration tels que `.env` sont présents et correctement configurés. Des exemples de fichiers de configuration peuvent être fournis sous le nom `.env.example`.
- **Ports** : Les ports par défaut utilisés par le projet sont 3000 pour le frontend (client) et 5000 pour le backend (server). Assurez-vous que ces ports sont libres ou ajustez les configurations en conséquence.

### Outils Optionnels

- **IDE Recommandé** : [Visual Studio Code](https://code.visualstudio.com/) avec les extensions recommandées pour le développement JavaScript et Docker.
- **Extensions VS Code** :
  - Docker : Pour gérer les conteneurs Docker directement depuis VS Code.
  - ESLint : Pour le linting du code JavaScript.

---

## 3. Installation

Pour installer et configurer le projet HappiHub, suivez les étapes ci-dessous :

### 1. Cloner le Dépôt

Commencez par cloner le dépôt GitHub sur votre machine locale et accédez au répertoire du projet :

```bash
git clone https://github.com/benoit-bremaud/happihub.git
cd happihub
```

### 2. Installation des Dépendances

Installez les dépendances nécessaires pour le frontend et le backend :

```bash
# Installation des dépendances backend
cd server
npm install

# Installation des dépendances frontend
cd ../client
npm install
```

### 3. Configuration Initiale

1. **Variables d'Environnement** : 
   - Créez un fichier `.env` dans les répertoires `server` et `client` en utilisant les fichiers `.env.example` fournis comme modèles.
   - Remplissez les variables d'environnement nécessaires, telles que les clés d'API, les informations de connexion à la base de données, et autres configurations spécifiques.

2. **Configuration Docker** : 
   - Assurez-vous que Docker et Docker Compose sont installés.
   - Utilisez le fichier `docker-compose.yml` pour configurer les conteneurs de l'application. Lancez les conteneurs avec la commande suivante :

   ```bash
   docker-compose up -d
   ```

### 4. Lancer l'Application

Une fois toutes les dépendances installées et les configurations effectuées, vous pouvez lancer l'application.

- **Backend** : 

  Démarrez le serveur backend en exécutant :

  ```bash
  cd server
  npm start
  ```

- **Frontend** :

  Lancez l'application frontend avec :

  ```bash
  cd client
  npm start
  ```

Accédez à l'application en ouvrant votre navigateur à `http://localhost:3000` pour le frontend et `http://localhost:5000` pour l'API backend.

### 5. Exécution des Tests

Pour exécuter les tests, utilisez la commande suivante :

```bash
npm test
```

Cette commande exécutera les tests unitaires, d'intégration et E2E configurés dans le projet.

Pour plus de détails, consultez la documentation spécifique dans le répertoire `docs/`.

---

## 4. Configuration de l'Environnement

Avant de démarrer le projet, il est essentiel de configurer correctement les variables d'environnement pour le backend et le frontend. Ces variables définissent les configurations spécifiques à chaque environnement (développement, production, test).

### 4.1. Backend

1. **Naviguer dans le répertoire `server/` :**

   Accédez au répertoire du backend avec la commande suivante :

   ```bash
   cd server/
   ```

2. **Créer les fichiers `.env` pour chaque environnement :**

   Copiez le fichier `.env.example` pour créer les fichiers `.env` spécifiques à chaque environnement :

   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   cp .env.example .env.test
   ```

3. **Configurer les variables d'environnement :**

   Ouvrez chaque fichier `.env` et configurez les variables selon vos besoins pour chaque environnement. Voici quelques exemples :

   **Exemple pour `.env.development`** :
   ```env
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/happihub_dev
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

   **Exemple pour `.env.production`** :
   ```env
   NODE_ENV=production
   MONGO_URI=mongodb://mongo:27017/happihub_prod
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

   **Exemple pour `.env.test`** :
   ```env
   NODE_ENV=test
   MONGO_URI=mongodb://localhost:27017/happihub_test
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

**Note** : Assurez-vous de gérer les secrets, tels que `JWT_SECRET`, de manière sécurisée, en particulier en production. Utilisez des solutions de gestion des secrets comme AWS Secrets Manager ou Azure Key Vault, ou gardez ces informations dans des fichiers `.env` non commis au contrôle de version.

### 4.2. Frontend

1. **Naviguer dans le répertoire `client/` :**

   Accédez au répertoire du frontend avec la commande suivante :

   ```bash
   cd client/
   ```

2. **Créer le fichier `.env` :**

   Copiez le fichier `.env.example` pour créer le fichier `.env` :

   ```bash
   cp .env.example .env
   ```

3. **Configurer les variables d'environnement :**

   Ouvrez le fichier `.env` et configurez les variables selon vos besoins. Par exemple :

   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

Assurez-vous que les valeurs des variables d'environnement sont correctement définies pour correspondre à la configuration de votre environnement de développement, de test ou de production.

---

## 5. Démarrage des Conteneurs Docker

Le projet HappiHub utilise Docker pour simplifier le déploiement et la gestion des environnements. Les fichiers `Dockerfile` et `docker-compose.yml` fournis permettent de construire et de démarrer les conteneurs Docker pour différents environnements (développement, production, test) en utilisant des profils Docker Compose spécifiques.

### 5.1. Environnement de Développement (Défaut)

Pour démarrer les conteneurs dans un environnement de développement, utilisez la commande suivante. Cette commande construira les images si elles n'existent pas encore et démarrera les conteneurs :

```bash
docker-compose up --build
```

Cette commande démarre les services définis dans le fichier `docker-compose.yml` avec les configurations par défaut. Utilisez cette configuration pour le développement local, car elle est optimisée pour la facilité de développement et de débogage.

### 5.2. Environnement de Production

Pour démarrer les conteneurs dans un environnement de production, utilisez le profil `prod`. Avant de lancer les services en production, assurez-vous de vérifier et de configurer correctement les variables d'environnement et les paramètres de sécurité pour éviter les fuites de données et les vulnérabilités de sécurité :

```bash
docker-compose --profile prod up --build
```

**Note** : Les configurations de production doivent inclure des paramètres de sécurité renforcés, des optimisations de performance, et des mécanismes de surveillance et de gestion des erreurs. Vérifiez également que les bases de données et les services externes sont correctement configurés pour l'environnement de production.

### 5.3. Environnement de Test

Pour démarrer les conteneurs dans un environnement de test, utilisez le profil `test`. Cet environnement est conçu pour isoler les tests et s'assurer qu'ils n'interfèrent pas avec les données de production ou de développement :

```bash
docker-compose --profile test up --build
```

**Note** : Assurez-vous que les données de test sont correctement configurées et que les tests n'affectent pas les données de production. Utilisez des bases de données et des services de test isolés pour éviter les interférences.


---

## 6. Vérification du Bon Fonctionnement

Après avoir démarré les conteneurs Docker pour les différents services, il est important de vérifier que le projet fonctionne correctement. Voici les étapes recommandées pour effectuer ces vérifications :

### 6.1. Vérification du Backend

1. **Accès à l'API Backend** :

   Utilisez un navigateur web ou `curl` pour vérifier que l'API backend répond correctement.

   - **Utiliser un Navigateur Web** :
     - Ouvrez votre navigateur web.
     - Accédez à `http://localhost:5000/test`.
     - Vous devriez voir la réponse `"Hello HappiHub Server!"`.

   - **Utiliser `curl` (ligne de commande)** :
     - Ouvrez votre terminal.
     - Exécutez la commande suivante :
       ```bash
       curl http://localhost:5000/test
       ```
     - Vous devriez voir la réponse `"Hello HappiHub Server!"`.

2. **Vérification des Logs du Serveur** :

   - Vérifiez les logs du serveur pour tout message d'erreur ou avertissement. Utilisez la commande suivante pour afficher les logs en temps réel :
     ```bash
     docker-compose logs -f server
     ```

3. **Connexion à la Base de Données** :

   - Assurez-vous que le backend se connecte correctement à la base de données MongoDB. Vous pouvez vérifier cela dans les logs ou via des outils de gestion de MongoDB.

### 6.2. Vérification du Frontend

1. **Accès à l'Application Frontend** :

   Vérifiez que le frontend fonctionne en accédant à l'application via un navigateur ou `curl`.

   - **Utiliser un Navigateur Web** :
     - Ouvrez votre navigateur web.
     - Accédez à `http://localhost:3000`.
     - Vous devriez voir la page d'accueil par défaut de l'application React.

   - **Utiliser `curl` (ligne de commande)** :
     - Ouvrez votre terminal.
     - Exécutez la commande suivante :
       ```bash
       curl http://localhost:3000
       ```
     - Vous devriez voir le code HTML de la page d'accueil de l'application React.

2. **Test des Fonctionnalités Principales** :

   - Naviguez dans l'application et testez les fonctionnalités de base, telles que la navigation entre les pages, les soumissions de formulaires, et les appels API.

### 6.3. Surveillance des Services

1. **Outils de Surveillance** :

   Utilisez des outils de surveillance comme `Docker Dashboard`, `Portainer`, ou `cAdvisor` pour surveiller les performances et l'état des conteneurs Docker.

2. **Vérification des Ressources** :

   Assurez-vous que les ressources (CPU, mémoire, stockage) sont utilisées de manière optimale et qu'il n'y a pas de goulets d'étranglement.

---

## 7. Tests

Les tests sont essentiels pour garantir la qualité et la fiabilité du projet HappiHub. Cette section décrit comment exécuter les tests et les différents types de tests mis en place.

### 7.1. Exécution des Tests

Pour exécuter les tests, assurez-vous d'abord que les dépendances nécessaires sont installées, puis utilisez les commandes suivantes en fonction du type de test que vous souhaitez exécuter.

1. **Tests Unitaires** :

   Les tests unitaires vérifient le fonctionnement de composants individuels ou de fonctions. Pour exécuter les tests unitaires, utilisez la commande suivante :

   ```bash
   npm run test:unit
   ```

2. **Tests d'Intégration** :

   Les tests d'intégration vérifient que différents composants fonctionnent bien ensemble. Pour exécuter les tests d'intégration, utilisez :

   ```bash
   npm run test:integration
   ```

3. **Tests End-to-End (E2E)** :

   Les tests E2E simulent des scénarios utilisateurs complets pour s'assurer que le système fonctionne comme prévu dans son ensemble. Pour exécuter les tests E2E, utilisez :

   ```bash
   npm run test:e2e
   ```

### 7.2. Types de Tests

Le projet HappiHub utilise plusieurs types de tests pour couvrir différents aspects de l'application.

1. **Tests Unitaires** :

   - **Description** : Ces tests se concentrent sur des fonctions ou des composants spécifiques, vérifiant qu'ils se comportent comme prévu de manière isolée.
   - **Exemples** : Tests des fonctions utilitaires, validation des entrées de l'utilisateur, tests des composants React.

2. **Tests d'Intégration** :

   - **Description** : Les tests d'intégration vérifient les interactions entre plusieurs composants ou systèmes. Ils s'assurent que les modules fonctionnent ensemble comme prévu.
   - **Exemples** : Tests des API backend avec la base de données, interaction entre le frontend et le backend.

3. **Tests End-to-End (E2E)** :

   - **Description** : Les tests E2E simulent les interactions des utilisateurs avec l'application, couvrant des scénarios réels de bout en bout.
   - **Exemples** : Scénarios de connexion, flux de paiement, navigation sur le site.

4. **Tests de Couverture** :

   - **Description** : Bien qu'ils ne soient pas un type de test distinct, les tests de couverture mesurent le pourcentage de code exécuté par les tests.
   - **Exemples** : Utilisation d'outils comme `jest --coverage` pour générer des rapports de couverture de code.

5. **Tests de Performance** :

   - **Description** : Ces tests évaluent la performance de l'application, comme les temps de réponse des API ou le chargement des pages.
   - **Exemples** : Tests de charge avec des outils comme JMeter ou Artillery.

---

## 8. Contribution

Nous accueillons avec plaisir les contributions au projet HappiHub. Que vous souhaitiez signaler un bug, proposer une nouvelle fonctionnalité ou améliorer la documentation, voici comment vous pouvez participer :

### 8.1. Règles de Contribution

1. **Fork le Dépôt** : Commencez par forker le dépôt principal pour obtenir une copie sur votre compte GitHub.

2. **Créez une Branche** : Créez une nouvelle branche pour votre fonctionnalité ou correction de bug. Utilisez une convention de nommage descriptive pour faciliter la gestion des branches :
   ```bash
   git checkout -b feature/nomDeLaFonctionnalite
   ```
   ou
   ```bash
   git checkout -b bugfix/descriptionDuBug
   ```

3. **Commit des Modifications** : Faites vos modifications dans votre branche et committez-les. Assurez-vous d'écrire des messages de commit clairs et descriptifs :
   ```bash
   git commit -m 'Ajout de la fonctionnalité XYZ'
   ```

4. **Push la Branche** : Poussez votre branche sur votre fork GitHub :
   ```bash
   git push origin feature/nomDeLaFonctionnalite
   ```

5. **Créez une Pull Request** : Ouvrez une Pull Request (PR) sur le dépôt principal depuis votre fork. Décrivez clairement les modifications apportées, les raisons de ces modifications, et toute information pertinente pour la révision. Assurez-vous de lier toute issue pertinente à la PR.

Pour plus de détails, consultez le fichier [CONTRIBUTING](docs/CONTRIBUTING.md) qui contient des instructions supplémentaires sur le style de code, les conventions de commit, et d'autres meilleures pratiques.

### 8.2. Processus de Pull Request

1. **Examen de la PR** : Une fois que vous avez soumis une PR, elle sera examinée par les mainteneurs du projet. Attendez-vous à des commentaires ou des demandes de modifications.

2. **Tests et Validation** : Assurez-vous que votre PR passe tous les tests automatisés et répond aux critères de qualité du code. Les PRs qui ne passent pas les tests ou qui ne respectent pas les normes de code ne seront pas fusionnées.

3. **Fusion de la PR** : Une fois que votre PR a été approuvée, elle sera fusionnée dans la branche principale par un mainteneur. Vous pouvez ensuite supprimer votre branche locale et la branche distante sur votre fork.

4. **Suivi** : Après la fusion, suivez les issues et les discussions pour répondre à d'éventuelles questions ou clarifications.

Nous apprécions toutes les contributions et nous remercions les contributeurs pour leur temps et leurs efforts. Votre participation aide à améliorer HappiHub pour tout le monde !

---

## 9. Correction des Erreurs Courantes

Lors de l'utilisation de HappiHub, vous pourriez rencontrer certaines erreurs courantes. Voici comment résoudre l'erreur relative aux ports non disponibles sur Linux (Ubuntu) :

### Erreur : Ports are not available

Si vous rencontrez une erreur indiquant que les ports ne sont pas disponibles, cela signifie que le port est déjà utilisé par un autre processus. Pour résoudre ce problème sur Linux (Ubuntu), suivez ces étapes :

#### Linux (Ubuntu)

1. **Trouver le processus utilisant le port 27017** :
   Utilisez la commande suivante pour identifier le processus utilisant le port 27017 :

   ```bash
   sudo lsof -i :27017
   ```

   Exemple de sortie :
   ```plaintext
   COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
   mongod  2100 mongodb   11u  IPv4  24553      0t0  TCP localhost:27017 (LISTEN)
   ```

2. **Tuer le processus utilisant le port 27017** :
   Une fois que vous avez identifié le PID (Process ID) du processus utilisant le port, tuez-le en utilisant la commande suivante :

   ```bash
   sudo kill -9 2100
   ```

   Remplacez `2100` par le PID trouvé dans la sortie de la commande précédente.

Pour des instructions détaillées sur la résolution de cette erreur sous d'autres systèmes d'exploitation comme Windows et Mac, ainsi que pour d'autres problèmes courants, veuillez consulter notre [Guide de Dépannage dans la FAQ](docs/FAQ.md).

---


## Code de Conduite

Nous avons adopté un code de conduite pour notre communauté. Pour en savoir plus, consultez le [Code de Conduite

](docs/CODE_OF_CONDUCT.md).

## Sécurité

Pour signaler une vulnérabilité de sécurité, veuillez lire notre [Politique de Sécurité](docs/SECURITY.md).

## Changelog

Pour suivre les modifications, ajouts, corrections de bugs et améliorations apportées au projet HappiHub, consultez le fichier [CHANGELOG.md](./docs/changelog/CHANGELOG.md). Ce fichier documente l'évolution du projet de manière chronologique et structurée, suivant les conventions de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et [Semantic Versioning](https://semver.org/).

Pour des instructions détaillées sur comment, quand et pourquoi mettre à jour le fichier CHANGELOG, veuillez consulter le fichier [CHANGELOG_GUIDE.md](./docs/changelog/CHANGELOG_GUIDE.md).

## Documentation de l'API

Pour une documentation détaillée de l'API de HappiHub, veuillez consulter le fichier [API_DOCUMENTATION](docs/API_DOCUMENTATION.md). Ce document inclut des descriptions des endpoints, des paramètres, et des exemples de requêtes et de réponses.

## Documentation de la Gestion des Tokens JWT

Nous avons ajouté une documentation complète pour la gestion des tokens JWT dans le projet HappiHub. Cette documentation couvre les aspects suivants :

- Introduction à JWT et son utilisation dans HappiHub
- Étapes détaillées pour générer des tokens JWT avec des exemples de codes
- Méthodes pour valider des tokens JWT avec des exemples de code
- Procédures pour rafraîchir des tokens JWT avec des exemples de code
- Bonnes pratiques de sécurité pour la gestion des tokens JWT

Pour consulter la documentation complète, veuillez suivre ce [JWT_DOCUMENTATION](docs/jwt/JWT_DOCUMENTATION.md).

## Guide Général

Pour des directives supplémentaires et des informations spécifiques sur le projet HappiHub, veuillez consulter le fichier [GUIDE.md](./docs/GUIDE.md). Ce guide fournit des conseils sur les bonnes pratiques de développement, l'utilisation des fonctionnalités avancées, ainsi que des astuces et des ressources utiles.

## FAQ

Pour répondre aux questions fréquemment posées, nous avons créé un fichier [FAQ.md](./docs/FAQ.md). Vous y trouverez des réponses détaillées sur l'installation, l'utilisation et la contribution au projet HappiHub. Si vous avez des questions supplémentaires, n'hésitez pas à consulter ce fichier avant de nous contacter.

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Start Manually Server

```bash
npm start
```

## Start Manually Client

```bash
npm run start
```

---