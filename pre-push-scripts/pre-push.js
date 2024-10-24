const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { minify } = require("terser");

async function main() {
    const unminified = fs.readFileSync(path.join(__dirname, '../src/Executor.js'), 'utf8');
    const unminified2 = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
    const result = await minify(unminified, { sourceMap: false });
    const result2 = await minify(unminified2, { sourceMap: false });
    fs.writeFileSync(path.join(__dirname, '../src/Executor.min.js'), result.code);
    fs.writeFileSync(path.join(__dirname, '../src/App.min.js'), result2.code);
    try {
        const url = 'https://unpkg.com/@babel/standalone/babel.min.js';
        const response = await fetch(url);
        const data = await response.text();
        const filePath = path.join(__dirname, '../libs/babel/babel.min.js');
        fs.writeFileSync(filePath, data);
    } catch { }
}

main()