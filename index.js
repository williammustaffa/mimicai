const AI = require('./AI');
const readline = require('readline');

rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: '
});

rl.prompt();

const ai = new AI();

rl.on('line', async function(line) {
  if (line === 'exit') rl.close();

  const answer = await ai.process(line);

  console.log('AI: ', answer);
  rl.prompt()
}).on('error', function(e) {
// something went wrong
});