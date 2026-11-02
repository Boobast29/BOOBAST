# Bibliothèques tierces (copies)

Toutes copiées sans modification depuis le registre npm (versions publiées officielles), avec leur licence d'origine.

| Dossier | Projet | Version | Licence | Usage dans le jeu |
|---|---|---|---|---|
| `canvas-confetti/` | [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | 1.9.4 | ISC | confettis (titres, montées, trophées, qualifications) |
| `uplot/` | [leeoniya/uPlot](https://github.com/leeoniya/uPlot) | 1.6.32 | MIT | graphiques (trésorerie, position au classement, notes de match) |
| `fuse/` | [krisk/Fuse](https://github.com/krisk/Fuse) | 7.5.0 | Apache-2.0 | recherche tolérante aux fautes dans la palette Ctrl+K |
| `fflate/` | [101arrowz/fflate](https://github.com/101arrowz/fflate) | 0.8.3 | MIT | export/import de partie compressé (.mfz) |
| `zzfx/` | [KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX) | 1.4.0 | MIT | effets sonores synthétisés (but, sifflet, trophée) |
| `retroFootballManager/` | [FredericusRadicalus/retroFootballManager](https://github.com/FredericusRadicalus/retroFootballManager) | commit dans VERSION | MIT | logique des sponsors de tribunes (adaptée dans js/tribunes.js) |

`modules.mjs` expose Fuse et ZzFX (modules ES) en variables globales ; il ne fonctionne qu'avec le serveur local (http),
le jeu reste jouable sans (recherche simple, sons d'origine).
