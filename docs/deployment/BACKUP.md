# Sauvegarde et restauration (TPRE601)

Scripts dans `infra/scripts/`.

## Backup

```bash
./infra/scripts/backup.sh
# ou chemin explicite :
./infra/scripts/backup.sh backups/mon-backup-manuel
```

Contenu d'une sauvegarde :

| Fichier | Description |
|---------|-------------|
| `app-postgres.sql` | Dump PostgreSQL Django (social, auth) |
| `airflow-postgres.sql` | Dump métadonnées Airflow (si démarré) |
| `mongo.archive.gz` | Archive MongoDB (plans IA) |
| `mspr_etl.db` | Base SQLite ETL (données patients, KPIs) |
| `media/` | Avatars et médias des publications |
| `manifest.txt` | Horodatage et checksums |

## Restore

```bash
./infra/scripts/restore.sh backups/20260623-120000
```

Arrête la stack, recharge les bases et volumes, puis relance `docker compose up -d`.

**Note :** l’ETL one-shot s’exécute au redémarrage puis la base SQLite du backup **écrase** le fichier régénéré (données ETL d’origine conservées).

## Reset (remise à zéro)

```bash
./infra/scripts/reset.sh --yes
```

Supprime **tous les volumes** du projet Compose et relance une stack vide (ETL régénère SQLite).

## Vérification automatisée

```bash
bash infra/monitoring/scripts/verify-backup.sh   # backup + cold start
bash infra/monitoring/scripts/verify-restore.sh  # backup → restore → intégrité
```
