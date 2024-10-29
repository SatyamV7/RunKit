const fs = require('node:fs');
const path = require('node:path');

const js = path.resolve(__dirname, '../src/App.js');
const html = path.resolve(__dirname, '../index.html');
const sw = path.resolve(__dirname, '../serviceworker.js');

function findAndReplaceTextInFile(filepath, searchString, replaceString) {
    try {
        let string = fs.readFileSync(filepath, 'utf8');
        string.includes(searchString) ? fs.writeFileSync(filepath, string.replaceAll(searchString, replaceString)) : null;
        return true;
    } catch (e) {
        throw e;
    }
}

function testHost(TESTING_MODE = false) {
    if (TESTING_MODE) {
        findAndReplaceTextInFile(html, 'App.min.js', 'App.js');
        findAndReplaceTextInFile(js, 'Executor.min.js', 'Executor.js');
        findAndReplaceTextInFile(sw, 'ENABLE_CACHING = true', 'ENABLE_CACHING = false');

    } else {
        findAndReplaceTextInFile(html, 'App.js', 'App.min.js');
        findAndReplaceTextInFile(js, 'Executor.js', 'Executor.min.js');
        findAndReplaceTextInFile(sw, 'ENABLE_CACHING = false', 'ENABLE_CACHING = true');
    }
}

process.argv[2] === '--test' ? testHost(true) : testHost(false);