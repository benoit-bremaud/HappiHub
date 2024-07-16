# API Documentation - HappiHub

## Introduction

Cette documentation fournit des informations détaillées sur l'API de HappiHub, y compris les descriptions des endpoints, les paramètres, et des exemples de requêtes et de réponses. L'API de HappiHub permet aux développeurs d'interagir avec les fonctionnalités de la plateforme, telles que l'inscription des utilisateurs, la gestion des événements, et bien plus encore.

## Table des Matières

- [Introduction](#introduction)
- [Authentification](#authentification)
  - [Inscription](#inscription)
  - [Connexion](#connexion)
  - [Déconnexion](#déconnexion)
  - [Récupérer le rôle de l'utilisateur](#récupérer-le-rôle-de-l'utilisateur)
- [Utilisateurs](#utilisateurs)
  - [Récupérer les informations utilisateur](#récupérer-les-informations-utilisateur)
  - [Mettre à jour les informations utilisateur](#mettre-à-jour-les-informations-utilisateur)
- [Événements](#événements)
  - [Créer un événement](#créer-un-événement)
  - [Récupérer les événements](#récupérer-les-événements)
- [Commentaires](#commentaires)
  - [Ajouter un commentaire](#ajouter-un-commentaire)
  - [Modifier un commentaire](#modifier-un-commentaire)
  - [Supprimer un commentaire](#supprimer-un-commentaire)
  - [Récupérer les commentaires](#récupérer-les-commentaires)
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

### Récupérer le rôle de l'utilisateur

- **Endpoint:** `/api/users/role`
- **Méthode HTTP:** `GET`
- **Description:** Permet à un utilisateur authentifié de récupérer son rôle actuel sur la plateforme HappiHub.
- **Paramètres:** Aucuns
- **Exemple de Requête:**

```http
GET /api/users/role
```

- **Exemple de Réponse:**

```json
{
  "role": "Visitor"
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

### Mettre à jour les informations utilisateur

- **Endpoint:** `/api/users/profile`
- **Méthode HTTP:** `PUT`
- **Description:** Permet à un utilisateur authentifié de mettre à jour les informations de son profil.
- **Paramètres:**
  - `name` (string) - Nom de l'utilisateur
  - `email` (string) - Email de l'utilisateur
  - `password` (string) - Mot de passe de l'utilisateur
  - `rank` (string) - Rang de l'utilisateur
- **Exemple de Requête:**

```json
{
  "name": "Jane Doe",
  "email": "janedoe@example.com",
  "password": "newpassword123",
  "rank": "Friend"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Profil mis à jour avec succès",
  "user": {
    "id": "60b8d2956b2e2c001b8f4a8a",
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "rank": "Friend"
  }
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
  "date": "2024-08-15T18:00:00Z",
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
    "date": "2024-08-15T18:00:00Z",
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
    "date": "2024-08-15T18:00:00Z",
    "location": "Parc Central"
  },
  {
    "id": "60b8d2956b2e2c001b8f4a8c",
    "title": "Atelier de Peinture",
    "description": "Un atelier de peinture pour les débutants.",
    "date": "2024-08-20T10:00:00Z",
    "location": "Centre Culturel"
  }
]
```

## Commentaires

### Ajouter un commentaire

- **Endpoint:** `/api/events/:eventId/comments`
- **Méthode HTTP:** `POST`
- **Description:** Permet à un utilisateur d'ajouter un commentaire à un événement spécifique.
- **Paramètres:**
  - `content` (string) - Contenu du commentaire
- **Exemple de Requête:**

```json
{
  "content": "Super événement, j'ai adoré !"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Commentaire ajouté avec succès",
  "comment": {


    "id": "60b8d2956b2e2c001b8f4a8d",
    "eventId": "60b8d2956b2e2c001b8f4a8b",
    "userId": "60b8d2956b2e2c001b8f4a8a",
    "content": "Super événement, j'ai adoré !"
  }
}
```

### Modifier un commentaire

- **Endpoint:** `/api/events/:eventId/comments/:commentId`
- **Méthode HTTP:** `PUT`
- **Description:** Permet à un utilisateur de modifier un commentaire existant sur un événement spécifique.
- **Paramètres:**
  - `content` (string) - Nouveau contenu du commentaire
- **Exemple de Requête:**

```json
{
  "content": "Événement fantastique, vraiment bien organisé !"
}
```

- **Exemple de Réponse:**

```json
{
  "message": "Commentaire modifié avec succès",
  "comment": {
    "id": "60b8d2956b2e2c001b8f4a8d",
    "eventId": "60b8d2956b2e2c001b8f4a8b",
    "userId": "60b8d2956b2e2c001b8f4a8a",
    "content": "Événement fantastique, vraiment bien organisé !"
  }
}
```

### Supprimer un commentaire

- **Endpoint:** `/api/events/:eventId/comments/:commentId`
- **Méthode HTTP:** `DELETE`
- **Description:** Permet à un utilisateur de supprimer un commentaire existant sur un événement spécifique.
- **Paramètres:** Aucuns
- **Exemple de Requête:**

```http
DELETE /api/events/60b8d2956b2e2c001b8f4a8b/comments/60b8d2956b2e2c001b8f4a8d
```

- **Exemple de Réponse:**

```json
{
  "message": "Commentaire supprimé avec succès"
}
```

### Récupérer les commentaires

- **Endpoint:** `/api/events/:eventId/comments`
- **Méthode HTTP:** `GET`
- **Description:** Permet à un utilisateur de récupérer la liste des commentaires pour un événement spécifique.
- **Paramètres:** Aucuns
- **Exemple de Requête:**

```http
GET /api/events/60b8d2956b2e2c001b8f4a8b/comments
```

- **Exemple de Réponse:**

```json
[
  {
    "id": "60b8d2956b2e2c001b8f4a8d",
    "eventId": "60b8d2956b2e2c001b8f4a8b",
    "userId": "60b8d2956b2e2c001b8f4a8a",
    "content": "Super événement, j'ai adoré !"
  },
  {
    "id": "60b8d2956b2e2c001b8f4a8e",
    "eventId": "60b8d2956b2e2c001b8f4a8b",
    "userId": "60b8d2956b2e2c001b8f4a8a",
    "content": "Vraiment une belle expérience, merci aux organisateurs !"
  }
]
```

## Diagrammes UML Référents

- **Diagramme de Séquence** : Pour visualiser le flux des opérations et l'interaction avec les endpoints.