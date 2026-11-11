'use strict';

const { routeTask, MODES } = require('./lib/task-router.cjs');

function main() {
  const args = process.argv.slice(2);
  let mode;
  const taskParts = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--mode') {
      if (mode !== undefined || !args[i + 1]) throw new Error('Use one --mode followed by a mode name');
      mode = args[++i];
    } else if (args[i].startsWith('--')) {
      throw new Error('Unknown option ' + args[i]);
    } else taskParts.push(args[i]);
  }
  if (!taskParts.length) throw new Error('Usage: node scripts/task-router.cjs [--mode ' + MODES.join('|') + '] "任务描述"');
  const decision = routeTask(taskParts.join(' '), { mode });
  process.stdout.write(JSON.stringify(decision, null, 2) + '\n');
  if (decision.status === 'needs_intent') process.exitCode = 2;
}

try { main(); }
catch (error) { console.error('TASK_ROUTER_FAILED: ' + error.message); process.exitCode = 1; }
