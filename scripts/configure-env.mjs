import {readFile,readdir} from 'node:fs/promises';
const token=process.env.LIARA_API_TOKEN;if(!token)throw Error('Missing Liara token');
async function api(path,body){const r=await fetch('https://api.liara.ir/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Liara HTTP '+r.status);return r.json();}
const {project}=await api('v1/projects/bstage');const vars=new Map((project.envs||[]).map(x=>[x.key,x.value]));let copied=0;
for(const name of await readdir('apps')){const cfg=JSON.parse(await readFile('apps/'+name+'/app.json','utf8'));if(!cfg.env_prefix)throw Error('Missing app env prefix');for(const key of cfg.env_allowlist||[]){if(vars.has(key)&&!vars.has(cfg.env_prefix+key)){vars.set(cfg.env_prefix+key,vars.get(key));copied++;}}}
if(copied)await api('v1/projects/update-envs',{project:'bstage',variables:[...vars].map(([key,value])=>({key,value}))});console.log('App env migration complete; '+copied+' prefixed values added; no values logged.');
