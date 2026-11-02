# Recherche de sources ouvertes (novembre 2026)

But : trouver sur GitHub des données et du code réutilisables pour rendre Manager Foot plus réaliste
(données football, transferts, règlements, moteurs de jeux de gestion).

## Ce qui est utilisé dans le jeu

| Source | Licence | Usage dans le jeu |
|---|---|---|
| [openfootball/football.json](https://github.com/openfootball/football.json) | CC0 (domaine public) | Buts par match à domicile et à l'extérieur pour 13 divisions (Angleterre 1-4, Allemagne 1-3, Espagne 1-2, France 1-2, Italie 1-2), saisons 2014/15 → 2025/26 : **calibrage du moteur de match par division** (`CALIB_REEL` dans `js/reglements.js`). |
| [ewenme/transfers](https://github.com/ewenme/transfers) | aucune licence | **Statistiques agrégées seulement** (médianes d'indemnités par championnat, âge et poste, 2015 → 2022). Aucune donnée brute recopiée. Pas encore branché dans l'économie (voir « À faire »). |
| Pages officielles et presse (FFF, LFP, DFB, RFEF, Lega Pro, Serie A…) | — | Règlements 2026/27 : formats, montées, descentes, barrages, play-offs, playouts, départages (`REGLES` dans `js/reglements.js`, sources listées dans l'écran « Règlement »). |

Script de calcul : `outils/calibrage_donnees_ouvertes.py CHEMIN_football.json CHEMIN_transfers/data` (bibliothèque standard Python).

### Chiffres obtenus (buts par match)

| Division | Matchs | Dom. | Ext. | Victoire dom. | Nul |
|---|---|---|---|---|---|
| Premier League | 4 610 | 1,54 | 1,26 | 44 % | 24 % |
| Championship | 5 640 | 1,41 | 1,13 | 43 % | 27 % |
| League One | 3 516 | 1,42 | 1,19 | 43 % | 25 % |
| League Two | 3 476 | 1,36 | 1,14 | 42 % | 27 % |
| Bundesliga | 3 708 | 1,70 | 1,35 | 45 % | 25 % |
| 2. Bundesliga | 3 465 | 1,55 | 1,28 | 43 % | 28 % |
| 3. Liga | 2 660 | 1,45 | 1,18 | 42 % | 28 % |
| LaLiga | 4 619 | 1,50 | 1,13 | 46 % | 26 % |
| Segunda | 3 818 | 1,33 | 0,97 | 45 % | 30 % |
| Ligue 1 | 4 281 | 1,50 | 1,19 | 44 % | 25 % |
| Ligue 2 | 2 982 | 1,34 | 1,07 | 43 % | 29 % |
| Serie A | 4 600 | 1,48 | 1,24 | 42 % | 26 % |
| Serie B | 3 712 | 1,39 | 1,04 | 43 % | 33 % |

Moteur avant / après calibrage (monde fictif, 200 matchs par division) :
- avant : D1 2,62 buts · D2 1,72 buts et 41 % de nuls · D3 1,59 buts et 37 % de nuls (divisions inférieures trop fermées) ;
- après (règlement France) : D1 2,42 · D2 2,29 · D3 2,68 buts, 24 à 27 % de nuls, 42 à 46 % de victoires à domicile.

## Repéré mais non utilisé

| Source | Licence | Pourquoi |
|---|---|---|
| [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) | CC0 | Meilleure base de transferts et de valeurs ouverte. Les fichiers sont hébergés hors de GitHub (stockage R2 et Kaggle), bloqués par le réseau de cette session. **À importer** depuis ton PC (même principe que `Importer_Base.bat`). |
| [hudl/open-data](https://github.com/hudl/open-data) (StatsBomb) | licence non commerciale | Données événement par événement (passes, tirs, pressions) : utile pour calibrer finement le moteur (tirs, xG, passes). Usage personnel seulement. |
| [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | GPL-3.0 | Jeu de gestion open source. Le code GPL ne peut pas être recopié sans passer le jeu en GPL : **idées seulement**. |
| [ZOXEXIVO/open-football](https://github.com/ZOXEXIVO/open-football) | Apache-2.0 | Moteur de simulation en Rust (agents par joueur) : idées pour le moteur de match. |
| [ihofmann/open-websoccer](https://github.com/ihofmann/open-websoccer) | LGPL-3.0 | Jeu en ligne PHP : idées (sponsors, stades, primes). |
| [salimt/football-datasets](https://github.com/salimt/football-datasets) | aucune licence | 93 000 joueurs (Transfermarkt) : non réutilisable sans licence. |

## À faire (pistes issues de la recherche)
1. Importer transfermarkt-datasets (CC0) en local : historique réel des transferts, valeurs de marché par date, clubs de 3e et 4e niveau.
2. Brancher les médianes d'indemnités (par championnat, âge, poste) dans l'IA du mercato.
3. Calibrer tirs, passes et xG du moteur avec StatsBomb open-data (usage personnel).
4. Vérifier les points « à vérifier » de l'écran Règlement (ordre des critères de départage en France, seuils financiers 2026/27).
