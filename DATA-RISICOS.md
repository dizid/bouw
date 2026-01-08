# Data Risico's

## Hoog Risico
- **Geen automatische backups** - Supabase Free tier heeft GEEN backups
- **Foto upload kan mislukken** - Bij storing halverwege: sommige foto's wel, andere niet

## Medium Risico
- **Geen offline mode** - Slechte verbinding op bouwplaats = data kwijt
- **Handmatige export** - CSV export moet je zelf onthouden te doen

## Opgelost
- ~~Sessies permanent verwijderd~~ - Nu soft delete (data blijft in database)
