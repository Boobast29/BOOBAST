# Studio du club — 20 intégrations supplémentaires

Ce changement part de la version 35. Les 20 dépôts ci-dessous sont supplémentaires aux bibliothèques déjà présentes. Les extensions FullCalendar ne sont comptées qu’une fois, avec leur dépôt principal.

Ouvrir **Studio du club** dans la barre supérieure ou le menu Outils. Le bureau contient des cartes déplaçables et redimensionnables ; les autres onglets donnent accès aux dossiers, au planning, aux relations du vestiaire, au calcul des échéances et au recadrage d’images. Les boutons, tableaux chiffrés, notifications et contours de focus reçoivent aussi un traitement visuel commun.

| Dépôt | Version | Fonction effectivement branchée | Licence |
|---|---|---|---|
| [lucaong/minisearch](https://github.com/lucaong/minisearch) | 7.2.0 | Recherche des dossiers | MIT |
| [AsyncBanana/microdiff](https://github.com/AsyncBanana/microdiff) | 1.6.0 | Annuler/rétablir dans l’éditeur | MIT |
| [MikeMcl/decimal.js](https://github.com/MikeMcl/decimal.js) | 10.6.0 | Échéances monétaires exactes | MIT |
| [SortableJS/Sortable](https://github.com/SortableJS/Sortable) | 1.15.7 | Ordre des dossiers | MIT |
| [fengyuanchen/cropperjs](https://github.com/fengyuanchen/cropperjs) | 1.6.2 | Recadrage de logo/photo | MIT |
| [KingSora/OverlayScrollbars](https://github.com/KingSora/OverlayScrollbars) | 2.17.0 | Défilement du menu | MIT |
| [nathancahill/split](https://github.com/nathancahill/split) | 1.6.5 | Largeur des panneaux de mail | MIT |
| [timmywil/panzoom](https://github.com/timmywil/panzoom) | 4.6.2 | Zoom de carte des tirs | MIT |
| [cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js) | 3.34.4 | Carte du vestiaire | MIT |
| [graphology/graphology](https://github.com/graphology/graphology) | 0.26.0 | Modèle et degrés des relations | MIT |
| [gridstack/gridstack.js](https://github.com/gridstack/gridstack.js) | 14.0.0 | Bureau déplaçable et redimensionnable | MIT |
| [fullcalendar/fullcalendar](https://github.com/fullcalendar/fullcalendar) | 6.1.22 | Planning mensuel et hebdomadaire | MIT |
| [jkbrzt/rrule](https://github.com/jkbrzt/rrule) | 2.8.1 | Bilans récurrents | BSD-3-Clause |
| [kewisch/ical.js](https://github.com/kewisch/ical.js) | 2.2.1 | Export calendrier iCalendar | MPL-2.0 |
| [ajv-validator/ajv](https://github.com/ajv-validator/ajv) | 8.20.0 | Validation des dossiers JSON | MIT |
| [germanbisurgi/jedison](https://github.com/germanbisurgi/jedison) | 1.31.1 | Formulaire de projet | MIT |
| [dexie/Dexie.js](https://github.com/dexie/Dexie.js) | 4.4.7 | Dossiers locaux par partie | Apache-2.0 |
| [ai/nanoid](https://github.com/ai/nanoid) | 6.0.2 | Identifiants des dossiers | MIT |
| [caroso1222/notyf](https://github.com/caroso1222/notyf) | 3.10.0 | Notifications globales | MIT |
| [focus-trap/focus-trap](https://github.com/focus-trap/focus-trap) | 8.2.4 | Clavier des fenêtres du Studio | MIT |

## Limites explicites

- Les dossiers et budgets de projet servent à préparer une décision : ils ne dépensent pas la trésorerie du moteur. Ils sont stockés séparément, par emplacement de partie, dans IndexedDB ; utiliser Exporter JSON pour les transporter. Les sauvegardes historiques du jeu ne les incluent pas.
- Le planning utilise les dates de semaine du moteur ; il ne prétend pas fournir les horaires officiels. Les bilans récurrents sont des rendez-vous de travail, sans promesse automatique au président.
- Le graphe utilise uniquement les liens et mentorats explicites de la sauvegarde. Un joueur sans lien reste affiché, sans relation inventée.
- Annuler/rétablir concerne les modifications de l’éditeur dans la session courante : 20 actions, 5 Mo maximum. Quitter l’éditeur, changer de semaine ou modifier l’état hors de cet historique l’invalide. Ce n’est pas un retour en arrière d’une simulation.
- Les images sont choisies localement et recadrées ; le logo n’est remplacé qu’avec le bouton prévu et sa confirmation. Ce lot n’ajoute pas un fournisseur de photos ni de nouveaux droits sur des photos de joueurs.
- Aucun nouveau service externe n’est requis pour jouer. Le bundle local ajoute environ 1,6 Mo de JavaScript, plus les styles.

## Construction et provenance

Depuis `manager-foot/tools/integration20` : `npm ci`, puis `npm run build`. Les versions sont verrouillées dans `package-lock.json`. Node/npm sont nécessaires pour reconstruire, pas pour jouer. Ne pas commettre node_modules.

Les licences originales et les notices des dépendances incluses sont dans `vendor/integration20/licenses/`. Le manifeste indique les versions, dépôts, points d’appel et chemins de licences. Les sources préférées non modifiées de ical.js (MPL-2.0) sont fournies dans `vendor/integration20/sources/ical.js/`. La licence OverlayScrollbars est conservée depuis son tag v2.17.0 dans `tools/integration20/extra-licenses/`, car le paquet npm ne l’inclut pas.

## Vérification

`tools/integration20/test.cjs` utilise Playwright (à installer séparément pour les tests). Lancer un serveur HTTP sur le dossier manager-foot, puis définir `MF_URL` si nécessaire et `MF_CHROMIUM` si Chromium n’est pas installé par Playwright. Le rapport `tests/integration20_report.json` est issu d’une exécution réelle : 20 contrôles réussis, aucune erreur JavaScript. Il vérifie notamment les 20 points d’usage, l’export iCalendar reparsé, les centimes des échéances, l’isolation des parties, le recadrage PNG, l’historique de l’éditeur, le mobile et la persistance après rechargement.

Audit complémentaire après 10 semaines simulées : les 28 vues du menu et les fiches sont parcourues sur ordinateur et mobile, sans erreur JavaScript, écran vide ni débordement global (`tests/integration20_ecrans.json`). Le pack SQLite mondial n’étant pas présent dans cet environnement, ces contrôles utilisent la base de démonstration fournie ; ils ne valident pas un import de nouvelles données réelles.

Le chargement du moteur et du Studio a aussi été vérifié hors ligne après installation du service worker, ainsi que directement en file://.
