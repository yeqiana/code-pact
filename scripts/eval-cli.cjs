'use strict';
const fs=require('node:fs'),path=require('node:path');
const audit=require('./lib/eval-contracts.cjs');
function main(){
 const [mode,...options]=process.argv.slice(2);
 if(mode==='fixtures'){
   const x=audit.loadCases();
   console.log('Evaluation fixture schema validation passed: '+x.cases.length+' cases; all constraints checked.');
   return;
 }
 if(mode!=='summarize')throw Error('Usage: node scripts/eval-cli.cjs fixtures | summarize <evals/results/name> [--write-summary] [--verify-summary]');
 const location=options.find(x=>!x.startsWith('--'));
 if(!location)throw Error('Summarize requires an explicit evals/results/<run> directory.');
 const dir=path.resolve(audit.ROOT,location);
 const data=audit.evaluateResults(location);
 for(const c of data.cases)console.log(c.case_id+' '+c.status+' '+c.passes+'/'+c.runs+' threshold='+c.threshold);
 console.log('Accepted='+data.accepted+' Failed='+data.failed+' InProgress='+data.in_progress+' NotRun='+data.not_run+' Total='+data.total+' ValidatedRunFiles='+data.validated_run_files);
 const summaryFile=path.join(dir,'summary.json'),existing=fs.existsSync(summaryFile)?audit.readJSON(summaryFile):null;
 const fresh=Object.fromEntries(['accepted','failed','in_progress','not_run','total'].map(k=>[k,data[k]]));
 const stale=existing&&(Object.keys(fresh).some(k=>existing[k]!==fresh[k])||JSON.stringify(existing.cases||[])!==JSON.stringify(data.cases));
 if(stale)console.warn('STALE SUMMARY: saved summary.json differs from validated source records; it was not used to decide acceptance.');
 if(options.includes('--verify-summary')&&(stale||!existing))throw Error('Summary cache is absent or stale');
 if(options.includes('--write-summary')){
   const payload={...data,generated_at:new Date().toISOString(),results_directory:location};
   const temp=summaryFile+'.new-'+process.pid;
   fs.writeFileSync(temp,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
   fs.renameSync(temp,summaryFile);
   console.log('Updated summary.json from validated records.');
 }
}
try{main();}catch(e){console.error('EVAL_VALIDATION_FAILED: '+e.message);process.exitCode=1;}
