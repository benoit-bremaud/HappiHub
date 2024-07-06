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

## Structure du Projet

Le projet est organisé en plusieurs répertoires :

- `client/` : Contient le code source du frontend React.
- `server/` : Contient le code source du backend Node.js/Express.

## Prérequis

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Installation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/yourusername/happihub.git
   cd happihub
   ```

## Configuration de l'Environnement

1. Créez un fichier `.env` dans le répertoire `server` avec le contenu suivant :

   ```env
   PORT=5000
   MONGO_URI=mongodb://mongo:27018/happihub
   ```

2. Utilisez les fichiers `Dockerfile` et `docker-compose.yml` fournis pour construire et démarrer les conteneurs Docker :

   ```bash
   docker-compose up --build
   ```

## Vérification du Bon Fonctionnement

1. **Backend** : Vérifiez que le backend fonctionne en accédant à `http://localhost:5000`.
2. **Frontend** : Vérifiez que le frontend fonctionne en accédant à `http://localhost:3000`.
3. **MongoDB** : Vérifiez que MongoDB fonctionne en utilisant un client comme MongoDB Compass avec l'URI `mongodb://localhost:27018`.

## Contribution

Les contributions sont les bienvenues. Pour commencer :

1. Fork le dépôt.
2. Créez une branche pour votre fonctionnalité ou correction de bug (`git checkout -b feature/fooBar`).
3. Commit vos modifications (`git commit -am 'Add some fooBar'`).
4. Push la branche (`git push origin feature/fooBar`).
5. Créez une nouvelle Pull Request.

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.