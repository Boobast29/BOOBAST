# Bibliothèques tierces (copies)

Toutes copiées sans modification depuis le registre npm (versions publiées officielles), avec leur licence d'origine.

| Dossier | Projet | Version | Licence | Usage dans le jeu |
|---|---|---|---|---|
| `canvas-confetti/` | [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | 1.9.4 | ISC | confettis (titres, montées, trophées, qualifications) |
| `uplot/` | [leeoniya/uPlot](https://github.com/leeoniya/uPlot) | 1.6.32 | MIT | graphiques (trésorerie, position au classement, notes de match) |
| `fuse/` | [krisk/Fuse](https://github.com/krisk/Fuse) | 7.5.0 | Apache-2.0 | recherche tolérante aux fautes dans la palette Ctrl+K |
| `fflate/` | [101arrowz/fflate](https://github.com/101arrowz/fflate) | 0.8.3 | MIT | export/import de partie compressé (.mfz) |
| `zzfx/` | [KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX) | 1.4.0 | MIT | effets sonores synthétisés (but, sifflet, trophée) |
| `driver/` | [nilbuild/driver.js](https://github.com/nilbuild/driver.js) | 1.10.2 | MIT | visite guidée du jeu |
| `html-to-image/` | [bubkoo/html-to-image](https://github.com/bubkoo/html-to-image) | 1.11.13 | MIT | export en image (chronique, classement, bilan) |
| `jspdf/` | [parallax/jsPDF](https://github.com/parallax/jsPDF) | 4.2.1 | MIT | bilan de carrière en PDF |
| `tablesort/` | [tristen/tablesort](https://github.com/tristen/tablesort) | 5.7.1 | MIT | tri des tableaux en cliquant sur les en-têtes |
| `countup/` | [inorganik/countUp.js](https://github.com/inorganik/countUp.js) | 2.10.1 | MIT | chiffres animés (budget de l'en-tête) |
| `simple-statistics/` | [simple-statistics/simple-statistics](https://github.com/simple-statistics/simple-statistics) | 8.0.0 | ISC | tendances (régression linéaire, moyennes, écarts) dans l'Analyse |
| `floating-ui/` | [floating-ui/floating-ui](https://github.com/floating-ui/floating-ui) | core/dom 1.8.0, utils 0.2.12 | MIT | infobulles positionnées (attributs, notes, boutons) |
| `micromodal/` | [ghosh/Micromodal](https://github.com/ghosh/Micromodal) | 0.7.0 | MIT (dépôt ; ISC indiqué dans le paquet npm) | fenêtres accessibles : focus piégé, Échap, rôle de dialogue |
| `retroFootballManager/` | [FredericusRadicalus/retroFootballManager](https://github.com/FredericusRadicalus/retroFootballManager) | commit dans VERSION | MIT | logique des sponsors de tribunes (adaptée dans js/tribunes.js) |

`modules.mjs` expose Fuse et ZzFX (modules ES) en variables globales ; il ne fonctionne qu'avec le serveur local (http),
le jeu reste jouable sans (recherche simple, sons d'origine).
