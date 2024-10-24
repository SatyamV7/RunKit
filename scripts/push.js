const readline = require('node:readline');
const { exec } = require('node:child_process');
const prePush = require('./pre-push.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Please enter the commit message for your changes:\u00A0',
});

console.log("Git Automation Utility\nAn empty message aborts the commit\n");
rl.prompt();

rl.on('line', (line) => {
    const commitMessage = line.trim();
    if (commitMessage === '') {
        console.log('Commit operation was cancelled due to empty commit message.');
        rl.close();
    } else {
        console.log(`Committing & Pushing with message: "${commitMessage}"...`);
        prePush().then(() => {
            exec(`git add . && git commit -m "${commitMessage}" && git push`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error during git operations: ${stderr}`);
                } else {
                    console.log('Commit & Push operations was sucessful:\n', stdout);
                }
                rl.close();
            });
        })
    }
}).on('close', () => {
    process.exit(0);
});
