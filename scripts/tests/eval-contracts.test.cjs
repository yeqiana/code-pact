'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const e=require('../lib/eval-contracts.cjs');
const data=e.loadCases();
function newRun(dir,overrides={}){
 const c=data.cases[0],name=c.id+'-run1',relative=path.relative(e.ROOT,path.join(dir,name+'-evidence.md')).replace(/\\/g,'/');
 fs.writeFileSync(path.join(dir,name+'-evidence.md'),'Evidence: command exit=0, verified feature behavior, no unrelated diff.\n');
 const row={case_id:c.id,case_revision:c.revision,repo_fixture_revision:'a'.repeat(40),model:'test-model',agent_runtime_version:'test-runtime-1',skill_revision:'b'.repeat(64),executed_at:'2026-11-10T10:00:00+08:00',run_count:1,pass_count:1,result:'pass',failure_reason:null,evidence:[relative],...overrides};
 fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(row,null,2)+'\n');
 return row;
}
function inTemp(fn){
 fs.mkdirSync(e.RESULTS_ROOT,{recursive:true});
 const dir=fs.mkdtempSync(path.join(e.RESULTS_ROOT,'.code-pact-test-'));
 const rel=path.relative(e.ROOT,dir).replace(/\\/g,'/');
 try{fn(dir,rel);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('case fixtures pass real schema validation',()=>{
 assert.ok(data.cases.length>=16);
 assert.deepEqual(e.validate(data.cases[0],data.caseSchema),[]);
});
test('schema rejects wrong types, enum, missing and unexpected fields',()=>{
 const c={...data.cases[0],revision:'1',class:'anything',extra:true};delete c.task;
 const errors=e.validate(c,data.caseSchema);
 assert.ok(errors.some(x=>x.includes('revision')));
 assert.ok(errors.some(x=>x.includes('class')));
 assert.ok(errors.some(x=>x.includes('task')));
 assert.ok(errors.some(x=>x.includes('extra')));
});
test('unimplemented schema keyword fails closed',()=>assert.throws(()=>e.checkSchema({type:'object',allOf:[]}),/Unsupported/));
test('single valid record stays in progress',()=>inTemp((dir,rel)=>{
 newRun(dir);const report=e.evaluateResults(rel);assert.equal(report.in_progress,1);assert.equal(report.accepted,0);assert.equal(report.validated_run_files,1);
}));
test('three comparable successful runs reach acceptance',()=>inTemp((dir,rel)=>{
 const first=newRun(dir);
 for(let i=2;i<=3;i++){const newName=first.case_id+'-run'+i;const src=path.join(dir,first.case_id+'-run1-evidence.md');const dest=path.join(dir,newName+'-evidence.md');fs.copyFileSync(src,dest);const x={...first,evidence:[path.relative(e.ROOT,dest).replace(/\\/g,'/')],executed_at:'2026-11-10T10:0'+i+':00+08:00'};fs.writeFileSync(path.join(dir,newName+'.json'),JSON.stringify(x));}
 assert.equal(e.evaluateResults(rel).accepted,1);
}));
test('mixed model or fixture cannot be combined',()=>inTemp((dir,rel)=>{
 const first=newRun(dir);
 const name=first.case_id+'-run2';const evidence=path.join(dir,name+'-evidence.md');fs.writeFileSync(evidence,'Independent evidence from second run: test exit 0.\n');fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({...first,model:'different-model',evidence:[path.relative(e.ROOT,evidence).replace(/\\/g,'/')]}));
 assert.throws(()=>e.evaluateResults(rel),/mixed model/);
}));
test('missing evidence is a hard validation failure',()=>inTemp((dir,rel)=>{
 newRun(dir,{evidence:[rel+'/missing-evidence.md']});assert.throws(()=>e.evaluateResults(rel),/missing or empty evidence/);
}));
test('inconsistent pass counts are rejected',()=>inTemp((dir,rel)=>{
 newRun(dir,{pass_count:0});assert.throws(()=>e.evaluateResults(rel),/inconsistent single-run count/);
}));
test('evidence path traversal is rejected',()=>inTemp((dir,rel)=>{
 newRun(dir,{evidence:['README.md']});assert.throws(()=>e.evaluateResults(rel),/evidence must be Markdown inside run directory/);
}));

test('mixed fixture revisions are rejected even when models match',()=>inTemp((dir,rel)=>{
 const first=newRun(dir);
 const name=first.case_id+'-run2';const evidence=path.join(dir,name+'-evidence.md');fs.writeFileSync(evidence,'Second run evidence with a different fixture revision.\n');
 fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({...first,repo_fixture_revision:'c'.repeat(40),evidence:[path.relative(e.ROOT,evidence).replace(/\\/g,'/')]}));
 assert.throws(()=>e.evaluateResults(rel),/mixed repo_fixture_revision/);
}));
