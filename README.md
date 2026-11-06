# Clock Card (FR)

Carte Home Assistant « horloge » en **six styles**, en français, style verre, thème clair/sombre automatique, éditeur visuel.

| `style` | Rendu |
|---|---|
| `digital` | Heure en grand, salutation (Bonjour / Bonsoir…), anneau des secondes, ligne soleil et semaine |
| `analog` | Cadran en verre, trotteuse fluide, fenêtre de date |
| `flip` | Chiffres à volets animés |
| `day` | Heure + arc du soleil / de la lune, lever, coucher, durée du jour ou de la nuit |
| `words` | « Il est huit heures et quart », mots éclairés |
| `minimal` | Chiffres fins, barre de progression de la journée |

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → `https://github.com/Johan854/clock-card`, catégorie **Tableau de bord**. Puis recharger le navigateur.

## Exemple
```yaml
type: custom:clock-card
style: digital
hour12: false
show_seconds: true
```

## Options
| Option | Défaut | Description |
|---|---|---|
| `style` | `digital` | `digital`, `analog`, `flip`, `day`, `words`, `minimal` |
| `theme` | `auto` | `auto`, `light`, `dark` |
| `hour12` | `false` | Format 12 h (AM / PM) |
| `show_seconds` | `true` | Afficher les secondes |
| `show_date` | `true` | Afficher la date |
| `show_greeting` | `true` | Salutation (style `digital`) |
| `show_info` | `true` | Ligne d'infos soleil / semaine (`digital`, `flip`) |
| `sun_entity` | `sun.sun` | Entité du soleil (`digital`, `flip`, `day`) |
| `calendars` | — | Calendriers dont les prochains événements s'affichent sous l'horloge (tous les styles) |
| `events_count` | `3` | Nombre d'événements par calendrier |
| `events_days` | `60` | Jusqu'à combien de jours chercher |
| `events_title` | `À venir` | Titre du bloc (vide = pas de titre) |

Le bloc « Nuance de couleur » de l'éditeur est identique à celui des autres cartes. L'heure suit le fuseau de Home Assistant.

## Prochains événements : anniversaires, ramassage des ordures… (v1.1.0)

Sous l'horloge, un bloc « À venir » liste les prochains événements de vos calendriers Home Assistant (Google, CalDAV, calendrier local, collecte des déchets…), triés du plus proche au plus lointain : « Aujourd'hui », « Demain », « Dans 3 jours », puis la date.

```yaml
calendars:
  - calendar.anniversaires
  - entity: calendar.collecte_des_dechets
    count: 2          # nombre d'événements pour ce calendrier
    icon: "🗑️"        # facultatif
    name: Poubelles   # facultatif
  - entity: calendar.anniversaires
    period: month     # seulement les événements du mois en cours (tous)
events_count: 3
events_days: 60
```

Avec `period: month`, le calendrier n'affiche que ses événements du mois en cours, d'aujourd'hui à la fin du mois (tous, sauf si `count` est précisé) ; le mois suivant, la liste se renouvelle d'elle-même.

L'icône est devinée d'après le titre : 🎂 anniversaire, ♻️ tri / poubelle jaune, 🍾 verre, 🌿 déchets verts, 🛋️ encombrants, 🗑️ ordures, 📅 sinon. Les calendriers sont relus toutes les 15 minutes, à chaque changement et à minuit.
