"""Extrait les fiches publiques FMInside en JSON (notes FMInside sur 99).
Usage : python outils/importer_fminside.py --index URL --sortie fichier.json
Les valeurs proviennent de Football Manager, pas de contrats réels vérifiés.
"""
import gzip, argparse, concurrent.futures, datetime, html, json, re, subprocess, time, tempfile
from pathlib import Path
from pack_fminside import lire_catalogue
BASE = 'https://fminside.net'
def texte(s):
    return ' '.join(html.unescape(re.sub('<[^>]+>', ' ', s)).split())
COOKIE = None
def lire(url, data=None):
    cmd = ['curl', '-fsSL', '--connect-timeout', '10', '--max-time', '30', '--retry', '1', '--retry-delay', '2', '--retry-max-time', '45']
    if COOKIE: cmd += ['-b', COOKIE, '-c', COOKIE]
    if data: cmd += ['--data', data]
    try:
        r = subprocess.run(cmd + [url], capture_output=True, check=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f'Lecture échouée ({e.returncode}) : {e.stderr.decode(errors="replace").strip()}') from e
    return r.stdout.decode('utf-8')
def fiche(url):
    s = lire(url)
    nom = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    attrs = {}
    for row in re.findall(r'<tr\b[^>]*>.*?</tr>', s, re.S):
        label = re.search(r'data-player-stat-name="([^"]+)"', row)
        val = re.search(r'<td\b[^>]*class="(?:stat(?:\s[^"]*)?|profile-stat-value[^"]*)"[^>]*>\s*(\d+)\s*</td>', row)
        if label and val and 1 <= int(val[1]) <= 99:
            attrs[html.unescape(label[1])] = int(val[1])
    if not nom or len(attrs) < 30:
        raise ValueError('Fiche absente ou attributs incomplets : ' + url)
    def info(key):
        m = re.search(re.escape(key) + r':\s*</span>(.*?)</li>', s, re.S)
        return texte(m[1]) if m else None
    def montant(key):
        v = info(key)
        if v and re.fullmatch(r'€ [\d,.]+(?: pw)?', v):
            return float(v.replace('€ ', '').replace(' pw', '').replace(',', ''))
        return None
    wage = montant('Wages')
    position_section = re.search(r'Positions:\s*</span>(.*?)</li>', s, re.S)
    natural = re.search(r'class="position natural">([^<]+)', position_section[1]) if position_section else None
    p = {'name': texte(nom[1]), 'club': info('Club'), 'age': int(info('Age')), 'positions': info('Positions'),
         'position': natural[1].strip() if natural else None, 'attributes': attrs, 'fmUid': re.search(r'/([0-9]+)-[^/]+$', url)[1],
         'sourceUrl': url, 'sourceGender': 'male', 'sourceDatabase': info('Database version'), 'birthDateText': info('Date of birth'),
         'foot': info('Footedness'), 'contractEndText': info('Contract end'), 'wageWeekly': wage,
         'wageMonthly': round(wage * 52 / 12, 2) if wage is not None else None,
         'value': montant('Sell value'), 'releaseClause': montant('Release clause')}
    rating = re.search(r'Current ability (\d+)\. Potential ability (\d+)', s)
    if rating: p.update(rating=int(rating[1]), potential=int(rating[2]))
    return p

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--index', default=BASE + '/players')
    ap.add_argument('--sortie', required=True)
    ap.add_argument('--urls', help='JSON de liens déjà découverts (évite de refaire la pagination)')
    ap.add_argument('--workers', type=int, default=5)
    ap.add_argument('--pages', type=int, default=1, help='0 : toutes les pages ; reprise des fiches déjà présentes')
    a = ap.parse_args()
    global COOKIE
    cookie = tempfile.NamedTemporaryFile(prefix='fminside-', delete=False); cookie.close()
    COOKIE = cookie.name
    players, errors, urls = [], [], []
    dest = Path(a.sortie)
    compressed = dest.with_suffix('.json.gz')
    if dest.name=='fminside-fm26.json' and (compressed.exists() or dest.exists() or dest.with_suffix('.manifest.json').exists()): players = lire_catalogue(dest.parent).get('players', [])
    elif compressed.exists(): players = json.loads(gzip.decompress(compressed.read_bytes())).get('players', [])
    elif dest.exists(): players = json.loads(dest.read_text()).get('players', [])
    known = {p['fmUid'] for p in players}
    if a.urls:
        urls = json.loads(Path(a.urls).read_text(encoding="utf-8"))
        Path(COOKIE).unlink(missing_ok=True); COOKIE = None
    else:
        try:
            lire(a.index)
            lire(BASE + '/resources/inc/ajax/update_filter.php', 'page=players&database_version=7&gender=1')
            endpoint = BASE + '/beheer/modules/players/resources/inc/frontend/generate-player-table.php?ajax_request=1'
            page = 0
            seen = set()
            while a.pages == 0 or page < a.pages:
                content = lire(endpoint + ('&loadmore=true' if page else ''))
                found = list(dict.fromkeys(BASE + u for u in re.findall(r'href="(/players/\d+-fm-\d+/\d+-[^"?]+)"', content)))
                found = [re.sub(r'/players/\d+-fm-\d+/', '/players/7-fm-26/', u) for u in found]
                if not found and page == 0: raise ValueError('Aucune fiche repérée ; pagination indisponible')
                new = [u for u in found if u not in seen]
                if not new: break
                urls.extend(new); seen.update(new); page += 1
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.with_suffix('.urls.json').write_text(json.dumps(urls), encoding='utf-8')
                print(f'Page {page} : {len(seen)} fiches repérées', flush=True)
                time.sleep(.5)
        finally:
            Path(COOKIE).unlink(missing_ok=True); COOKIE = None
    male_uids = {re.search(r'/([0-9]+)-[^/]+$', u)[1] for u in urls}
    for p in players:
        if p['fmUid'] in male_uids: p['sourceGender'] = 'male'
    # Les fiches publiques ne nécessitent pas la session de pagination.
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(8, a.workers))) as pool:
        futures = {pool.submit(fiche, u): u for u in urls if re.search(r'/([0-9]+)-[^/]+$', u)[1] not in known}
        for f in concurrent.futures.as_completed(futures):
            try:
                players.append(f.result())
                dest.parent.mkdir(parents=True, exist_ok=True)
                checkpoint = dest.with_suffix('.tmp')
                checkpoint.write_text(json.dumps({'source':'FMInside — données Football Manager 26', 'scale':99, 'coverage':'partial_in_progress', 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'players':players, 'errors':errors}, ensure_ascii=False), encoding='utf-8')
                checkpoint.replace(dest)
                compressed_temp = compressed.with_suffix('.gz.tmp')
                compressed_temp.write_bytes(gzip.compress(dest.read_bytes(),mtime=0)); compressed_temp.replace(compressed)
                if len(players) % 50 == 0: print(f'{len(players)} profils détaillés enregistrés', flush=True)
            except Exception as e: errors.append({'url': futures[f], 'error': str(e)})
    players.sort(key=lambda p: (-p.get('rating', 0), p['name']))
    out = {'source': 'FMInside — données du jeu Football Manager 26', 'scale': 99,
           'coverage': 'partial_unverified', 'discoveredUrls': len(urls),
           'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'note': 'Salaires mensuels = salaire hebdomadaire × 52 ÷ 12. Aucun attribut caché extrait. Aucun portrait inclus.',
           'players': players, 'errors': errors}
    dest = Path(a.sortie); dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    compressed.write_bytes(gzip.compress(dest.read_bytes(),mtime=0))
    print(f'{len(players)} fiches détaillées, {len(errors)} erreurs -> {dest}')
if __name__ == '__main__': main()
