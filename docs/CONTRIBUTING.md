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
- [Règles de Nommage des Pull Requests](#règles-de-nommage-des-pull-requests)
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
   WDS_SOCKET_HOST=127.0.0.1 
   CHOKIDAR_USEPOLLING=true
   WATCHPACK_POLLING=true
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
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

- **type** : Le type de modification. Les types courants incluent :
  - `feat` : Une nouvelle fonctionnalité.
  - `fix` : Une correction de bug.
  - `docs` : Des modifications de la documentation.
  - `style` : Des modifications de style de code (formatage, etc.).
  - `refactor` : Une refactorisation du code sans changement de fonctionnalité.
  - `perf` : Des améliorations de performance.
  - `test` : L'ajout ou la modification de tests.
  - `build` : Des modifications liées aux scripts de build, aux dépendances ou à l'intégration continue.
  - `ci` : Des modifications liées à la configuration de l'intégration continue.
  - `chore` : Des tâches diverses (mise à jour de dépendances, configurations, etc.).
  - `revert` : Pour annuler des commits précédents.
  - `merge` : Pour les commits liés à la fusion de branches.

- **scope** : La portée de la modification (ex. module ou fichier spécifique).

- **subject** : Une courte description de la modification. Utilisez l'impératif (ex : "add", "fix", "update").

- **body** (facultatif) : Une description plus détaillée des modifications, des raisons et des impacts. Expliquez le "quoi" et le "pourquoi" plutôt que le "comment". Emballez le texte à 72 caractères.

- **footer** (facultatif) : Utilisé principalement pour référencer des issues ou indiquer des changements majeurs. Utilisez des mots-clés pour référencer des issues : `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`. Exemple : `Closes #42`.

### Exemple de Message de Commit

```
feat(auth): add JWT authentication

Added JWT authentication for user login and registration. This ensures
that users are securely authenticated and their sessions are managed
efficiently.

Closes #42
```

## Règles de Nommage des Branches

Pour maintenir une organisation claire et cohérente, suivez ces conventions pour nommer vos branches :

### Conventions de Nommage des Branches

**Format:**
```
<type>/<name>/<issue_ID>
```

**Types de Branches:**
1. **feature:** Pour ajouter de nouvelles fonctionnalités.
2. **bugfix:** Pour corriger des bugs.
3. **hotfix:** Pour des corrections de bugs critiques qui doivent être traitées immédiatement.
4. **chore:** Pour les tâches de maintenance, le nettoyage de code ou les modifications non fonctionnelles.
5. **experiment:** Pour les fonctionnalités expérimentales ou les tests.
6. **refactor:** Pour la refactorisation du code et les améliorations sans changement de fonctionnalité.
7. **docs:** Pour les mises à jour de la documentation.
8. **style:** Pour les modifications liées au style de code, au formatage et au linting.
9. **test:** Pour ajouter ou mettre à jour des tests.
10. **build:** Pour les modifications liées aux scripts de build, aux dépendances ou à l'intégration continue.
11. **ci:** Pour les modifications liées à la configuration de l'intégration continue.
12. **perf:** Pour les améliorations de performance.
13. **revert:** Pour annuler des commits précédents.
14. **merge:** Pour les branches créées afin de résoudre des conflits lors des fusions.

### Exemple de Nommage de Branche

```
feature/add-user-authentication
```

## Règles de Nommage des Pull Requests

### Conventions de Nommage des Pull Requests

**Titre:**
```
[type]: [description brève]
```

**Description:**
```markdown
### Résumé
[Donnez un résumé bref des modifications. Expliquez le but et le résultat attendu.]

### Problèmes Connexes
- Closes #[issue-number]
- Fixes #[issue-number]
- Resolves #[issue-number]

### Modifications Apportées
[Listez toutes les modifications significatives apportées dans cette PR.]

### Type de Modification
- [ ] feat (nouvelle fonctionnalité)
- [ ] fix (correction de bug)
- [ ] docs (mise à jour de la documentation)
- [ ] style (formatage, points-virgules manquants, etc. ; pas de changement de code)
- [ ] refactor (refactorisation de code, pas de changement fonctionnel)
- [ ] perf (améliorations de performance)
- [ ] test (ajout de tests manquants, refactorisation de tests ; pas de changement de code de production)
- [ ] build (modifications du système de build, configuration CI, etc.)
- [ ] ci (modifications de la configuration de l'intégration continue)
- [ ] chore (mise à jour des tâches diverses ; pas de changement de code de production)
- [ ] revert (annulation d'un commit précédent)
- [ ] merge (fusion de branches)

### Checklist
- [ ] Mon code suit les directives de style de

 ce projet
- [ ] J'ai effectué une auto-revue de mon propre code
- [ ] J'ai commenté mon code, en particulier dans les zones difficiles à comprendre
- [ ] J'ai apporté les modifications correspondantes à la documentation
- [ ] Mes modifications ne génèrent aucun nouvel avertissement
- [ ] J'ai ajouté des tests qui prouvent que ma correction est efficace ou que ma fonctionnalité fonctionne
- [ ] Les tests unitaires nouveaux et existants passent localement avec mes modifications
- [ ] Toutes les modifications dépendantes ont été fusionnées et publiées dans les modules en aval

### Captures d'Écran (si applicable)
[Incluez des captures d'écran des modifications si la PR inclut des mises à jour de l'interface utilisateur.]

### Notes Additionnelles
[Incluez toute information supplémentaire ou contexte nécessaire pour les réviseurs.]

### Changements Majeurs
[Si des changements majeurs sont apportés, expliquez ce qu'ils sont, pourquoi ils sont nécessaires et quel impact ils peuvent avoir.]

### Pied de page
- **Mots-clés pour Références aux Issues:**
  - GitHub prend en charge certains mots-clés qui peuvent être utilisés dans les descriptions de PR pour fermer automatiquement les issues lorsque la PR est fusionnée dans la branche par défaut (généralement `main` ou `master`).
  - Les mots-clés courants incluent `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, et `resolved`.
  - Lorsqu'un de ces mots-clés est suivi d'un numéro d'issue, GitHub fermera automatiquement l'issue une fois la PR fusionnée.
  - **Exemple:** `Closes #42`
- **Référencer des Commits et des Branches:**
  - Vous pouvez également référencer des commits et des branches spécifiques dans la description de la PR.
  - **Exemple:** `Includes commit 12345abc` ou `Merges branch feature/add-new-feature`
```

---

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
