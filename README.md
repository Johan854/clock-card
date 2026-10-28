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

Le bloc « Nuance de couleur » de l'éditeur est identique à celui des autres cartes. L'heure suit le fuseau de Home Assistant.
