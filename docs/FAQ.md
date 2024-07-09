# FAQ - HappiHub

## Installation et Configuration

### Comment puis-je installer HappiHub ?

Pour installer HappiHub, suivez les étapes suivantes :

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/benoit-bremaud/happihub.git
   cd happihub
   ```

2. Configurez les variables d'environnement :
   - Backend : Copiez le fichier `.env.example` dans `server/` et renommez-le en `.env`. Modifiez les valeurs selon vos besoins.
   - Frontend : Copiez le fichier `.env.example` dans `client/` et renommez-le en `.env`. Modifiez les valeurs selon vos besoins.

3. Démarrez les conteneurs Docker :
   ```bash
   docker-compose up --build
   ```

### Quels sont les prérequis pour installer HappiHub ?

Vous aurez besoin de Docker et Docker Compose installés sur votre machine. Vous pouvez les télécharger et les installer depuis les liens suivants :
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Comment configurer les variables d'environnement ?

Les variables d'environnement sont configurées dans les fichiers `.env` situés dans les répertoires `server/` et `client/`. Voici un exemple de configuration pour le backend :
```plaintext
MONGO_URI=mongodb://localhost:27017/happihub
JWT_SECRET=your_jwt_secret
PORT=5000
```
Et pour le frontend :
```plaintext
REACT_APP_API_URL=http://localhost:5000/api
```

## Utilisation de l'Application

### Comment puis-je accéder à l'application HappiHub ?

Une fois les conteneurs Docker démarrés, vous pouvez accéder à l'application frontend à l'adresse suivante :
```plaintext
http://localhost:3000
```
Et à l'API backend à l'adresse suivante :
```plaintext
http://localhost:5000
```

### Comment m'inscrire et me connecter sur HappiHub ?

1. Accédez à la page d'accueil de HappiHub.
2. Cliquez sur "S'inscrire" et remplissez le formulaire d'inscription.
3. Après l'inscription, vous pouvez vous connecter en utilisant vos identifiants.

### Quels sont les rôles et privilèges des utilisateurs sur HappiHub ?

Les rôles et privilèges des utilisateurs sont basés sur un thème cosmopolite. Voici les différents rôles :
- **Visiteur** : Peut consulter les événements publics.
- **Utilisateur** : Peut créer et participer à des événements après inscription et connexion.
- **Membre Actif** : Utilisateur avec des privilèges supplémentaires, tels que la création d'événements récurrents.
- **Hubbers** : Membres de la communauté très actifs et reconnus.

## Contribution au Projet

### Comment puis-je contribuer à HappiHub ?

Les contributions sont les bienvenues. Pour commencer :

1. Fork le dépôt.
2. Créez une branche pour votre fonctionnalité ou correction de bug (`git checkout -b feature/fooBar`).
3. Committez vos modifications (`git commit -am 'Add some fooBar'`).
4. Push la branche (`git push origin feature/fooBar`).
5. Créez une nouvelle Pull Request.

### Où puis-je trouver le guide de contribution ?

Le guide de contribution se trouve dans le fichier [CONTRIBUTING](./CONTRIBUTING.md).

### Comment signaler une vulnérabilité de sécurité ?

Pour signaler une vulnérabilité de sécurité, veuillez lire notre [Politique de Sécurité](./SECURITY.md).

## Questions Diverses

### Où puis-je trouver la documentation complète de l'API ?

La documentation complète de l'API est disponible dans le fichier [API_DOCUMENTATION](./docs/API/API_DOCUMENTATION.md).

### Comment puis-je obtenir de l'aide si j'ai des questions supplémentaires ?

Si vous avez des questions supplémentaires, vous pouvez nous contacter à l'adresse email suivante : [contact@happihub.com](mailto:contact@happihub.com) ou ouvrir une issue sur GitHub.

---

HappiHub Team