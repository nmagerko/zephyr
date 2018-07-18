#!/usr/bin/env node

import 'babel-polyfill';
import chalk from 'chalk';
import ora from 'ora';
import { Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import grader from './grader';
import processCatchResult from './process-catch-result';
import processCatchResults from './process-catch-results';
import computeScore from './compute-score';
import { indentWithString } from './indent-string';

// Top-level async/await hack
(async () => {
  const options: GraderOptions = { cwd: '.' };
  const progressObservable = new Subject<GraderProgress>();

  // No Ora type was exported, so we have to be a bit hacky
  let typedOra = ora();
  let spinner: typeof typedOra;

  progressObservable.pipe(
    filter(p => p.event === 'start'),
    map(p => p.data.name)
  ).subscribe((name) => {
    spinner = ora(name).start();
  });

  const indent = indentWithString('  > ');

  progressObservable.pipe(
    filter(p => p.event === 'finish'),
    map(p => processCatchResult(p.data))
  ).subscribe((data) => {
    if (spinner) {
      const spinnerMethod = data.success ? spinner.succeed : spinner.fail;
      const color = data.success ? chalk.green : chalk.red;
      spinnerMethod.call(spinner, color(`[${data.earned}/${data.weight}] ${data.name}`));

      if (!data.success && data.output) {
        console.error(indent(data.output));
      }
    }
  });

  const results = await grader(options, progressObservable);
  const processedResults = await processCatchResults(results);
  const score = computeScore(processedResults);
  const percentScore = (score.score * 100).toFixed(2);
  console.log();
  console.log(`Score: ${score.totalEarned}/${score.totalWeight} (${percentScore}%)`);

  if (score.totalEarned != score.totalWeight) {
    console.log();
    console.log(chalk.bold('Please run the Catch tests directly for more detailed info on failing tests!'));
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
