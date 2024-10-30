const fs = require('node:fs');
const path = require('node:path');

const js = path.resolve(__dirname, '../src/App.js');
const html = path.resolve(__dirname, '../index.html');
const sw = path.resolve(__dirname, '../serviceworker.js');

function findAndReplaceTextInFile(filepath, searchString, replaceString) {
    try {
        let string = fs.readFileSync(filepath, 'utf8');
        string.includes(searchString) ? fs.writeFileSync(filepath, string.replaceAll(searchString, replaceString)) : null;
    } catch (e) {
        throw e;
    }
}

function testHost(TESTING_MODE = false) {
    let preset = { html: ['App.min.js', 'App.js'], js: ['Executor.min.js', 'Executor.js'], sw: ['ENABLE_CACHING = true', 'ENABLE_CACHING = false'] }
    if (TESTING_MODE) {
        findAndReplaceTextInFile(js, ...preset.js);
        findAndReplaceTextInFile(sw, ...preset.sw);
        findAndReplaceTextInFile(html, ...preset.html);
    } else {
        findAndReplaceTextInFile(js, ...preset.js.reverse());
        findAndReplaceTextInFile(sw, ...preset.sw.reverse());
        findAndReplaceTextInFile(html, ...preset.html.reverse());
    }
}

process.argv[2] === '--test' ? testHost(true) : process.argv[2] === '--prod' ? testHost(false) : process.exit(1);