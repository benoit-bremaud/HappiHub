# GUIDE - HappiHub

## Introduction

Bienvenue dans le guide général du projet HappiHub. Ce document fournit des directives supplémentaires et des informations spécifiques pour vous aider à contribuer efficacement au projet et à utiliser ses fonctionnalités avancées.

## Table des Matières

1. [Prérequis](#prérequis)
2. [Installation et Configuration](#installation-et-configuration)
3. [Bonnes Pratiques de Développement](#bonnes-pratiques-de-développement)
4. [Fonctionnalités Avancées](#fonctionnalités-avancées)
5. [Conseils et Astuces](#conseils-et-astuces)
6. [Ressources Utiles](#ressources-utiles)

## Prérequis

Avant de commencer, assurez-vous d'avoir les outils suivants installés sur votre machine :

- Git
- Node.js
- Docker et Docker Compose

## Installation et Configuration

Pour installer et configurer HappiHub, suivez les étapes détaillées dans le [README](../README.md). Assurez-vous de configurer correctement les fichiers `.env` pour le frontend et le backend.

## Bonnes Pratiques de Développement

### Respectez les Conventions de Nommage

- **Branches** : Utilisez des noms de branches descriptifs, par exemple `feature/ajout-inscription-utilisateur`.
- **Commits** : Suivez la convention des commits Angular. Exemples : `feat: ajouter la fonctionnalité d'inscription` ou `fix: corriger le bug d'affichage`.

### Code Review

- Assurez-vous que chaque pull request est revue par au moins un autre développeur.
- Utilisez les commentaires pour expliquer le pourquoi des changements, pas seulement le quoi.

### Tests

- Écrivez des tests unitaires et d'intégration pour chaque nouvelle fonctionnalité.
- Utilisez Jest pour les tests unitaires et Cypress pour les tests end-to-end.

## Fonctionnalités Avancées

### Utilisation des Webhooks

Les webhooks peuvent être configurés pour intégrer HappiHub avec d'autres services comme Slack ou Discord pour les notifications. Consultez la documentation de l'API de GitHub pour plus d'informations sur la configuration des webhooks.

### Authentification avec JWT

HappiHub utilise JSON Web Tokens (JWT) pour l'authentification. Assurez-vous de stocker les tokens de manière sécurisée et de les inclure dans les en-têtes des requêtes pour les routes protégées.

## Conseils et Astuces

### Utilisation de Docker

- Utilisez des volumes Docker pour persister les données de la base de données MongoDB.
- Redémarrez les conteneurs avec `docker-compose down && docker-compose up --build` après des modifications majeures de configuration.

### Débogage

- Utilisez les outils de débogage intégrés de votre IDE (comme Visual Studio Code) pour déboguer le backend Node.js.
- Pour le frontend React, utilisez les extensions de débogage du navigateur comme React Developer Tools.

## Ressources Utiles

- [Documentation de Docker](https://docs.docker.com/)
- [Documentation de Node.js](https://nodejs.org/en/docs/)
- [Documentation de React](https://reactjs.org/docs/getting-started.html)
- [Documentation de MongoDB](https://docs.mongodb.com/)
- [Documentation de GitHub](https://docs.github.com/en)

---

Merci de votre contribution à HappiHub ! Si vous avez des questions supplémentaires, n'hésitez pas à ouvrir une issue ou à nous contacter à [contact@happihub.com](mailto:contact@happihub.com).

HappiHub Team