# Contribuer à HappiHub

Merci de votre intérêt pour contribuer à HappiHub ! Ce document vous guidera à travers les étapes nécessaires pour contribuer efficacement à notre projet.

## Table des Matières
- [Code de Conduite](#code-de-conduite)
- [Signaler un Problème](#signaler-un-problème)
- [Proposer des Modifications](#proposer-des-modifications)
- [Configurer l'Environnement de Développement](#configurer-lenvironnement-de-développement)
- [Installation des Dépendances](#installation-des-dépendances)
- [Exécution des Tests](#exécution-des-tests)
- [Règles de Commit](#règles-de-commit)
- [Règles de Nommage des Branches](#règles-de-nommage-des-branches)
- [Linting et Formatage](#linting-et-formatage)
- [Processus de Review des Pull Requests](#processus-de-review-des-pull-requests)
- [Communauté et Support](#communauté-et-support)

## Code de Conduite

Ce projet adhère au [Code de Conduite](CODE_OF_CONDUCT.md). En participant, vous vous engagez à respecter ses termes.

## Signaler un Problème

Si vous rencontrez un problème ou avez une suggestion d'amélioration, veuillez utiliser le [système de suivi des problèmes](https://github.com/yourusername/happihub/issues) de GitHub pour le signaler.

## Proposer des Modifications

1. **Fork le dépôt**
2. **Clonez votre fork** :
   ```
   git clone https://github.com/votre-nom-utilisateur/happihub.git
   ```
3. **Créez une branche pour votre fonctionnalité ou correction de bug** :
   ```
   git checkout -b feature/nom-de-la-fonctionnalité
   ```
4. **Faites vos modifications et committez-les en suivant les [Règles de Commit](#règles-de-commit)**.
5. **Push votre branche vers votre fork** :
   ```
   git push origin feature/nom-de-la-fonctionnalité
   ```
6. **Ouvrez une Pull Request** sur le dépôt principal.

## Configurer l'Environnement de Développement

1. **Assurez-vous que Docker et Docker Compose sont installés**.
   - [Docker](https://www.docker.com/get-started)
   - [Docker Compose](https://docs.docker.com/compose/install/)

2. **Clonez le dépôt** :
   ```
   git clone https://github.com/yourusername/happihub.git
   cd happihub
   ```

3. **Créez un fichier `.env` dans le répertoire `server` avec le contenu suivant** :
   ```
   PORT=5000
   MONGO_URI=mongodb://mongo:27018/happihub
   ```
4. **Créez un fichier `.env` dans le répertoire `client` avec le contenu suivant** :
   ```
   REACT_APP_API_URL=http://localhost:5000/api

   ```
5. **Utilisez les fichiers `Dockerfile` et `docker-compose.yml` pour construire et démarrer les conteneurs Docker** :
   ```
   docker-compose up --build
   ```

## Installation des Dépendances

1. **Assurez-vous que Node.js et NPM sont installés**.
   - [Node.js](https://nodejs.org/)
   - [NPM](https://www.npmjs.com/)

2. **Installez les dépendances du projet** :
   ```
   npm install
   ```

## Exécution des Tests

1. **Exécutez les tests unitaires** :
   ```
   npm test
   ```

2. **Exécutez les tests d'intégration** :
   ```
   npm run test:integration
   ```

## Règles de Commit

Nous suivons les conventions de commit d'Angular pour garantir des messages de commit clairs et significatifs. Voici comment rédiger vos messages de commit :

### Structure du Message de Commit

```
type(scope): subject

body
```

- **type** : Le type de modification. Les types courants incluent :
  - `feat` : Une nouvelle fonctionnalité.
  - `fix` : Une correction de bug.
  - `docs` : Des modifications de la documentation.
  - `style` : Des modifications de style de code (formatage, etc.).
  - `refactor` : Une refactorisation du code sans changement de fonctionnalité.
  - `test` : L'ajout ou la modification de tests.
  - `chore` : Des tâches diverses (mise à jour de build scripts, configurations, etc.).

- **scope** : La portée de la modification (ex. module ou fichier spécifique).

- **subject** : Une courte description de la modification.

- **body** (facultatif) : Une description plus détaillée des modifications, des raisons et des impacts.

### Exemple de Message de Commit

```
feat(user-auth): add JWT authentication

Added JWT authentication for user login and registration. This ensures
that users are securely authenticated and their sessions are managed
efficiently.
```

## Règles de Nommage des Branches

Pour maintenir une organisation claire et cohérente, suivez ces conventions pour nommer vos branches :

### Conventions de Nommage des Branches

- **feature/nom-de-la-fonctionnalité** : Pour une nouvelle fonctionnalité.
  - Exemple : `feature/user-authentication`

- **fix/nom-du-bug** : Pour une correction de bug.
  - Exemple : `fix/login-issue`

- **chore/nom-de-la-tâche** : Pour des tâches diverses (mise à jour de dépendances, configurations, etc.).
  - Exemple : `chore/update-dependencies`

### Exemples de Branches

- **feature/add-search-functionality**
- **fix/navbar-styling-bug**
- **chore/cleanup-unused-imports**

## Linting et Formatage

1. **Exécutez ESLint pour vérifier le linting** :
   ```
   npm run lint
   ```

2. **Formatage du code avec Prettier** :
   ```
   npm run format
   ```

## Processus de Review des Pull Requests

1. **Créez une Pull Request (PR)** en suivant les instructions.
2. **Les PRs doivent être révisées par au moins un mainteneur avant d'être fusionnées**.
3. **Assurez-vous que toutes les vérifications CI passent avant de demander une review**.

## Communauté et Support

1. **Rejoignez notre communauté sur [Slack/Discord/etc.] pour obtenir de l'aide et discuter**.
2. **Consultez notre documentation [lien vers la documentation] pour plus de détails**.

Merci de votre contribution !