# Système de design de Manager Foot

Les jetons sont définis dans `tokens.css`, chargé avant toutes les feuilles de style (`style.css` → `theme.css` → `design.css`).
Toute nouvelle règle utilise ces jetons, jamais de valeur en dur.

## Audit (v52)

| Catégorie | Avant | Après |
|---|---|---|
| Tailles de texte distinctes | 28 (de 9 à 30 px) | échelle de 9 jetons ; 164 occurrences converties |
| Arrondis distincts | 14 | 6 jetons ; 115 occurrences converties |
| Couleurs les plus répétées | `#121a24` ×16, `#2f3c4d` ×6… | 11 couleurs fréquentes converties (47 occurrences) |

Il reste des couleurs en dur pour des usages uniques (dégradés, couleurs de poste, pastilles d'attributs). Elles seront migrées au fil des retouches.

## Jetons

### Couleurs
| Jeton | Rôle |
|---|---|
| `--surface-0` … `--surface-4`, `--surface-inverse` | Fond de page, panneau, champ et bouton, encart, barre de titre, menus flottants |
| `--line-soft`, `--line`, `--line-strong` | Séparateurs, bordures de panneau, bordures de champ et de bouton |
| `--txt`, `--txt-2`, `--mut`, `--mut-2` | Texte principal, titres de section, texte secondaire (contraste ≥ 4,5:1), libellés |
| `--acc` / `--acc2` | Succès, action principale, hausse |
| `--red` | Danger, défaite, baisse |
| `--yel` / `--warn` | Avertissement, nul / alerte forte (décision à prendre) |
| `--blue` | Information |
| `--badge` | Pastilles de compteur (contraste AA avec le blanc) |
| `--club1`, `--club2` | Couleurs du club géré : accents, barres de titre, onglet actif |

### Typographie
- Texte : Inter. Chiffres d'affichage (barre du haut, scores, notes) : Bebas Neue.
- Échelle : `--fs-3xs` 10 · `--fs-2xs` 11 · `--fs-xs` 12 · `--fs-s` 13 · `--fs-m` 14 (texte courant) · `--fs-l` 15 · `--fs-xl` 18 · `--fs-2xl` 22 · `--fs-3xl` 26 px.
- Interlignage : `--lh-tight` 1,2 · `--lh-base` 1,45 · `--lh-loose` 1,6. Chiffres de tableau en `tabular-nums`.

### Arrondis, espacements, élévation, mouvement
- Arrondis : `--r-xs` 4 (pastilles) · `--r-s` 6 · `--r-m` 8 (champs, boutons) · `--r-l` 10 · `--r-xl` 12 (panneaux, fenêtres) · `--r-pill`.
- Espacements, base 4 px : `--esp-1` 4 … `--esp-6` 32.
- Élévation : `--elev-1` (bouton), `--elev-2` (panneau), `--elev-3` (fenêtre).
- Mouvement : `--dur-1` 0,12 s (survol) · `--dur-2` 0,2 s (entrée d'écran) · `--dur-3` 0,3 s ; `--ease`. Tout est coupé quand le système demande moins d'animations.

## Composants

### Bouton `.btn`
| Variante | Usage |
|---|---|
| (défaut) | Action secondaire |
| `.primary` | Action principale de l'écran ou de la fenêtre (une seule visible) |
| `.danger` | Action destructrice ou irréversible (licencier, renoncer, supprimer) |
| `.ghost` | Action tertiaire dans une barre (« Aller à… ») |
| Tailles | `.sm` 28 px · défaut 34 px · `.big` 42 px ; 40 px minimum au doigt |

États : survol (bordure aux couleurs du club), actif (enfoncé de 1 px), focus clavier (anneau `--anneau`), désactivé (opacité 0,45),
**chargement** (`aria-busy="true"` : spinner, clic bloqué). Libellé : verbe à l'infinitif qui dit ce qui se passe (« Confirmer la signature »).

### Onglets
- `.tabs` dans une fenêtre ou en tête de panneau : soulignés, l'onglet actif est souligné aux couleurs du club.
- `.tabs` segmentés (filtres) : pastilles, texte seul.
- Barre de section `#ariane.sect-bar` : groupe du menu, écrans du groupe, précédent / suivant.

### Panneau `.card`
Le titre `h2` en premier enfant devient une barre de titre teintée. Le titre est en texte seul, sans émoji.

### Tableau `.tbl`
Lignes zébrées, survol teinté, ligne de ton club `.me`. Un tableau sans conteneur est mis dans `.defile-x` (défilement horizontal,
atteignable au clavier, ombres sur les bords). Les noms longs (`td.nm`) sont abrégés avec une infobulle.

### Retour d'information
- Notifications `toast` : deux au plus, 2,2 à 5 s, zone annoncée poliment aux lecteurs d'écran. Erreur : liseré rouge.
- Fenêtre `modal` : rôle dialog, Échap pour fermer. Confirmation d'une action irréversible : `confirmBox(…, danger = true)`.

## À faire / à ne pas faire
| ✅ À faire | ❌ À éviter |
|---|---|
| Utiliser `var(--fs-*)`, `var(--r-*)`, `var(--surface-*)` | Écrire `font-size: 13px` ou `#121a24` |
| Une seule action `.primary` par zone | Deux boutons principaux côte à côte |
| Nommer l'action par son effet (« Signer », « Simuler 2 000 fins de saison ») | « OK », « Valider », « Soumettre » |
| Couleur + texte ou icône pour un état (V/N/D, ▲▼) | La couleur seule pour porter un sens |
