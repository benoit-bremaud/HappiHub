# HappiHub - La culture, le partage, la communauté

HappiHub est une application web de réseau social pour les événements culturels et communautaires. Notre objectif est de connecter les personnes partageant les mêmes intérêts et de faciliter l'organisation et la participation à des événements.

## Project continuity

Start with [project instructions](AGENTS.md), [handover](docs/HANDOVER.md),
[prioritized work plan](docs/WORK_PLAN.md), and [operational history](PROJECT_LOG.md).
Current implementation contracts are in [API documentation](docs/API_DOCUMENTATION.md).
Further code requires completed UML conception and explicit owner validation.

## Table des Matières
- [Structure du Projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration de l'Environnement](#configuration-de-lenvironnement)
- [Démarrage des Conteneurs Docker](#démarrage-des-conteneurs-docker)
- [Vérification du Bon Fonctionnement](#vérification-du-bon-fonctionnement)
- [Contribution](#contribution)
- [Licence](#licence)
- [Correction des Erreurs Courantes](#correction-des-erreurs-courantes)

## Structure du Projet

Le projet est organisé en plusieurs répertoires :

- `client/` : Contient le code source du frontend React.
- `server/` : Contient le code source du backend Node.js/Express.

## Prérequis

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Installation

1. Clonez le dépôt :

   ```
   git clone https://github.com/benoit-bremaud/happihub.git
   cd happihub
   ```

## Environment configuration

Follow [private configuration instructions](docs/CONFIGURATION.md). Only placeholder templates are tracked; local and deployed environment files are ignored. Existing local files were preserved during credential cleanup.

The client API base URL includes `/api`. Supply signing keys privately and do not reuse tutorial values. Production Compose requires private mounted secret files. Its deployment still requires a separate infrastructure review.

## Docker workflows

Follow [Docker setup and verification](docs/DOCKER.md). The default Compose file is local-only; production uses a separate reviewed baseline. Do not reuse the former shared-volume profiles or interpret a passing local check as production approval.

## Vérification du Bon Fonctionnement

### Backend

Vérifiez que le backend fonctionne en accédant à `http://localhost:5000`.

1. **Utiliser un Navigateur Web** :
   - Ouvrez votre navigateur web.
   - Accédez à `http://localhost:5000/test`.
   - Vous devriez voir la réponse "Hello HappiHub Server!".

2. **Utiliser `curl` (ligne de commande)** :
   - Ouvrez votre terminal.
   - Exécutez la commande suivante :
     ```
     curl http://localhost:5000/test
     ```
   - Vous devriez voir la réponse "Hello HappiHub Server!".

### Frontend

Vérifiez que le frontend fonctionne en accédant à `http://localhost:3000`.

1. **Utiliser un Navigateur Web** :
   - Ouvrez votre navigateur web.
   - Accédez à `http://localhost:3000`.
   - Vous devriez voir la page d'accueil par défaut de l'application React.

2. **Utiliser `curl` (ligne de commande)** :
   - Ouvrez votre terminal.
   - Exécutez la commande suivante :
     ```
     curl http://localhost:3000
     ```
   - Vous devriez voir le code HTML de la page d'accueil par défaut de l'application React.

## Correction des Erreurs Courantes

### Erreur : Ports are not available

Si vous rencontrez l'erreur suivante lors du démarrage des conteneurs Docker :

```
Starting happihub_mongo_1 ... error

ERROR: for happihub_mongo_1  Cannot start service mongo: Ports are not available: exposing port TCP 0.0.0.0:27017 -> 0.0.0.0:0: listen tcp 0.0.0.0:27017: bind: address already in use

ERROR: for happihub_app_1  'ContainerConfig'

ERROR: for mongo  Cannot start service mongo: Ports are not available: exposing port TCP 0.0.0.0:27017 -> 0.0.0.0:0: listen tcp 0.0.0.0:27017: bind: address already in use
```

Cela signifie que le port 27017 est déjà utilisé par un autre processus. Pour résoudre ce problème, vous pouvez suivre les étapes suivantes :

### Linux

1. **Trouver le processus utilisant le port 27017** :
   ```
   sudo lsof -i :27017
   ```

   Exemple de sortie :
   ```
   COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
   mongod  2100 mongodb   11u  IPv4  24553      0t0  TCP localhost:27017 (LISTEN)
   ```

2. **Tuer le processus utilisant le port 27017** :
   ```
   sudo kill -9 2100
   ```

   Remplacez `2100` par le PID trouvé dans la sortie de la commande précédente.

### Windows

1. **Trouver le processus utilisant le port 27017** :
   ```powershell
   Get-NetTCPConnection -LocalPort 27017 | Select-Object -Property State, LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess
   Get-Process -Id (Get-NetTCPConnection -LocalPort 27017).OwningProcess
   ```

   Exemple de sortie :
   ```plaintext
   State        : Listen
   LocalAddress : 0.0.0.0
   LocalPort    : 27017
   RemoteAddress: 0.0.0.0
   RemotePort   : 0
   OwningProcess: 2100
   ```

2. **Tuer le processus utilisant le port 27017** :
   ```powershell
   Stop-Process -Id 2100 -Force
   ```

   Remplacez `2100` par le PID trouvé dans la sortie de la commande précédente.

### Mac

1. **Trouver le processus utilisant le port 27017** :
   ```sh
   lsof -i :27017
   ```

   Exemple de sortie :
   ```plaintext
   COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
   mongod  2100 mongodb   11u  IPv4  24553      0t0  TCP localhost:27017 (LISTEN)
   ```

2. **Tuer le processus utilisant le port 27017** :
   ```sh
   kill -9 2100
   ```

   Remplacez `2100` par le PID trouvé dans la sortie de la commande précédente.

## Contribution

Les contributions sont les bienvenues. Pour commencer :

1. Fork le dépôt.
2. Créez une branche pour votre fonctionnalité ou correction de bug (`git checkout -b feature/fooBar`).
3. Commit vos modifications (`git commit -am 'Add some fooBar'`).
4. Push la branche (`git push origin feature/fooBar`).
5. Créez une nouvelle Pull Request.

Pour plus d'informations, veuillez lire le fichier [CONTRIBUTING](docs/CONTRIBUTING.md).

## Code de Conduite

Nous avons adopté un code de conduite pour notre communauté. Pour en savoir plus, consultez le [Code de Conduite](docs/CODE_OF_CONDUCT.md).

## Sécurité

Pour signaler une vulnérabilité de sécurité, veuillez lire notre [Politique de Sécurité](docs/SECURITY.md).

## Changelog

Pour suivre les modifications, ajouts, corrections de bugs et améliorations apportées au projet HappiHub, consultez le fichier [CHANGELOG.md](./docs/changelog/CHANGELOG.md). Ce fichier documente l'évolution du projet de manière chronologique et structurée, suivant les conventions de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et [Semantic Versioning](https://semver.org/).

Pour des instructions détaillées sur comment, quand et pourquoi mettre à jour le fichier CHANGELOG, veuillez consulter le fichier [CHANGELOG_GUIDE.md](./docs/changelog/CHANGELOG_GUIDE.md).

## Documentation de l'API

Pour une documentation détaillée de l'API de HappiHub, veuillez consulter le fichier [API_DOCUMENTATION](docs/API_DOCUMENTATION.md). Ce document inclut des descriptions des endpoints, des paramètres, et des exemples de requêtes et de réponses.

## Authentication

HappiHub now uses server-managed MongoDB sessions and HttpOnly cookies. Browser bearer
JWT authentication and JWT refresh examples are historical. See the current
[API contract](docs/API_DOCUMENTATION.md), [configuration](docs/CONFIGURATION.md), and
[cookie-session specification](docs/architecture/specs/cookie-sessions.md).


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
