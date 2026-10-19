# CHANGELOG - HappiHub

Ce fichier suit toutes les modifications, ajouts, corrections de bugs et améliorations apportées au projet HappiHub.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/).

## [Unreleased]

The following recovery changes are local to fix/security-boundaries and have not been
released or deployed. See [PROJECT_LOG.md](../../PROJECT_LOG.md) for the operational
history and [handover](../HANDOVER.md) for the current state.

### Added

- Server-managed HttpOnly cookie sessions, CSRF-protected writes and server logout.
- Session conception, explicit runtime configuration, isolated local/production container
  workflows and disposable real-database regression coverage.
- Prioritized work plan, operational journal and portable contributor/agent handover.
- Brick B event lifecycle API on PostgreSQL (UC15–UC20): drafts with a per-association
  creation quota, optimistic editing with field-level merge and conflict answers,
  publication guard, cancellation, draft deletion, a minimal public read, association-closure
  and account export effects, and maintenance archiving/draft cleanup. Legacy event routes
  are removed.

### Changed

- Current account/role authority, event visibility and ownership boundaries are enforced
  server-side. Public responses exclude relationship identifiers.
- Client event/comment/profile flows follow the actual API contracts.
- Dependency manifests and compatible security patches were consolidated.
- Browser bearer JWT authentication was replaced by cookie sessions. Existing users must
  sign in again; integrations need the documented cookie/CSRF flow until external API
  authorization is designed. This is an authentication contract change.

### Fixed

- Password-verification bypass, public administrator signup, caller-controlled authorship,
  private-event/comment exposure and sensitive response/logging paths addressed locally.
- Session revocation, password-change invalidation and guarded local configuration.

### Removed

- Tracked environment credentials and unsafe literal examples from the current source tree.
  Earlier Git history was not rewritten and deployed credentials were not certified/rotated.
- Unused runtime declarations and legacy JWT implementation dependencies.

### Historical unreleased notes

These original notes are retained for history; JWT descriptions below predate the current
session migration and do not define today's authentication contract.

#### Ajouté
- Initialisation du projet avec la configuration de Docker et Docker Compose.
- Création de la base de données MongoDB.
- Mise en place du modèle utilisateur.
- Implémentation des routes d'inscription et de connexion des utilisateurs.
- Mise en place de l'authentification avec JWT.

#### Modifié
- Mise à jour de README.md pour inclure les informations sur la configuration et l'utilisation de l'application.
- Mise à jour de SECURITY.md pour ajouter les informations de contact.
- Mise à jour de GUIDE.md avec des directives supplémentaires.

#### Corrigé
- Correction des erreurs de configuration dans Dockerfile et docker-compose.yml.
- Correction des erreurs de dépendances manquantes.

## [0.1.0] - 2024-07-01

Legacy version label retained. No matching GitHub release or remote tag was found in the
2026-10-12 history check; publication of this version is not verified.

### Ajouté
- Création initiale du projet HappiHub.
- Configuration initiale de Docker et Docker Compose.
- Création des modèles de base de données.

## Ressources Utiles

- [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
- [Semantic Versioning](https://semver.org/)
