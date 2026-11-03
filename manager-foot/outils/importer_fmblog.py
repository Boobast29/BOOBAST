"""Complément FMB des joueurs de clubs existants, par UID officiel.
Scores FMB indépendants sur 99, pas les attributs bruts originaux de FM.
Usage : python outils/importer_fmblog.py --limite 1000 --workers 4
"""
import argparse,concurrent.futures,datetime,gzip,hashlib,html,json,re,subprocess,time
from pathlib import Path
from cibler_effectifs_fminside import selectionner
from pack_fminside import PACKS
from pack_fmblog import lire_fmblog

def texte(s):return ' '.join(html.unescape(re.sub('<[^>]+>',' ',s)).split())
def analyser(s,target):
    canonical=re.search(r'<link rel="canonical" href="([^"]+)"',s)
    if not canonical or not re.search(r'/fm26/players/'+re.escape(target['fmUid'])+r'-',canonical[1]):raise ValueError('UID/version canonique incorrect')
    nom=re.search(r'<h1[^>]*>(.*?)</h1>',s,re.S)
    if not nom:raise ValueError('Nom absent')
    attributes={};indicators={}
    for label,value in re.findall(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>',s,re.S):
        number=re.search(r'rating-bar-value[^>]*>\s*<strong>(\d+)</strong>',value)
        if not number:continue
        n=int(number[1]);key=texte(label)
        if not 1<=n<=99:raise ValueError('Note hors échelle')
        if key in ['Adaptability','Ambition','Consistency','Big Matches','Professional Habits','Pressure Handling','Commitment','Fair Play','Emotional Control','Tactical Flexibility','Discipline','Durability','Stability']:indicators[key]=n
        else:attributes[key]=n
    if len(attributes)<30:raise ValueError('Attributs publics incomplets')
    record={'fmUid':target['fmUid'],'name':texte(nom[1]),'club':target['club'],'sourceUrl':canonical[1],'sourceGender':'male','sourceDatabase':'FM26 FMB 26.3.2','sourceModel':'FMB 1.0 independent 1-99 scores','attributes':attributes,'fmbIndicators':indicators,'targetClubUid':target['clubUid'],'targetCountry':target['country'],'targetCompetition':target['competition']}
    # Les postes/âges restent ceux de l'effectif versionné, aucune affectation forcée.
    match=re.search(r'is a (\d+)-year-old',s)
    if match:record['age']=int(match[1])
    for css,key in [('ability','rating'),('potential','potential')]:
        m=re.search(r'fmb26-person-score '+css+r'"[^>]*>.*?<strong>(\d+)</strong>',s,re.S)
        if m:record[key]=int(m[1])
    preferred=re.search(r'foot-(left|right) preferred',s)
    if preferred:record['foot']='Left' if preferred[1]=='left' else 'Right'
    # Livres sterling abrégées : conserver le texte, pas les convertir en euros.
    for label,key in [('Weekly wage','wageSourceText'),('Contract until','contractEndText')]:
        m=re.search(r'<small>'+label+r'</small><strong>(.*?)</strong>',s,re.S)
        if m:record[key]=texte(m[1])
    return record

def lire_fiche(target):
    url=target['url'].replace('https://fminside.net/players/7-fm-26/','https://database.footballmanagerblog.org/fm26/players/')
    r=subprocess.run(['curl','-fsSL','--connect-timeout','10','--max-time','30',url],capture_output=True)
    if r.returncode:raise ValueError('HTTP indisponible ('+str(r.returncode)+')')
    return analyser(r.stdout.decode(),target)

def ecrire(path,content):
    tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_bytes(content if isinstance(content,bytes) else content.encode());tmp.replace(path)

def publier(data):
    ecrire(PACKS/'fmblog-fm26.json',json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    raw=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0);digest=hashlib.sha256(raw).hexdigest()[:12];parts=[]
    for i,offset in enumerate(range(0,len(raw),60000),1):
        name=f'fmblog-{digest}.{i:03d}.part';b=raw[offset:offset+60000];ecrire(PACKS/name,b);parts.append({'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    manifest={'version':1,'profiles':len(data['players']),'sourceVersion':'FM26 FMB 26.3.2','parts':parts}
    ecrire(PACKS/'fmblog-fm26.manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    primary=PACKS/'fminside-fm26.manifest.json'
    if primary.exists():
        m=json.loads(primary.read_text());m['supplement']='fmblog-fm26.manifest.json';ecrire(primary,json.dumps(m,ensure_ascii=False,indent=2)+'\n')
    return manifest

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--limite',type=int,default=1000);ap.add_argument('--workers',type=int,default=4);a=ap.parse_args()
    path=PACKS/'fmblog-fm26.json';data=lire_fmblog(PACKS) if (PACKS/'fmblog-fm26.manifest.json').exists() else json.loads(path.read_text()) if path.exists() else {'source':'https://database.footballmanagerblog.org/fm26/players','scale':99,'model':'Independent calculated FMB scores','players':[],'errors':[]}
    known={p['fmUid'] for p in data['players']};targets=[p for p in selectionner(0) if p['fmUid'] not in known][:a.limite];data['errors']=[]
    # Récupère les postes de la base (les postes FMB ne doivent pas devenir MC par défaut).
    positions={str(p['fmUid']):p.get('positions') for f in PACKS.glob('monde-*.json.gz') for c in json.loads(gzip.decompress(f.read_bytes()))['clubs'] for p in c['players']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(4,a.workers))) as pool:
        futures={pool.submit(lire_fiche,p):p for p in targets}
        for i,f in enumerate(concurrent.futures.as_completed(futures),1):
            target=futures[f]
            try:
                p=f.result();p['positions']=positions.get(p['fmUid']);data['players'].append(p)
            except Exception as e:data['errors'].append({'fmUid':target['fmUid'],'url':target['url'],'error':str(e)})
            if i%50==0:
                data['retrievedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();publier(data);print(json.dumps({'completed':i,'profiles':len(data['players']),'errors':len(data['errors'])}),flush=True)
    data['retrievedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();m=publier(data);print(json.dumps({'profiles':m['profiles'],'parts':len(m['parts']),'errors':len(data['errors'])}),flush=True)
if __name__=='__main__':main()
