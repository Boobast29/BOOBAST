# Audit des clubs et des blasons — 3 novembre 2026

Le mode fictif contient des clubs inventés et des blasons dessinés par le jeu. Les chiffres ci-dessous concernent seulement les cinq pays du pack **monde réel** embarqué.

| Pays | Clubs | Noms corrigés par le fichier de référence | Blasons dans l'archive locale | Logos par URL uniquement |
| --- | ---: | ---: | ---: | ---: |
| Angleterre | 68 | 68 | 20 | 48 |
| France | 53 | 45 | 18 | 35 |
| Allemagne | 56 | 47 | 18 | 38 |
| Italie | 96 | 77 | 20 | 76 |
| Espagne | 82 | 77 | 20 | 62 |
| **Total** | **355** | **314** | **96** | **259** |

Les **355 clubs ont un nom non vide et distinct**, un identifiant distinct et une URL HTTPS de logo. Le fichier `packs/noms-reels-fmscout.json` corrige 314 noms provenant des données source. Les 41 autres conservent le nom du pack. Les 96 fichiers WebP présents dans l'archive FMB concernent les clubs de première division ; les 259 autres clubs ne disposent pas d'un blason local dans ce dépôt. L'interface affiche un blason de remplacement si une URL externe ne répond pas.

Ce contrôle est **structurel** : il ne confirme pas que les 355 URL sont encore accessibles, que chaque image représente le bon club, ni que les divisions et effectifs de l'instantané FM26 correspondent à la saison 2026/27. Les clubs promus et relégués doivent être rapprochés des listes officielles de chaque championnat avant d'annoncer une base à jour. Les droits de réutilisation des images ne sont pas établis par cet audit.

**Écart confirmé sur les divisions :** le pack place encore Burnley, West Ham et Wolverhampton en Premier League et Coventry, Hull et Ipswich en deuxième division. La [Premier League officielle](https://www.premierleague.com/en/news/4365156) indique l'inverse pour 2026/27. La [liste officielle de LaLiga](https://www.laliga.com/en-US/laliga-easports/clubs) inclut également Málaga, Racing et Deportivo, alors que le pack conserve Girona, Mallorca et Oviedo en première division. Les noms de clubs existent bien dans la base, mais les affectations des divisions sont celles de l'instantané source et doivent être actualisées séparément.

Relancer le contrôle après un changement de pack :

```bash
python outils/audit_clubs.py
```
