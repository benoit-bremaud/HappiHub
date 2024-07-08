# API Documentation - HappiHub

## Introduction

Cette documentation fournit des informations détaillées sur l'API de HappiHub, y compris les descriptions des endpoints, les paramètres, et des exemples de requêtes et de réponses. L'API de HappiHub permet aux développeurs d'interagir avec les fonctionnalités de la plateforme, telles que l'inscription des utilisateurs, la gestion des événements, et bien plus encore.

## Table des Matières

- [Introduction](#introduction)
- [Authentification](#authentification)
  - [Inscription](#inscription)
  - [Connexion](#connexion)
  - [Déconnexion](#déconnexion)
- [Utilisateurs](#utilisateurs)
  - [Récupérer les informations utilisateur](#récupérer-les-informations-utilisateur)
- [Événements](#événements)
  - [Créer un événement](#créer-un-événement)
  - [Récupérer les événements](#récupérer-les-événements)
- [Diagrammes UML Référents](#diagrammes-uml-référents)

## Authentification

### Inscription

- **Endpoint:** `/api/users/signup`
- **Méthode HTTP:** `POST`
- **Description:** Permet à un visiteur de s'inscrire sur la plateforme HappiHub.
- **Paramètres:**
  - `name` (string) - Nom de l'utilisateur
  - `email` (string) - Email de l'utilisateur
  - `password` (string) - Mot de passe de l'utilisateur
- **Exemple de Requête:**

```json
{
  "name": "John Doe",
  "email": "johndoe@example.com",
  "password": "password123"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "60b8d2956b2e2c001b8f4a8a",
    "name": "John Doe",
    "email": "johndoe@example.com"
  }
}
```

### Connexion

- **Endpoint:** `/api/users/login`
- **Méthode HTTP:** `POST`
- **Description:** Permet à un utilisateur de se connecter à la plateforme HappiHub.
- **Paramètres:**
  - `email` (string) - Email de l'utilisateur
  - `password` (string) - Mot de passe de l'utilisateur
- **Exemple de Requête:**

```json
{
  "email": "johndoe@example.com",
  "password": "password123"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Déconnexion

- **Endpoint:** `/api/users/logout`
- **Méthode HTTP:** `POST`
- **Description:** Permet à un utilisateur de se déconnecter de la plateforme HappiHub.
- **Paramètres:** Aucuns
- **Exemple de Requête:**

```json
{}
```

- **Exemple de Réponse:**

```json
{
  "message": "Déconnexion réussie"
}
```

## Utilisateurs

### Récupérer les informations utilisateur

- **Endpoint:** `/api/users/:id`
- **Méthode HTTP:** `GET`
- **Description:** Récupère les informations d'un utilisateur spécifique.
- **Paramètres:**
  - `id` (string) - ID de l'utilisateur
- **Exemple de Requête:**

```http
GET /api/users/60b8d2956b2e2c001b8f4a8a
```

- **Exemple de Réponse:**

```json
{
  "id": "60b8d2956b2e2c001b8f4a8a",
  "name": "John Doe",
  "email": "johndoe@example.com"
}
```

## Événements

### Créer un événement

- **Endpoint:** `/api/events`
- **Méthode HTTP:** `POST`
- **Description:** Permet à un utilisateur de créer un nouvel événement.
- **Paramètres:**
  - `title` (string) - Titre de l'événement
  - `description` (string) - Description de l'événement
  - `date` (string) - Date de l'événement
  - `location` (string) - Lieu de l'événement
- **Exemple de Requête:**

```json
{
  "title": "Concert de Rock",
  "description": "Un concert de rock en plein air.",
  "date": "2023-08-15T18:00:00Z",
  "location": "Parc Central"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Événement créé avec succès",
  "event": {
    "id": "60b8d2956b2e2c001b8f4a8b",
    "title": "Concert de Rock",
    "description": "Un concert de rock en plein air.",
    "date": "2023-08-15T18:00:00Z",
    "location": "Parc Central"
  }
}
```

### Récupérer les événements

- **Endpoint:** `/api/events`
- **Méthode HTTP:** `GET`
- **Description:** Récupère la liste des événements.
- **Paramètres:** Aucuns
- **Exemple de Requête:**

```http
GET /api/events
```

- **Exemple de Réponse:**

```json
[
  {
    "id": "60b8d2956b2e2c001b8f4a8b",
    "title": "Concert de Rock",
    "description": "Un concert de rock en plein air.",
    "date": "2023-08-15T18:00:00Z",
    "location": "Parc Central"
  },
  {
    "id": "60b8d2956b2e2c001b8f4a8c",
    "title": "Atelier de Peinture",
    "description": "Un atelier de peinture pour les débutants.",
    "date": "2023-08-20T10:00:00Z",
    "location": "Centre Culturel"
  }
]
```

## Diagrammes UML Référents

- **Diagramme de Séquence** : Pour visualiser le flux des opérations et l'interaction avec les endpoints.