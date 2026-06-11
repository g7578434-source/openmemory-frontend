const { exec } = require('child_process');

// We don't have puppeteer, but we can write a tiny script to use the devtools protocol if we launch Chrome with --remote-debugging-port
// Wait, the easiest way is to use puppeteer. Let's see if we can install puppeteer in a temp dir.
// Actually, I will just write a script that installs puppeteer in a temp dir and runs it.
