# HappiHub - La culture, le partage, la communauté

HappiHub est une application web de réseau social pour les événements culturels et communautaires. Notre objectif est de connecter les personnes partageant les mêmes intérêts et de faciliter l'organisation et la participation à des événements.

## Table des Matières
- [Structure du Projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration de l'Environnement](#configuration-de-lenvironnement)
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

## Configuration de l'Environnement

Avant de démarrer le projet, assurez-vous de configurer correctement les variables d'environnement pour le backend et le frontend.

### Backend

1. Allez dans le répertoire `server/`.

2. Copiez le fichier `.env.example` et renommez-le en `.env` :
   ```
   cp server/.env.example server/.env
   ```
3. Ouvrez le fichier `.env` et configurez les variables d'environnement selon vos besoins.

   Voici un exemple :
   ```
   MONGO_URI=mongodb://mongo:27017/happihub
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

### Frontend

1. Allez dans le répertoire `client/`.

2. Copiez le fichier `.env.example` et renommez-le en `.env` :
   ```
   cp client/.env.example client/.env
   ```
3. Ouvrez le fichier `.env` et configurez les variables d'environnement selon vos besoins.
   
   Voici un exemple :
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

Assurez-vous que les valeurs des variables d'environnement correspondent à la configuration de votre environnement de développement.

## Démarrage des Conteneurs Docker

Utilisez les fichiers `Dockerfile` et `docker-compose.yml` fournis pour construire et démarrer les conteneurs Docker :

   ```
   docker-compose up --build
   ```

### Nettoyage Complet de Docker

Pour nettoyer tous les éléments liés à Docker sur Linux, Windows et macOS, suivez les étapes ci-dessous. Cela inclut la suppression des conteneurs, des images, des volumes et des réseaux Docker inutilisés.

#### Linux (Ubuntu)

1. **Arrêter tous les conteneurs en cours d'exécution :**
   ```bash
   docker stop $(docker ps -q)
   ```
2. **Supprimer tous les conteneurs :**
   ```bash
   docker rm $(docker ps -a -q)
   ```
3. **Supprimer toutes les images :**
   ```bash
   docker rmi $(docker images -q)
   ```
4. **Supprimer tous les volumes non utilisés :**
   ```bash
   docker volume prune -f
   ```
5. **Supprimer tous les réseaux non utilisés :**
   ```bash
   docker network prune -f
   ```
6. **Supprimer toutes les données restantes de Docker :**
   ```bash
   sudo rm -rf /var/lib/docker
   sudo rm -rf /var/lib/containerd
   ```

#### Windows

1. **Arrêter tous les conteneurs en cours d'exécution :**
   ```powershell
   docker stop $(docker ps -q)
   ```
2. **Supprimer tous les conteneurs :**
   ```powershell
   docker rm $(docker ps -a -q)
   ```
3. **Supprimer toutes les images :**
   ```powershell
   docker rmi $(docker images -q)
   ```
4. **Supprimer tous les volumes non utilisés :**
   ```powershell
   docker volume prune -f
   ```
5. **Supprimer tous les réseaux non utilisés :**
   ```powershell
   docker network prune -f
   ```
6. **Supprimer toutes les données restantes de Docker :**
   ```powershell
   Remove-Item -Recurse -Force C:\ProgramData\Docker
   Remove-Item -Recurse -Force C:\ProgramData\DockerDesktop
   ```

#### macOS

1. **Arrêter tous les conteneurs en cours d'exécution :**
   ```bash
   docker stop $(docker ps -q)
   ```
2. **Supprimer tous les conteneurs :**
   ```bash
   docker rm $(docker ps -a -q)
   ```
3. **Supprimer toutes les images :**
   ```bash
   docker rmi $(docker images -q)
   ```
4. **Supprimer tous les volumes non utilisés :**
   ```bash
   docker volume prune -f
   ```
5. **Supprimer tous les réseaux non utilisés :**
   ```bash
   docker network prune -f
   ```
6. **Supprimer toutes les données restantes de Docker :**
   ```bash
   sudo rm -rf /var/lib/docker
   sudo rm -rf /var/lib/containerd
   ```

**Raisons du nettoyage :**

- **Récupération d'espace disque :** Les conteneurs, images et volumes Docker peuvent consommer beaucoup d'espace disque. Les supprimer libère cet espace.
- **Maintien de la performance :** Un grand nombre de conteneurs, images et volumes inutilisés peut ralentir les opérations Docker.
- **Gestion de la sécurité :** La suppression des conteneurs et images obsolètes réduit les risques de sécurité liés à des versions vulnérables.
- **Prévention des conflits :** Des conteneurs et images obsolètes peuvent causer des conflits lors de la création de nouveaux conteneurs.

## Vérification du Bon Fonctionnement

### Backend

Vérifiez que le backend fonctionne en accédant à `http://localhost:5000`.

1. **Utiliser un Navigateur Web** :
   - Ouvrez votre navigateur web.
   - Accédez à `http://localhost:5000`.
   - Vous devriez voir la réponse "Hello HappiHub Server!".

2. **Utiliser `curl` (ligne de commande)** :
   - Ouvrez votre terminal.
   - Exécutez la commande suivante :
     ```
     curl http://localhost:5000
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

3. **Utiliser Postman** :
   - Ouvrez Postman.
   - Créez une nouvelle requête GET à l'URL `http://localhost:3000`.
   - Envoyez la requête.
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

## start manualy server

npm start 

## start manualy client

npm run start