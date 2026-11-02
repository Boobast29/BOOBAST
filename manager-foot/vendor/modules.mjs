// Bibliothèques publiées seulement en modules ES : exposées en global pour le jeu (absentes en file://, le jeu s'en passe).
import Fuse from './fuse/fuse.min.mjs';
import { zzfx } from './zzfx/ZzFX.js';
window.Fuse = Fuse;
window.zzfx = zzfx;
window.dispatchEvent(new Event('vendor-modules'));
