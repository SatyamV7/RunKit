self.onmessage = function (event) {
    const { code, ESM, TS, maxEnvLnLen } = event.data;

    performance.mark('executionStarted'); // Mark the start of execution

    let transpiledCode;

    function ESMTranspile(code) {
        // Babel imports for ES6 features
        importScripts('../libs/babel/babel.min.js');
        // Transpile the code using Babel
        return Babel.transform(code, {
            presets: ['env', 'es2015'],
            plugins: ['transform-modules-umd']
        }).code;
    }

    function TSTranspile(code) {
        // Babel imports for TypeScript features
        importScripts('../libs/babel/babel.min.js');
        // Transpile the code using Babel
        return Babel.transform(code, {
            filename: 'script.ts',
            presets: ['typescript'],
            plugins: ['transform-modules-umd']
        }).code;
    }

    if (ESM === true) transpiledCode = ESMTranspile(code);
    else if (TS === true) transpiledCode = TSTranspile(code);
    else transpiledCode = code;

    // Object to store start times for console.time
    const timers = {};

    // Object to store counts for console.count
    const counts = {};

    // Counter to store group level for console.group
    let level = 0;

    // Function to wrap text to a maximum line length
    function wrapText(text, maxLineLength = maxEnvLnLen) {
        if (!text || maxLineLength < 1) return text;
        const lines = [];
        const paragraphs = text.split(/(\n+)/); // Split by newlines, preserving them
        const newlines = [];
        const leadingNewlinesAndWhiteSpaces = text.match(/^[ ]*\n+/) || text.match(/^\n+/); // Capture spaces before newlines or newlines
        const trailingNewlinesAndWhiteSpaces = text.match(/\n[ ]*$/) || text.match(/\n+$/); // Capture spaces after newlines or newlines
        // Store number of newlines encountered between paragraphs
        for (let i = 0; i < paragraphs.length; i++) {
            const part = paragraphs[i];
            if (part.match(/^\n+$/)) {
                newlines.push(part.length); // Track newlines
            } else {
                newlines.push(0); // No newline, just content
            }
        }
        // Process each paragraph separately
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            // Preserve leading newlines (use empty string for first chunk to avoid starting with a newline)
            if (i === 0 && newlines[0] > 0) {
                lines.push('\n'.repeat(newlines[0]));
            }
            if (paragraph.match(/^\n+$/)) continue; // Skip newlines, already tracked
            const words = paragraph.split(/(\s+)/); // Split by spaces, preserving spaces
            let currentLine = '';
            let indent = paragraph.match(/^\s*/)[0]; // Detect and preserve indentation
            for (const word of words) {
                // Check if adding the word exceeds the max line length
                if (currentLine.length + word.length > maxLineLength) {
                    lines.push(currentLine); // Push current line to the array
                    currentLine = indent + word.trim(); // Start a new line with the current word and indent
                } else {
                    currentLine += word; // Append word to current line
                }
            }
            if (currentLine.trim()) {
                lines.push(currentLine); // Push last line
            }
            // Add the correct number of newlines between paragraphs
            if (i < newlines.length - 1 && newlines[i + 1] > 0 && newlines[i + 1] - 2 >= 0) {
                lines.push('\n'.repeat(newlines[i + 1] - 2));
            }
        }
        return `${leadingNewlinesAndWhiteSpaces ? leadingNewlinesAndWhiteSpaces[0] : ''}${lines.join('\n')}${trailingNewlinesAndWhiteSpaces ? trailingNewlinesAndWhiteSpaces[0] : ''}`;
    }

    // Formatting functions for different types
    function JavaScriptObject(obj) {
        let formatted = '{ ';
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];
                if (typeof value === 'string') {
                    value = `'${JavaScriptString(value)}'`;
                } else if (Array.isArray(value)) {
                    value = JavaScriptArray(value);
                } else if (typeof value === 'object' && value !== null) {
                    value = JavaScriptObject(value);
                }
                formatted += `${key}: ${value}, `;
            }
        }
        formatted = formatted.slice(0, -2) + ' }';
        return formatted;
    }

    function JavaScriptArray(arr) {
        let formatted = '[';
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i];
            if (typeof value === 'string') {
                value = `'${JavaScriptString(value)}'`;
            } else if (Array.isArray(value)) {
                value = JavaScriptArray(value);
            } else if (typeof value === 'object' && value !== null) {
                value = JavaScriptObject(value);
            }
            formatted += `${value}, `;
        }
        formatted = formatted.slice(0, -2) + ']';
        return formatted;
    }

    function JavaScriptString(str) {
        str = str
            .replace(/\\/g, '\\') // Backslash
            .replace(/\'/g, '\'') // Single quote
            .replace(/\"/g, '\"') // Double quote
            .replace(/\n/g, '\n') // Newline
            .replace(/\r/g, '\r') // Carriage return
            .replace(/\t/g, '\t')// Tab
        // .replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0'); // Tab Modification (tab --> 4 spaces)

        // Handle \uXXXX Unicode escapes
        str = str.replace(/\u([0-9A-Fa-f]{4})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });

        // Handle \u{XXXXX} Unicode escapes
        str = str.replace(/\u\{([0-9A-Fa-f]+)\}/g, (match, p1) => {
            return String.fromCodePoint(parseInt(p1, 16));
        });

        // Handle \xXX hexadecimal escapes (if needed)
        str = str.replace(/\x([0-9A-Fa-f]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });

        // Handle \XXX octal escapes (if needed)
        str = str.replace(/\([0-7]{1,3}\)/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 8));
        });

        return str;
    }

    function JavaScriptNumber(num) {
        return num;
    }

    function JavaScriptBoolean(bool) {
        return bool;
    }

    function JavaScriptBigInt() {
        return `${num}n`;
    }

    // Master message handler to process different types of messages
    function masterConsoleHandler(typeOfMessage, ...args) {
        // if (args.length === 1 && typeof args[0] === 'string') {
        //     // Wrap the string in single quotes
        //     return { type: typeOfMessage, message: `'${args[0]}'`, typeOf: 'string' };
        // } else {
        // Process the arguments as before
        let messages = args.map(arg => {
            let message;
            switch (arg.constructor.name) {
                case 'Array':
                    message = JavaScriptArray(arg);
                    break;
                case 'Object':
                    message = JavaScriptObject(arg);
                    break;
                case 'String':
                    message = JavaScriptString(arg);
                    break;
                case 'BigInt':
                    message = JavaScriptBigInt(arg);
                    break;
                case 'Number':
                    message = JavaScriptNumber(arg);
                    break;
                case 'Boolean':
                    message = JavaScriptBoolean(arg);
                    break;
                default:
                    message = arg;
                    break;
            }
            return message;
        }).join(' ');
        messages = '\u00A0'.repeat(level * 2) + messages.replace(/\u000A/g, '\u000A' + '\u00A0'.repeat(level * 2));
        return { type: typeOfMessage, message: wrapText(messages), typeOf: typeof args };
        // }
    }

    // Override console.log to also post messages back to the main thread
    console.log = (...args) => {
        self.postMessage(masterConsoleHandler('log', ...args));
    };

    // Override console.warn to also post messages back to the main thread
    console.warn = (...args) => {
        self.postMessage(masterConsoleHandler('warn', ...args));
    };

    // Override console.error to also post messages back to the main thread
    console.error = (...args) => {
        self.postMessage(masterConsoleHandler('error', ...args));
    };

    // Override console.time to start a timer
    console.time = (label = 'default') => {
        timers[label] = performance.now();
    };

    // Override console.timeLog to log the elapsed time for a timer
    console.timeLog = (label = 'default', ...args) => {
        if (timers[label]) {
            const elapsed = performance.now() - timers[label];
            const message = `${label}: ${+elapsed.toFixed(3)}ms`;
            self.postMessage({ type: 'log', message: [message, ...args].join(' ') });
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: wrapText(errorMessage) });
        }
    };

    // Override console.timeEnd to end the timer and log the elapsed time
    console.timeEnd = (label = 'default', ...args) => {
        if (timers[label]) {
            const elapsed = performance.now() - timers[label];
            const message = `${label}: ${+elapsed.toFixed(3)}ms - timer ended`;
            self.postMessage({ type: 'log', message: [message, ...args].join(' ') });
            delete timers[label]; // Remove the timer
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: wrapText(errorMessage) });
        }
    };

    // Override console.count to count the number of times console.count is called with a label
    console.count = (label = 'default') => {
        if (counts[label]) {
            counts[label]++;
        } else {
            counts[label] = 1;
        }
        const message = `${label}: ${counts[label]}`;
        self.postMessage({ type: 'log', message: wrapText(message) });
    };

    // Override console.countReset to reset the count for a label
    console.countReset = (label = 'default') => {
        if (counts[label]) {
            counts[label] = 0;
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: wrapText(errorMessage) });
        }
    };

    // Override console.assert to log an error message if the assertion is false
    console.assert = (condition, ...args) => {
        if (!condition) {
            const message = `Assertion failed: ${args.join(' ')}`;
            self.postMessage({ type: 'error', message: wrapText(message) });
        }
    };

    // Override console.info to log an informational message
    console.info = (...args) => {
        self.postMessage(masterConsoleHandler('info', ...args));
    };

    // Override console.debug to log a debug message
    console.debug = (...args) => {
        self.postMessage(masterConsoleHandler('debug', ...args));
    };

    // Override console.group to log indented message
    console.group = () => {
        level++
    };

    // Override console.groupEnd to reduce indentation level
    console.groupEnd = () => {
        level--
    };

    // Override console.groupCollapsed to log indented message
    console.groupCollapsed = () => {
        level++
    };

    // Override console.dir to log an object with its properties
    console.dir = (obj) => {
        function directoryStructure(obj, indentLevel = 0) {
            let indent = '\u00A0'.repeat(indentLevel * 4); // 4 spaces per level
            let formatted = '';
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    // Format arrays properly
                    formatted += JavaScriptArray(obj);
                } else {
                    // Regular object, format its properties
                    formatted += 'Object'; // No newline after Object
                    let isFirstProperty = true;
                    for (let key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            if (isFirstProperty) {
                                formatted += '\n'; // Add newline after the first property
                                isFirstProperty = false;
                            }
                            let value = obj[key];
                            if (typeof value === 'object' && value !== null) {
                                formatted += `${indent}${key}: ${directoryStructure(value, indentLevel + 1)}\n`;
                            } else if (typeof value === 'function') {
                                formatted += `${indent}${key}: ${value.toString()}\n`;
                            } else if (typeof value === 'string') {
                                formatted += `${indent}${key}: "${value}"\n`;
                            } else {
                                formatted += `${indent}${key}: ${value}\n`;
                            }
                        }
                    }
                    formatted = formatted.trim(); // Avoid trailing newlines
                }
            } else {
                // Fallback for non-object types
                formatted += String(obj);
            }
            return formatted.trim(); // Avoid trailing newlines
        }
        const output = directoryStructure(obj);
        self.postMessage({ type: 'log', message: wrapText(output) }); // Post message back to the main thread
    };

    // Override console.table to log an array/object of objects as a table
    // Warning: This implementation is not perfect and may not work in all cases (especially with nested objects/arrays)
    // Otherwise, it should work for most simple cases
    // This implementation will be improved in the future for senarios where the data is more complex (e.g. nested objects/arrays)
    console.table = (data) => {
        if (!data || (typeof data !== 'object')) {
            console.error('Provided data is not an object or array');
            return;
        }
        // Function to create an ASCII-style table for arrays and objects
        const createTable = (data) => {
            let output = "";
            let headers;
            let rows;
            // Handle Arrays
            if (Array.isArray(data)) {
                headers = ['(index)', 'Value'];
                rows = data.map((value, index) => [index, value]);
            }
            // Handle Objects
            else {
                headers = ['(index)', 'Value'];
                rows = Object.entries(data);
            }
            // Calculate maximum length for each column
            const maxLengths = headers.map((header, index) => Math.max(header.length, ...rows.map(row => String(row[index]).length)));
            const border = (header) => `╔${header.map((_, index) => '═'.repeat(maxLengths[index] + 2)).join('╦')}╗\n`;
            const rowSeparator = (header) => `╠${header.map((_, index) => '═'.repeat(maxLengths[index] + 2)).join('╬')}╣\n`;
            const footer = (header) => `╚${header.map((_, index) => '═'.repeat(maxLengths[index] + 2)).join('╩')}╝\n`;
            const createRow = (row) => {
                return `║ ${row.map((value, index) => `${value}`.padEnd(maxLengths[index], ' ')).join(' ║ ')} ║\n`;
            };
            // Build the table with row partitions
            output += border(headers);
            output += createRow(headers);
            output += rowSeparator(headers);
            rows.forEach((row, i) => {
                output += createRow(row);
                if (i < rows.length - 1) {
                    output += rowSeparator(headers);
                }
            });
            output += footer(headers);
            // Check if the total length exceeds 113 characters
            if (output.indexOf('\n', 0) > 113) { }
            return output;
        };
        // Generate the table and post it back to the main thread
        const table = createTable(data);
        self.postMessage({ type: 'log', message: table }); // Post message back to the main thread
    };

    // Override console.clear to clear the console
    console.clear = () => {
        self.postMessage({ type: 'clear' });
    };

    try {
        self.postMessage({ executionStatus: 'executionStarted' }); // Notify that execution has started

        // Wrap the code in an IIFE to use setTimeout and setInterval
        const result = (function () { eval(`(() => { ${transpiledCode}; undefined })()`) })();

        // If the result is not undefined, post it back as a log message
        if (result !== undefined) {
            self.postMessage({ type: 'log', message: wrapText(result), typeOf: typeof result });
        }
    } catch (error) {
        // Determine error type and post the error message back
        const errorType = error instanceof SyntaxError ? "Syntax Error" : "Runtime Error";
        self.postMessage({ type: 'error', message: `${errorType}: ${wrapText(error.message)}` });
    } finally {
        performance.mark('executionEnded'); // Mark the end of execution
        performance.measure('Execution Time', 'executionStarted', 'executionEnded'); // Measure the execution time
        self.postMessage({ executionStatus: 'executionEnded', executionTime: performance.getEntriesByName('Execution Time')[0].duration }); // Notify that execution has ended and post the execution time
    }
};