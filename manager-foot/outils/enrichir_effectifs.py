"""Collecte les attributs manquants des clubs du jeu, contrôle les données et prépare leur chargement.
Exemples : python outils/enrichir_effectifs.py --limite 1200
           python outils/enrichir_effectifs.py --tout
Les téléchargements peuvent être longs. Chaque fiche validée est sauvegardée pour permettre la reprise.
"""
import argparse,json,subprocess,sys
from pathlib import Path
from cibler_effectifs_fminside import selectionner,PACKS
from pack_fminside import lire_catalogue,publier
from auditer_couverture_fmi import audit

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--limite',type=int,default=1200);ap.add_argument('--tout',action='store_true',help='Tous les joueurs manquants, réserves comprises');ap.add_argument('--reserves',action='store_true');ap.add_argument('--workers',type=int,default=3);ap.add_argument('--libres',action='store_true',help='Ajoute une collecte de joueurs libres après les clubs');ap.add_argument('--libres-seulement',action='store_true');ap.add_argument('--pages-libres',type=int,default=3,help='0 : toutes les pages de joueurs libres');a=ap.parse_args()
    if a.limite<0:ap.error('--limite doit être positif ou nul')
    rows=[] if a.libres_seulement else selectionner(0 if a.tout else a.limite,a.tout or a.reserves)
    if not rows and not (a.libres or a.libres_seulement):return print('Aucune cible manquante dans le périmètre sélectionné.')
    baseline=PACKS/'collecte-effectifs-baseline.json';baseline.write_text(json.dumps([str(p['fmUid']) for p in lire_catalogue()['players']]), encoding='utf-8')
    queue=PACKS/'collecte-effectifs-cibles.json';queue.write_text(json.dumps([p['url'] for p in rows],ensure_ascii=False), encoding='utf-8')
    queue.with_suffix('.mapping.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(f'{len(rows)} joueurs ciblés dans les clubs du jeu. Les fiches déjà enregistrées sont réutilisées.',flush=True)
    phase_libres=False
    try:
        for start in range(0,len(rows),300):
            batch=rows[start:start+300];queue.write_text(json.dumps([p['url'] for p in batch],ensure_ascii=False), encoding='utf-8')
            print(f'Lot {start//300+1} : {len(batch)} fiches',flush=True)
            subprocess.run([sys.executable,str(Path(__file__).with_name('importer_fminside.py')),'--urls',str(queue),'--workers',str(a.workers),'--sortie',str(PACKS/'fminside-fm26.json')],check=True)
            audit(None if phase_libres else baseline);publier()
        if a.libres or a.libres_seulement:
            phase_libres=True
            subprocess.run([sys.executable,str(Path(__file__).with_name('importer_fminside.py')),'--libres','--pages',str(a.pages_libres),'--workers',str(a.workers),'--sortie',str(PACKS/'fminside-fm26.json')],check=True)
            audit();publier()
    except (KeyboardInterrupt,subprocess.CalledProcessError):
        audit(None if phase_libres else baseline);publier()
        print('Collecte interrompue. Les fiches validées sont préparées pour le jeu ; relance la commande pour reprendre.')
        return
    print('Données préparées. Recharge le jeu puis utilise « Actualiser les attributs documentés » dans ta carrière.')
if __name__=='__main__':main()
