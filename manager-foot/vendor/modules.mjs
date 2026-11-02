// Bibliothèques publiées seulement en modules ES : exposées en global pour le jeu (absentes en file://, le jeu s'en passe).
import Fuse from './fuse/fuse.min.mjs';
import { zzfx } from './zzfx/ZzFX.js';
import screenfull from './screenfull/index.js';
import { minidenticon } from './minidenticons/minidenticons.min.js';
import autoAnimate from './auto-animate/index.min.js';
Object.assign(window, { Fuse, zzfx, screenfull, minidenticon, autoAnimate });
window.dispatchEvent(new Event('vendor-modules'));
