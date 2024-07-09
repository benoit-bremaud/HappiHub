# Guide d'Utilisation du CHANGELOG - HappiHub

Ce document explique comment, quand et pourquoi mettre à jour le fichier CHANGELOG.md pour le projet HappiHub.

## Quand Mettre à Jour le CHANGELOG

- **Avant chaque commit important** : Avant de pousser des modifications significatives dans le dépôt.
- **Avant une nouvelle release** : Avant de créer une nouvelle version du projet.
- **Après la résolution d'un bug** : Pour documenter les corrections de bugs importantes.

## Comment Mettre à Jour le CHANGELOG

1. **Ajouter une nouvelle entrée dans la section [Unreleased]** :
   - Utilisez les catégories `Ajouté`, `Modifié`, `Corrigé`, et `Supprimé`.
   - Soyez clair et concis dans la description des modifications.

2. **Déplacer les entrées vers une nouvelle section versionnée** :
   - Lorsqu'une nouvelle version est prête, créez une nouvelle section avec le numéro de version et la date.
   - Déplacez les entrées de la section `[Unreleased]` vers cette nouvelle section.

## Exemple de Mise à Jour

```markdown
## [Unreleased]
### Ajouté
- Nouvelle fonctionnalité de partage d'événements sur les réseaux sociaux.

## [1.0.0] - 2024-08-01
### Ajouté
- Nouvelle fonctionnalité de partage d'événements sur les réseaux sociaux.

## [0.2.0] - 2024-07-15
### Modifié
- Amélioration de la performance de la base de données.
