# Gestion des Tokens JWT dans HappiHub

## Table des Matières

- [Introduction à JWT](#introduction-à-jwt)
  - [Qu'est-ce qu'un JWT ?](#quest-ce-quun-jwt)
  - [Pourquoi utiliser JWT dans HappiHub ?](#pourquoi-utiliser-jwt-dans-happihub)
- [Génération de Tokens JWT](#génération-de-tokens-jwt)
  - [Processus de Génération](#processus-de-génération)
  - [Description du Code](#description-du-code)
  - [Exemple de Code](#exemple-de-code)
  - [Autres Exemples Possibles](#autres-exemples-possibles)
- [Liste des Claims Possibles](#liste-des-claims-possibles)
  - [Claims Obligatoires (Mandatory)](#claims-obligatoires-mandatory)
  - [Claims Recommandés (Recommended)](#claims-recommandés-recommended)
  - [Claims Optionnels (Optional)](#claims-optionnels-optional)
  - [Exemple d'Utilisation des Claims](#exemple-dutilisation-des-claims)
- [Validation de Tokens JWT](#validation-de-tokens-jwt)
  - [Comment Valider un Token JWT](#comment-valider-un-token-jwt)
  - [Description du Code](#description-du-code-1)
  - [Exemple de Code](#exemple-de-code-1)
  - [Autres Exemples Possibles](#autres-exemples-possibles-1)
- [Rafraîchissement des Tokens JWT](#rafraîchissement-des-tokens-jwt)
  - [Pourquoi et Quand Rafraîchir un Token ?](#pourquoi-et-quand-rafraîchir-un-token)
  - [Processus de Rafraîchissement](#processus-de-rafraîchissement)
  - [Description du Code](#description-du-code-2)
  - [Exemple de Code](#exemple-de-code-2)
  - [Autres Exemples Possibles](#autres-exemples-possibles-2)
- [Utilisation de JWT à travers des Middlewares](#utilisation-de-jwt-à-travers-des-middlewares)
  - [Pourquoi Utiliser des Middlewares ?](#pourquoi-utiliser-des-middlewares)
  - [Middleware d'Authentification](#middleware-dauthentification)
  - [Description du Code](#description-du-code-3)
  - [Exemple d'Utilisation du Middleware](#exemple-dutilisation-du-middleware)
  - [Autres Exemples Possibles](#autres-exemples-possibles-3)
- [Bonnes Pratiques de Sécurité](#bonnes-pratiques-de-sécurité)
  - [Stockage Sécurisé des Tokens](#stockage-sécurisé-des-tokens)
  - [Rotation des Clés](#rotation-des-clés)
  - [Gestion des Tokens Expirés](#gestion-des-tokens-expirés)
- [Exemples de Code](#exemples-de-code)
  - [Exemple Complet](#exemple-complet)

## Introduction à JWT

### Qu'est-ce qu'un JWT ?

JSON Web Token (JWT) est un standard ouvert (RFC 7519) qui permet l'échange sécurisé de données entre parties sous forme d'un objet JSON. Chaque JWT est constitué de trois parties :
1. **Header (En-tête)** : Contient le type de token (JWT) et l'algorithme de signature utilisé (par exemple, HMAC SHA256 ou RSA).
2. **Payload (Charge utile)** : Contient les revendications. Les revendications sont des déclarations sur une entité (généralement, l'utilisateur) et des métadonnées supplémentaires.
3. **Signature (Signature)** : Assure que le token n'a pas été modifié. Elle est créée en prenant le header, le payload, un secret, et en appliquant l'algorithme spécifié dans le header.

Un JWT ressemble à ceci :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Pourquoi utiliser JWT dans HappiHub ?

- **Sécurité** : JWT permet de vérifier l'authenticité des informations transmises et d'assurer que les données n'ont pas été altérées.
- **Simplicité** : Les tokens JWT sont auto-contenus, ils transportent toutes les informations nécessaires, ce qui simplifie l'authentification.
- **Scalabilité** : Les tokens JWT sont idéaux pour des applications distribuées et les microservices car ils ne nécessitent pas de stockage côté serveur.

## Génération de Tokens JWT

### Processus de Génération

Pour générer un token JWT, nous utilisons une clé secrète pour signer le token. Voici un exemple de code utilisant Node.js et le module `jsonwebtoken`.

```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
    };
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: '1h', // Le token expire dans 1 heure
    };

    return jwt.sign(payload, secret, options);
}
```

### Description du Code

- **Importation du module `jsonwebtoken`** :
  ```javascript
  const jwt = require('jsonwebtoken');
  ```
  Cette ligne importe le module `jsonwebtoken` qui permet de créer et de vérifier des tokens JWT.

- **Définition de la fonction `generateToken`** :
  ```javascript
  function generateToken(user) {
  ```
  Cette fonction prend un objet `user` en paramètre et génère un token JWT basé sur cet utilisateur.

- **Création du `payload`** :
  ```javascript
  const payload = {
      id: user.id,
      email: user.email,
  };
  ```
  Le `payload` contient les informations que nous voulons inclure dans le token. Ici, il s'agit de l'ID et de l'email de l'utilisateur.

- **Définition de la clé secrète** :
  ```javascript
  const secret = process.env.JWT_SECRET;
  ```
  La clé secrète utilisée pour signer le token est récupérée depuis les variables d'environnement. Assurez-vous que cette clé est stockée de manière sécurisée.

- **Options de configuration du token** :
  ```javascript
  const options = {
      expiresIn: '1h', // Le token expire dans 1 heure
  };
  ```
  Ces options définissent la durée de vie du token. Ici, le token expire dans 1 heure.

- **Génération du token** :
  ```javascript
  return jwt.sign(payload, secret, options);
  ```
  Cette ligne signe le `payload` avec la clé secrète et les options spécifiées, puis retourne le token JWT.

### Exemple de Code

```javascript
const user = { id: '12345', email: 'user@example.com' };
const token = generateToken(user);
console.log('Generated JWT:', token);
```
Dans cet exemple, nous créons un objet utilisateur avec un `id` et un `email`, puis nous générons un token JWT pour cet utilisateur et l'affichons dans la console.

### Autres Exemples Possibles

1. **Génération de Tokens avec des Rôles Utilisateur** :

```javascript
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role, // Ajout du rôle de l'utilisateur
    };
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: '2h', // Le token expire dans 2 heures
    };

    return jwt.sign(payload, secret, options);
}

const user = { id: '67890', email: 'admin@example.com', role: 'admin' };
const token = generateToken(user);
console.log('Generated JWT with role:', token);
```

2. **Génération de Tokens avec des Claims Additionnels** :

```javascript
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        permissions: user.permissions, // Ajout des permissions de l'utilisateur
        issuer: 'HappiHub', // Ajout de l'émetteur du token
    };
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: '3h', // Le token expire dans 3 heures
    };

    return jwt.sign(payload, secret, options);
}

const user = { id: '54321', email: 'user@example.com', permissions: ['read', 'write'] };
const token = generateToken(user);
console.log('Generated JWT with additional claims:', token);
```

3. **Génération de Tokens avec une Durée de Vie Personnalisée** :

```javascript
function generateToken(user, expiresIn) {
    const payload = {
        id: user.id,
        email: user.email,
    };
    const secret = process.env.JWT_SECRET;
    const options = {
        expiresIn: expiresIn || '1h', // Utilisation d'une durée de vie personnalisée ou par défaut à 1 heure
    };

    return jwt.sign(payload, secret, options);
}

const user = { id: '11223', email: 'user2@example.com' };
const token = generateToken(user, '6h');
console.log('Generated JWT with custom expiry:', token);
```

## Liste des Claims Possibles

### Claims Obligatoires (Mandatory)

- **iss (Issuer)** : Identifie l'émetteur du JWT.
- **sub (Subject)** : Identifie le sujet du JWT. Utilisé pour identifier l'utilisateur ou l'entité.
- **aud (Audience)** : Identifie les destinataires pour lesquels le JWT est destiné.
- **exp (Expiration Time)** : Définit le temps après lequel le JWT n'est plus valide. Utilisé pour limiter la durée de vie du token.
- **nbf (Not Before)** : Définit le temps avant lequel le JWT ne doit pas être accepté pour traitement.
- **iat (Issued At)** : Indique l'heure à laquelle le JWT a été émis.

### Claims Recommandés (Recommended)

- **jti (JWT ID)** : Identifiant unique pour le JWT, utilisé pour prévenir les rejets de tokens.
- **auth_time** : Indique l'heure à laquelle l'authentification de l'utilisateur a eu lieu.
- **nonce** : Une valeur aléatoire utilisée pour prévenir les attaques de relecture.

### Claims Optionnels (Optional)

- **name** : Nom de l'utilisateur.
- **email** : Adresse email de l'utilisateur.
- **picture** : URL de la photo de profil de l'utilisateur.
- **role** : Rôle de l'utilisateur (par exemple, `admin`, `user`).
- **permissions** : Liste des permissions de l'utilisateur (par exemple, `['read', 'write']`).
- **locale** : Langue de l'utilisateur.
- **preferred_username** : Nom d'utilisateur préféré.

### Exemple d'Utilisation des Claims

Voici un exemple de génération de token JWT avec des claims obligatoires, recommandés et optionnels :

```javascript
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        iss: 'HappiHub',
        sub: 'userAuthentication',
        aud: 'happihubClient',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expire dans 1 heure
        iat: Math.floor(Date.now() / 1000),
        jti: 'uniqueIdentifier123'
    };
    const secret = process.env.JWT_SECRET;
    const options = {};

    return jwt.sign(payload, secret, options);
}

const user = {
    id: '67890',
    email: 'admin@example.com',
    name: 'John Doe',
    role: 'admin',
    permissions: ['read', 'write', 'delete']
};

const token = generateToken(user);
console.log('Generated JWT with various claims:', token);
```

## Validation de Tokens JWT

### Comment Valider un Token JWT

Pour valider un token JWT, nous devons vérifier sa signature et s'assurer qu'il n'est pas expiré. Voici un exemple de code.

```javascript
function validateToken(token) {
    const secret = process.env.JWT_SECRET;
    
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}
```

### Description du Code

- **Définition de la fonction `validateToken`** :
  ```javascript
  function validateToken(token) {
  ```
  Cette fonction prend un `token` en paramètre et retourne le contenu décodé du token s'il est valide.

- **Définition de la clé secrète** :
  ```javascript
  const secret = process.env.JWT_SECRET;
  ```
  La clé secrète utilisée pour vérifier la signature du token est récupérée depuis les variables d'environnement.

- **Bloc `try...catch` pour la validation** :
  ```javascript
  try {
      const decoded = jwt.verify(token, secret);
      return decoded;
  } catch (err) {
      console.error('Invalid token:', err);
      return null;
  }
  ```
  - **`try`** : Tente de vérifier le token en utilisant la méthode `jwt.verify` du module `jsonwebtoken`. Si le token est valide, il retourne le contenu décodé du token.
  - **`catch`** : Si la vérification échoue (par exemple, si le token est invalide ou expiré), capture l'erreur, affiche un message d'erreur et retourne `null`.

### Exemple de Code

```javascript
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const decodedToken = validateToken(token);
if (decodedToken) {
    console.log('Token is valid:', decodedToken);
} else {
    console.log('Token is invalid');
}
```
Dans cet exemple, nous remplaçons `token` par un token JWT réel, validons le token et affichons le contenu décodé s'il est valide, ou un message d'erreur s'il est invalide.

### Autres Exemples Possibles

1. **Validation de Tokens avec Expiration Personnalisée** :

```javascript
function validateTokenWithExpiration(token, maxAge) {
    const secret = process.env.JWT_SECRET;
    
    try {
        const decoded = jwt.verify(token, secret);
        const currentTime = Math.floor(Date.now() / 1000);

        if (decoded.exp < currentTime || (decoded.iat + maxAge) < currentTime) {
            console.error('Token is expired');
            return null;
        }
        return decoded;
    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}

const maxAge = 3600; // 1 heure en secondes
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const decodedToken = validateTokenWithExpiration(token, maxAge);
if (decodedToken) {
    console.log('Token is valid with custom expiration:', decodedToken);
} else {
    console.log('Token is invalid or expired');
}
```

2. **Validation de Tokens avec Rôles Utilisateur** :

```javascript
function validateTokenWithRole(token, requiredRole) {
    const secret = process.env.JWT_SECRET;
    
    try {
        const decoded = jwt.verify(token, secret);
        
        if (decoded.role !== requiredRole) {
            console.error('Invalid role');
            return null;
        }
        return decoded;
    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}

const requiredRole = 'admin';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const decodedToken = validateTokenWithRole(token, requiredRole);
if (decodedToken) {
    console.log('Token is valid with role:', decodedToken);
} else {
    console.log('Token is invalid or role mismatch');
}
```

3. **Validation de Tokens avec Claims Spécifiques** :

```javascript
function validateTokenWithClaims(token, claims) {
    const secret = process.env.JWT_SECRET;
    
    try {
        const decoded = jwt.verify(token, secret);

        for (let key in claims) {
            if (decoded[key] !== claims[key]) {
                console.error(`Invalid claim: ${key}`);
                return null;
            }
        }
        return decoded;
    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}

const claims = { role: 'admin', permissions: ['read', 'write'] };
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const decodedToken = validateTokenWithClaims(token, claims);
if (decodedToken) {
    console.log('Token is valid with claims:', decodedToken);
} else {
    console.log('Token is invalid or claims mismatch');
}
```

## Rafraîchissement des Tokens JWT

### Pourquoi et Quand Rafraîchir un Token ?

Les tokens JWT ont une durée de vie limitée pour des raisons de sécurité. Un token expiré ne peut plus être utilisé pour accéder aux ressources protégées. Il est donc nécessaire de rafraîchir le token avant qu'il n'expire pour maintenir la session de l'utilisateur active. Le rafraîchissement des tokens permet de prolonger la durée de vie de la session de l'utilisateur sans exiger une nouvelle authentification complète.

### Processus de Rafraîchissement

Voici comment rafraîchir un token avant qu'il n'expire.

```javascript
function refreshToken(token) {
    const decoded = validateToken(token);
    if (decoded) {
        return generateToken(decoded);
    }
    return null;
}
```

### Description du Code

- **Définition de la fonction `refreshToken`** :
  ```javascript
  function refreshToken(token) {
  ```
  Cette fonction prend un `token` en paramètre et retourne un nouveau token JWT s'il est valide.

- **Décodage du token existant** :
  ```javascript
  const decoded = validateToken(token);
  ```
  La fonction `validateToken` est utilisée pour vérifier la validité du token existant et retourner son contenu décodé. Si le token est invalide, `decoded` sera `null`.

- **Génération d'un nouveau token** :
  ```javascript
  if (decoded) {
      return generateToken(decoded);
  }
  ```
  Si le token est valide, nous générons un nouveau token en utilisant les informations décodées du token existant.

- **Retourner `null` si le token est invalide** :
  ```javascript
  return null;
  ```
  Si le token n'est pas valide, la fonction retourne `null`.

### Exemple de Code

```javascript
const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const newToken = refreshToken(oldToken);
if (newToken) {
    console.log('Token refreshed:', newToken);
} else {
    console.log('Failed to refresh token');
}
```
Dans cet exemple, nous remplaçons `oldToken` par un token JWT réel, tentons de le rafraîchir, et affichons le nouveau token s'il est rafraîchi avec succès, ou un message d'erreur s'il échoue.

### Autres Exemples Possibles

1. **Rafraîchissement avec Contrôle de Durée de Vie Restante** :

```javascript
function refreshTokenWithCheck(token) {
    const decoded = validateToken(token);
    if (decoded) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = decoded.exp - currentTime;
        const minTimeLeft = 60 * 15; // Rafraîchir si le temps restant est inférieur à 15 minutes

        if (timeLeft < minTimeLeft) {
            return generateToken(decoded);
        } else {
            console.log('Token still has sufficient time left');
            return token;
        }
    }
    return null;
}

const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const newToken = refreshTokenWithCheck(oldToken);
if (newToken) {
    console.log('Token refreshed or still valid:', newToken);
} else {
    console.log('Failed to refresh token');
}
```

2. **Rafraîchissement avec Informations Utilisateur Mises à Jour** :

```javascript
function refreshTokenWithUpdatedInfo(token, updatedUser) {
    const decoded = validateToken(token);
    if (decoded) {
        // Mettre à jour les informations utilisateur dans le payload
        decoded.email = updatedUser.email || decoded.email;
        decoded.role = updatedUser.role || decoded.role;

        return generateToken(decoded);
    }
    return null;
}

const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const updatedUser = { email: 'newemail@example.com', role: 'admin' };
const newToken = refreshTokenWithUpdatedInfo(oldToken, updatedUser);
if (newToken) {
    console.log('Token refreshed with updated info:', newToken);
} else {
    console.log('Failed to refresh token');
}
```

3. **Rafraîchissement avec Notification de Rafraîchissement** :

```javascript
function refreshTokenWithNotification(token) {
    const decoded = validateToken(token);
    if (decoded) {
        const newToken = generateToken(decoded);
        if (newToken) {
            console.log('Token has been refreshed for user:', decoded.email);
            return newToken;
        }
    }
    return null;
}

const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Remplacer par un token réel
const newToken = refreshTokenWithNotification(oldToken);
if (newToken) {
    console.log('Token refreshed:', newToken);
} else {
    console.log('Failed to refresh token');
}
```

## Utilisation de JWT à travers des Middlewares

### Pourquoi Utiliser des Middlewares ?

Les middlewares permettent de gérer l'authentification et l'autorisation de manière centralisée, simplifiant ainsi la logique de sécurité et améliorant la maintenabilité du code. En utilisant des middlewares, vous pouvez appliquer des règles d'authentification et d'autorisation à toutes les requêtes ou à certaines routes spécifiques de manière uniforme et efficace.

### Middleware d'Authentification

Ce middleware vérifie la présence d'un token JWT dans les en-têtes des requêtes et valide ce token.

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Si aucun token, retournez 401

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Si le token est invalide, retournez 403
        req.user = user;
        next(); // Passez au middleware ou route suivant
    });
}
```

### Description du Code

- **Importation du module `jsonwebtoken`** :
  ```javascript
  const jwt = require('jsonwebtoken');
  ```
  Cette ligne importe le module `jsonwebtoken` qui permet de vérifier les tokens JWT.

- **Définition de la fonction `authenticateToken`** :
  ```javascript
  function authenticateToken(req, res, next) {
  ```
  Cette fonction est un middleware qui prend les objets `req`, `res` et `next` en paramètres.

- **Extraction du token JWT de l'en-tête `Authorization`** :
  ```javascript
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  ```
  Cette partie du code vérifie la présence de l'en-tête `Authorization` et extrait le token en supprimant le mot "Bearer" qui le précède.

- **Vérification de la présence du token** :
  ```javascript
  if (token == null) return res.sendStatus(401); // Si aucun token, retournez 401
  ```
  Si aucun token n'est présent, la requête est rejetée avec un statut HTTP 401 (Unauthorized).

- **Validation du token** :
  ```javascript
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403); // Si le token est invalide, retournez 403
      req.user = user;
      next(); // Passez au middleware ou route suivant
  });
  ```
  La méthode `jwt.verify` vérifie la validité du token en utilisant la clé secrète. Si le token est invalide, la requête est rejetée avec un statut HTTP 403 (Forbidden). Si le token est valide, l'objet `user` décodé est attaché à l'objet `req` et le contrôle est passé au middleware ou à la route suivante.

### Exemple d'Utilisation du Middleware

Appliquez le middleware à des routes spécifiques pour protéger ces routes.

```javascript
const express = require('express');
const app = express();

app.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected route');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
```
Dans cet exemple, nous utilisons Express.js pour créer un serveur et appliquons le middleware `authenticateToken` à la route `/protected`. Toute requête à cette route doit inclure un token JWT valide dans l'en-tête `Authorization`.

### Autres Exemples Possibles

1. **Middleware d'Authentification avec Rôle Utilisateur** :

Ce middleware vérifie non seulement la validité du token, mais également le rôle de l'utilisateur pour s'assurer qu'il a les permissions appropriées pour accéder à la route.

```javascript
function authenticateTokenWithRole(role) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return res.sendStatus(401); // Si aucun token, retournez 401

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403); // Si le token est invalide, retournez 403
            if (user.role !== role) return res.sendStatus(403); // Si le rôle ne correspond pas, retournez 403
            req.user = user;
            next(); // Passez au middleware ou route suivant
        });
    };
}

app.get('/admin', authenticateTokenWithRole('admin'), (req, res) => {
    res.send('This is an admin route');
});
```

2. **Middleware d'Authentification avec Journaling** :

Ce middleware enregistre chaque tentative de connexion pour des fins de journalisation et d'audit.

```javascript
const fs = require('fs');

function authenticateTokenWithLogging(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        fs.appendFileSync('access.log', `Unauthorized access attempt on ${new Date().toISOString()}\n`);
        return res.sendStatus(401); // Si aucun token, retournez 401
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            fs.appendFileSync('access.log', `Forbidden access attempt on ${new Date().toISOString()}: ${err.message}\n`);
            return res.sendStatus(403); // Si le token est invalide, retournez 403
        }
        req.user = user;
        next(); // Passez au middleware ou route suivant
    });
}

app.get('/protected', authenticateTokenWithLogging, (req, res) => {
    res.send('This is a protected route');
});
```

3. **Middleware d'Authentification avec Rafraîchissement de Token** :

Ce middleware vérifie la validité du token et rafraîchit le token si sa durée de vie est proche de l'expiration.

```javascript
function authenticateAndRefreshToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Si aucun token, retournez 401

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Si le token est invalide, retournez 403

        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExpiry = user.exp;

        // Rafraîchir le token si moins de 15 minutes restantes
        if (tokenExpiry - currentTime < 900) {
            const newToken = generateToken(user);
            res.setHeader('Authorization', `Bearer ${newToken}`);
        }

        req.user = user;
        next(); // Passez au middleware ou route suivant
    });
}

app.get('/protected', authenticateAndRefreshToken, (req, res) => {
    res.send('This is a protected route with token refresh');
});
```

## Bonnes Pratiques de Sécurité

### Stockage Sécurisé des Tokens

Ne jamais stocker des tokens JWT dans le stockage local ou les cookies sans sécurisation. Utilisez `httpOnly` et `secure` pour les cookies.

- **Stockage sécurisé dans les cookies** :
  - `httpOnly` : Empêche l'accès au cookie via JavaScript, réduisant ainsi les risques d'attaque par script intersite (XSS).
  - `secure` : Assure que le cookie est envoyé uniquement sur des connexions HTTPS.

  Exemple d'utilisation de cookies sécurisés en Express.js :
  ```javascript
  res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Utilisez le flag secure en production
      maxAge: 3600000 // 1 heure
  });
  ```

### Rotation des Clés

Changez régulièrement les clés secrètes pour minimiser les risques en cas de fuite. La rotation des clés permet de sécuriser les tokens même si une clé secrète précédente a été compromise.

- **Gestion de la rotation des clés** :
  - Utilisez un tableau de clés où la clé actuelle est utilisée pour signer les nouveaux tokens et les clés précédentes sont encore valides pour vérifier les anciens tokens jusqu'à leur expiration.
  - Exemple :
  ```javascript
  const secrets = [process.env.JWT_SECRET, process.env.OLD_JWT_SECRET];
  const currentSecret = secrets[0];

  function generateToken(user) {
      const payload = { id: user.id, email: user.email };
      return jwt.sign(payload, currentSecret, { expiresIn: '1h' });
  }

  function validateToken(token) {
      for (let secret of secrets) {
          try {
              return jwt.verify(token, secret);
          } catch (err) {
              // Continue to the next secret
          }
      }
      return null; // Si aucun secret ne fonctionne, le token est invalide
  }
  ```

### Gestion des Tokens Expirés

Invalider les tokens expirés et forcer les utilisateurs à se reconnecter. Implémenter une liste de révocation pour gérer les tokens invalidés.

- **Liste de révocation** :
  - Utilisez une base de données ou un cache pour stocker les tokens révoqués et vérifiez cette liste lors de la validation du token.
  - Exemple :
  ```javascript
  const revokedTokens = new Set(); // Peut être remplacé par une base de données

  function revokeToken(token) {
      revokedTokens.add(token);
  }

  function isTokenRevoked(token) {
      return revokedTokens.has(token);
  }

  function validateToken(token) {
      if (isTokenRevoked(token)) {
          return null;
      }
      try {
          return jwt.verify(token, currentSecret);
      } catch (err) {
          return null;
      }
  }
  ```

## Exemples de Code

Voici des exemples pratiques de génération, validation et rafraîchissement de tokens JWT dans HappiHub.

### Exemple Complet

```javascript
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();

const secret = process.env.JWT_SECRET;

// Génération de Token
function generateToken(user) {
    const payload = { id: user.id, email: user.email };
    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

// Validation de Token
function validateToken(token) {
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
}

// Rafraîchissement de Token
function refreshToken(token) {
    const decoded = validateToken(token);
    return decoded ? generateToken(decoded) : null;
}

// Exemples d'utilisation
const user = { id: '12345', email: 'user@example.com' };
const token = generateToken(user);
console.log('Generated JWT:', token);

const decodedToken = validateToken(token);
if (decodedToken) {
    console.log('Token is valid:', decodedToken);
} else {
    console.log('Token is invalid');
}

const newToken = refreshToken(token);
if (newToken) {
    console.log('Token refreshed:', newToken);
} else {
    console.log('Failed to refresh token');
}

// Middleware d'Authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Si aucun token, retournez 401

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.sendStatus(403); // Si le token est invalide, retournez 403
        req.user = user;
        next(); // Passez au middleware ou route suivant
    });
}

// Exemple d'utilisation du middleware
app.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected route');
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
```
