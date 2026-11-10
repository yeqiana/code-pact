'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..','..'),RESULTS_ROOT=path.join(ROOT,'evals','results');
const supported=new Set(['$schema','title','type','required','properties','additionalProperties','enum','pattern','minLength','minimum','minItems','items']);
function readJSON(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error('Invalid JSON '+file+': '+e.message);}}
function checkSchema(s,at='schema'){if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Invalid schema '+at);for(const k of Object.keys(s)){if(!supported.has(k))throw Error('Unsupported schema keyword '+at+'.'+k);}for(const [k,v] of Object.entries(s.properties||{}))checkSchema(v,at+'.'+k);if(s.items)checkSchema(s.items,at+'.items');}
function isType(v,t){return t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='integer'?Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):typeof v===t;}
function validate(v,s,at='value',errors=[]){
 const ts=s.type===undefined?[]:Array.isArray(s.type)?s.type:[s.type];
 if(ts.length&&!ts.some(t=>isType(v,t))){errors.push(at+' wrong type: expected '+ts.join('|'));return errors;}
 if(s.enum&&!s.enum.includes(v))errors.push(at+' invalid enum');
 if(typeof v==='string'){if(s.minLength!==undefined&&[...v].length<s.minLength)errors.push(at+' below minLength');if(s.pattern&&!new RegExp(s.pattern).test(v))errors.push(at+' invalid pattern');}
 if(typeof v==='number'&&s.minimum!==undefined&&v<s.minimum)errors.push(at+' below minimum');
 if(Array.isArray(v)){if(s.minItems!==undefined&&v.length<s.minItems)errors.push(at+' below minItems');if(s.items)v.forEach((x,i)=>validate(x,s.items,at+'['+i+']',errors));}
 if(isType(v,'object')){for(const k of s.required||[])if(!Object.prototype.hasOwnProperty.call(v,k))errors.push(at+'.'+k+' missing');for(const [k,x]of Object.entries(v)){if(s.properties&&s.properties[k])validate(x,s.properties[k],at+'.'+k,errors);else if(s.additionalProperties===false)errors.push(at+'.'+k+' unexpected property');}}
 return errors;
}
function loadCases(){
 const cs=readJSON(path.join(ROOT,'evals/schema/case.schema.json')),rs=readJSON(path.join(ROOT,'evals/schema/result.schema.json'));
 checkSchema(cs);checkSchema(rs);
 const cases=readJSON(path.join(ROOT,'evals/cases/v2-cases.json')),contracts=fs.readFileSync(path.join(ROOT,'evals/behavior-contracts.md'),'utf8');
 if(!Array.isArray(cases)||!cases.length)throw Error('Cases must be nonempty array');
 const errors=[],ids=new Set();
 for(const c of cases){validate(c,cs,'case '+(c.id||'?'),errors);if(ids.has(c.id))errors.push('Duplicate case '+c.id);ids.add(c.id);if(!contracts.split(/\r?\n/).some(line=>/^## Case [0-9]+: /.test(line)&&line.endsWith(': '+c.title)))errors.push('Missing behavior-contract heading '+c.id);}
 if(errors.length)throw Error(errors.join('\n'));
 return{cases,caseSchema:cs,resultSchema:rs};
}
function inside(root,target){const rel=path.relative(root,target);return !!rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);}
function evaluateResults(relativeDirectory,config=loadCases()){
 const dir=path.resolve(ROOT,relativeDirectory);if(!inside(RESULTS_ROOT,dir))throw Error('Results directory must be under evals/results/');
 if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())throw Error('Missing results directory '+dir);
 const cases=new Map(config.cases.map(c=>[c.id,c])),errors=[],records=[],seen=new Set();
 const names=fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&f!=='summary.json');
 for(const name of names){
   const m=/^(V2-C\d{2})-run([1-9]\d*)\.json$/.exec(name);if(!m){errors.push('Unexpected result JSON name '+name);continue;}
   let x;try{x=readJSON(path.join(dir,name));}catch(e){errors.push(e.message);continue;}
   validate(x,config.resultSchema,name,errors);
   if(m[1]!==x.case_id)errors.push(name+' case_id filename mismatch');
   const c=cases.get(x.case_id);if(!c)errors.push(name+' unknown case');else if(x.case_revision!==c.revision)errors.push(name+' case_revision mismatch');
   const key=m[1]+'#'+m[2];if(seen.has(key))errors.push('Duplicate run '+key);seen.add(key);
   if(x.run_count!==1||x.pass_count!==(x.result==='pass'?1:0))errors.push(name+' inconsistent single-run count');
   if(!Number.isFinite(Date.parse(x.executed_at))||!(/[zZ]$|[+-]\d{2}:\d{2}$/.test(x.executed_at||'')))errors.push(name+' missing timezone in timestamp');
   for(const field of ['repo_fixture_revision','skill_revision'])if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(x[field]||''))errors.push(name+' invalid '+field);
   for(const e of Array.isArray(x.evidence)?x.evidence:[]){
     if(typeof e!=='string')continue;const target=path.resolve(ROOT,e);
     if(!inside(dir,target)||!target.endsWith('.md'))errors.push(name+' evidence must be Markdown inside run directory: '+e);
     else if(!fs.existsSync(target)||!fs.statSync(target).isFile()||fs.statSync(target).size<20)errors.push(name+' missing or empty evidence: '+e);
     else if(!inside(fs.realpathSync(dir),fs.realpathSync(target)))errors.push(name+' evidence symlink escapes result directory: '+e);
   }
   records.push({...x,file:name});
 }
 const summary=config.cases.map(c=>{
   const rows=records.filter(x=>x.case_id===c.id);
   for(const key of ['model','agent_runtime_version','repo_fixture_revision','skill_revision','case_revision'])if(new Set(rows.map(x=>x[key])).size>1)errors.push(c.id+' mixed '+key+' across runs');
   const counted=rows.filter(x=>x.result!=='inconclusive'),passes=counted.filter(x=>x.result==='pass').length,need=c.class==='behavioral'?2:3;
   const status=counted.length>=3?(passes>=need?'accepted':'failed'):rows.length===0?'not_run':'in_progress';
   return{case_id:c.id,title:c.title,class:c.class,runs:rows.length,passes,threshold:need+'/3',status};
 });
 if(errors.length)throw Error(errors.join('\n'));
 const count=status=>summary.filter(x=>x.status===status).length;
 return{accepted:count('accepted'),failed:count('failed'),in_progress:count('in_progress'),not_run:count('not_run'),total:summary.length,validated_run_files:records.length,cases:summary};
}
module.exports={ROOT,RESULTS_ROOT,readJSON,checkSchema,validate,loadCases,evaluateResults,inside};
