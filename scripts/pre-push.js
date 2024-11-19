const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { minify } = require("terser");

(async function prePush() {
    const unminified = fs.readFileSync(path.join(__dirname, '../src/Executor.js'), 'utf8');
    const unminified2 = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
    const result = await minify(unminified, { sourceMap: false });
    const result2 = await minify(unminified2, { sourceMap: false });
    fs.writeFileSync(path.join(__dirname, '../src/Executor.min.js'), result.code);
    fs.writeFileSync(path.join(__dirname, '../src/App.min.js'), result2.code);
})();