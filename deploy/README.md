# Fachberater – Docker Deployment

## Voraussetzungen

- Docker und Docker Compose installiert
- `config/settings.json` im Projekt-Root vorhanden (siehe `config/settings.json.example`)

## Starten

```bash
cd /pfad/zum/projekt
docker compose -f deploy/docker-compose.yml up --build -d
```

Die App ist unter **http://localhost:3000** erreichbar.

## Stoppen

```bash
docker compose -f deploy/docker-compose.yml down
```

## Daten löschen

```bash
docker compose -f deploy/docker-compose.yml down -v
```

## Konfiguration

Die Datei `config/settings.json` wird read-only in den App-Container gemountet.
Für Docker muss die MongoDB-URL auf den Container-Namen zeigen:

```json
{
    "database": {
        "url": "mongodb://admin:password@fachberater-mongodb:27017/fachberater?authSource=admin"
    }
}
```

> **Hinweis:** Ohne `config/settings.json` nutzt die App den Default: `mongodb://admin:password@localhost:27017/fachberater?authSource=admin`. Im Docker-Netzwerk muss stattdessen der Service-Name `fachberater-mongodb` als Host verwendet werden.
