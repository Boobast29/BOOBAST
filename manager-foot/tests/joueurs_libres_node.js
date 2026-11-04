const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={NEXT_PID:1000,convertirJoueur:()=>({pos:'BU',foot:'Droit',attrs:{fin:16},detail20:{finition:16}}),genPlayer:(pos,q,o)=>({id:ctx.NEXT_PID++,pos,...o,attrs:{fin:10},stats:{apps:0},pot:75}),calcWage:()=>2000,playerOvr:()=>80};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../js/integration_fminside.js','utf8'),ctx);
const attrs=Object.fromEntries(Array.from({length:36},(_,i)=>['a'+i,50]));
const source={fmUid:'123',name:'Libre documenté',attributes:attrs,freeAgentSnapshot:true,sourceGender:'male',potential:85,age:30,sourceUrl:'https://fminside.net/player',sourceDatabase:'26.2.0'};
const active={id:99,fmUid:'456',name:'Déjà sous contrat',club:4,contract:3,attrs:{fin:12}};
const base={clubs:[{id:4,name:'Club'}],players:[active]};
let r=ctx.ajouterJoueursLibresDocumentes(base,{players:[source,source,{...source,fmUid:'789',freeAgentSnapshot:undefined},{...source,fmUid:'456'}]});
assert.equal(r.ajoutes,1);assert.equal(r.monde.players.length,2);assert.equal(r.monde.players[1].id,1000);assert.equal(r.monde.players[1].club,null);assert.equal(r.monde.players[1].contract,0);assert.equal(r.monde.players[1].value,0);assert.equal(r.monde.players[1].wage,2000);assert.equal(active.club,4);assert.equal(base.players.length,1);
r=ctx.ajouterJoueursLibresDocumentes(r.monde,{players:[source]});assert.equal(r.ajoutes,0);
console.log('Libres : statut explicite, absence de doublon, IDs historiques, contrat nul et préservation des joueurs sous contrat vérifiés.');

const legacy=ctx.ajouterJoueursLibresDocumentes({clubs:[],players:[{id:8,name:source.name,club:4}]},{players:[source]});assert.equal(legacy.ajoutes,0,'Un ancien profil homonyme sans UID doit être conservé sans doublon ajouté.');
