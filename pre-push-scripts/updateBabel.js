const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const url = 'https://unpkg.com/@babel/standalone/babel.min.js';
fetch(url)
    .then(response => response.text())
    .then(data => {
        const filePath = path.join(__dirname, '../libs/babel/babel.min.js');
        fs.writeFileSync(filePath, data);
    })
    .catch(error => console.error('Error:', error));
process.exit(0);