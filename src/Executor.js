let scriptsImported;

self.onmessage = function (event) {
    const { code, ESM, TS, formatLogs, BabelURL } = event.data;

    performance.mark('executionStarted'); // Mark the start of execution

    let transpiledCode;

    if (!scriptsImported && BabelURL && (ESM || TS)) {
        importScripts(BabelURL);
        scriptsImported = typeof Babel === 'object';
    }

    function ESMTranspile(code) {
        return Babel.transform(code, {
            presets: ['env', 'es2015'],
            plugins: ['transform-modules-umd']
        }).code;
    }

    function TSTranspile(code) {
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

    // // Function to wrap text to a maximum line length
    // function wrapText(text, maxLineLength = maxEnvLnLen) {
    //     if (!text || maxLineLength < 1) return text;
    //     const lines = [];
    //     const paragraphs = text.split(/(\n+)/); // Split by newlines, preserving them
    //     const newlines = [];
    //     const leadingNewlinesAndWhiteSpaces = text.match(/^[ ]*\n+/) || text.match(/^\n+/); // Capture spaces before newlines or newlines
    //     const trailingNewlinesAndWhiteSpaces = text.match(/\n[ ]*$/) || text.match(/\n+$/); // Capture spaces after newlines or newlines
    //     // Store number of newlines encountered between paragraphs
    //     for (let i = 0; i < paragraphs.length; i++) {
    //         const part = paragraphs[i];
    //         if (part.match(/^\n+$/)) {
    //             newlines.push(part.length); // Track newlines
    //         } else {
    //             newlines.push(0); // No newline, just content
    //         }
    //     }
    //     // Process each paragraph separately
    //     for (let i = 0; i < paragraphs.length; i++) {
    //         const paragraph = paragraphs[i];
    //         // Preserve leading newlines (use empty string for first chunk to avoid starting with a newline)
    //         if (i === 0 && newlines[0] > 0) {
    //             lines.push('\n'.repeat(newlines[0]));
    //         }
    //         if (paragraph.match(/^\n+$/)) continue; // Skip newlines, already tracked
    //         const words = paragraph.split(/(\s+)/); // Split by spaces, preserving spaces
    //         let currentLine = '';
    //         let indent = paragraph.match(/^\s*/)[0]; // Detect and preserve indentation
    //         for (const word of words) {
    //             // Check if a single word exceeds the max line length
    //             if (word.length > maxLineLength) {
    //                 // Split the word and add newlines between parts
    //                 for (let j = 0; j < word.length; j += maxLineLength) {
    //                     lines.push(word.substring(j, j + maxLineLength));
    //                 }
    //                 currentLine = ''; // Reset current line after splitting the long word
    //             } else if (currentLine.length + word.length > maxLineLength) {
    //                 lines.push(currentLine); // Push current line to the array
    //                 currentLine = indent + word.trim(); // Start a new line with the current word and indent
    //             } else {
    //                 currentLine += word; // Append word to current line
    //             }
    //         }
    //         if (currentLine.trim()) {
    //             lines.push(currentLine); // Push last line
    //         }
    //         // Add the correct number of newlines between paragraphs
    //         if (i < newlines.length - 1 && newlines[i + 1] > 0 && newlines[i + 1] - 2 >= 0) {
    //             lines.push('\n'.repeat(newlines[i + 1] - 2));
    //         }
    //     }
    //     return `${leadingNewlinesAndWhiteSpaces ? leadingNewlinesAndWhiteSpaces[0] : ''}${lines.join('\n')}${trailingNewlinesAndWhiteSpaces ? trailingNewlinesAndWhiteSpaces[0] : ''}`;
    // }

    // Formatting functions for different types
    function JavaScriptObject(obj, indentLevel = 1, format = formatLogs) {
        if (Object.getOwnPropertyNames(obj).length === 0) return '{}';
        let indent = format ? '\u00A0'.repeat(indentLevel * 4) : '';
        let formatted = format ? '{\n' : '{ ';
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];
                if (typeof value === 'string') {
                    value = `'${JavaScriptString(value)}'`;
                } else if (Array.isArray(value)) {
                    value = JavaScriptArray(value, indentLevel + 1, format);
                } else if (typeof value === 'object' && value !== null) {
                    value = JavaScriptObject(value, indentLevel + 1, format);
                }
                formatted += format ? `${indent}${key}: ${value},\n` : `${key}: ${value}, `;
            }
        }
        formatted = format ? formatted.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}}` : formatted.slice(0, -2) + ' }';
        return formatted;
    }

    function JavaScriptArray(arr, indentLevel = 1, format = formatLogs) {
        if (arr.length === 0) return '[]';
        let indent = format ? '\u00A0'.repeat(indentLevel * 4) : '';
        let formatted = format ? '[\n' : '[';
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i];
            if (typeof value === 'string') {
                value = `'${JavaScriptString(value)}'`;
            } else if (Array.isArray(value)) {
                value = JavaScriptArray(value, indentLevel + 1, format);
            } else if (typeof value === 'object' && value !== null) {
                value = JavaScriptObject(value, indentLevel + 1, format);
            }
            formatted += format ? `${indent}${value},\n` : `${value}, `;
        }
        formatted = format ? formatted.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}]` : formatted.slice(0, -2) + ']';
        return formatted;
    }

    function JavaScriptString(str) {
        str = str
            .replace(/\\/g, '\\') // Backslash
            .replace(/\'/g, '\'') // Single quote
            .replace(/\"/g, '\"') // Double quote
            .replace(/\n/g, '\n') // Newline
            .replace(/\r/g, '\r') // Carriage return
            .replace(/\t/g, '\t') // Tab

        // Handle \uXXXX Unicode escapes
        str = str.replace(/\\u([0-9A-Fa-f]{4})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });

        // Handle \u{XXXXX} Unicode escapes
        str = str.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (match, p1) => {
            return String.fromCodePoint(parseInt(p1, 16));
        });

        // Handle \xXX hexadecimal escapes (if needed)
        str = str.replace(/\\x([0-9A-Fa-f]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });

        // Handle \XXX octal escapes (if needed)
        str = str.replace(/\\([0-7]{1,3})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 8));
        });

        return String(str);
    }

    function JavaScriptNumber(num) {
        return Number(num);
    }

    function JavaScriptBoolean(bool) {
        return Boolean(bool);
    }

    function JavaScriptBigInt(num) {
        return `${BigInt(num)}n`;
    }

    // Master message handler to process different types of messages
    function masterConsoleHandler(typeOfMessage, ...args) {
        // if (args.length === 1 && typeof args[0] === 'string') {
        //     // Wrap the string in single quotes
        //     return { type: typeOfMessage, message: `'${args[0]}'`, typeOf: 'string' };
        // } else {
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
        return { type: typeOfMessage, message: messages, typeOf: typeof args, method: 'console.' + typeOfMessage };
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
            self.postMessage({ type: 'log', message: [message, ...args].join(' '), method: 'console.timeLog' });
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: 'console.timeLog' });
        }
    };

    // Override console.timeEnd to end the timer and log the elapsed time
    console.timeEnd = (label = 'default', ...args) => {
        if (timers[label]) {
            const elapsed = performance.now() - timers[label];
            const message = `${label}: ${+elapsed.toFixed(3)}ms`;
            self.postMessage({ type: 'log', message: [message, ...args].join(' '), method: 'console.timeEnd' });
            delete timers[label]; // Remove the timer
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: 'console.timeEnd' });
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
        self.postMessage({ type: 'log', message: message, method: 'console.count' });
    };

    // Override console.countReset to reset the count for a label
    console.countReset = (label = 'default') => {
        if (counts[label]) {
            counts[label] = 0;
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: 'console.countReset' });
        }
    };

    // Override console.assert to log an error message if the assertion is false
    console.assert = (condition, ...args) => {
        if (!condition) {
            const message = `Assertion failed: ${args.join(' ')}`;
            self.postMessage({ type: 'error', message: message, method: 'console.assert' });
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
        self.postMessage({ type: 'log', message: directoryStructure(obj), method: 'console.dir' }); // Post message back to the main thread
    };

    // Override console.table to log an array/object of objects as a table
    console.table = (data) => {
        if (!data || (typeof data !== 'object')) {
            console.log(data);
            return;
        }

        function DataTransformer(data) {
            const maxHeight = data.length || Object.keys(data).length;
            const { maxObjectLength, maxArrayLength } = Object.values(data).reduce(
                (acc, value) => {
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        acc.maxObjectLength = Math.max(acc.maxObjectLength, Object.keys(value).length);
                    } else if (Array.isArray(value)) {
                        acc.maxArrayLength = Math.max(acc.maxArrayLength, value.length);
                    }
                    return acc;
                },
                { maxObjectLength: 0, maxArrayLength: 0 }
            );
            const maxWidth = maxObjectLength + maxArrayLength;
            const hasValue = Object.keys(data).some(key => typeof data[key] !== 'object');
            const result = Array.from({ length: maxHeight + 1 }, () =>
                Array.from({ length: maxWidth + (hasValue ? 2 : 1) }, () => null)
            );
            const header = new Map();

            // Helper function to sort data into primitives, arrays, and objects
            function sortData(data) {
                const result = { primitives: {}, arrays: {}, objects: {} };
                Object.keys(data).forEach(key => {
                    const value = data[key];
                    if (typeof value === 'object') {
                        if (Array.isArray(value)) {
                            result.arrays[key] = value;
                        } else {
                            result.objects[key] = value;
                        }
                    } else {
                        result.primitives[key] = value;
                    }
                });
                return result;
            }

            // Helper function to format data types
            function formatData(data) {
                if (typeof data === 'string') return `'${data}'`;
                if (Array.isArray(data)) return JavaScriptArray(data);
                if (typeof data === 'object' && data !== null) return JavaScriptObject(data);
                return data;
            }

            if (maxHeight !== 0) {
                result[0][0] = '(index)';
                if (hasValue) result[0][1] = 'Value';
            }

            const { primitives, arrays, objects } = sortData(data);
            let rowIndex = 1;

            // Process primitives (non-object values)
            if (hasValue) {
                Object.keys(primitives).forEach(key => {
                    result[rowIndex][0] = key;
                    result[rowIndex][1] = formatData(primitives[key]);
                    rowIndex++;
                });
            }

            // Process arrays
            Object.keys(arrays).forEach(key => {
                result[rowIndex][0] = key;
                arrays[key].forEach((item, index) => {
                    if (result[0][hasValue ? index + 2 : index + 1] === null) {
                        result[0][hasValue ? index + 2 : index + 1] = index + 1;
                    }
                    result[rowIndex][hasValue ? index + 2 : index + 1] = formatData(item);
                });
                rowIndex++;
            });

            // Process objects without overriding existing headers
            Object.keys(objects).forEach(key => {
                result[rowIndex][0] = key;
                const object = objects[key];
                Object.keys(object).forEach(objectKey => {
                    let headerIndex = header.get(objectKey) || result[0].indexOf(null);
                    if (headerIndex === -1) {
                        headerIndex = result[0].length;
                        result[0][headerIndex] = objectKey;
                    } else {
                        result[0][headerIndex] = result[0][headerIndex] || objectKey;
                    }
                    header.set(objectKey, headerIndex);
                    result[rowIndex][headerIndex] = formatData(object[objectKey]);
                });
                rowIndex++;
            });

            let maxLen = Math.max(...result.map(row => row.length));
            for (let i = 0; i < result.length; i++) {
                while (result[i].length < maxLen) {
                    result[i].push(null);
                }
            }

            // Sort result based on first value of every sub-array except the first one (The header)
            result.sort((a, b) => {
                if (a[0] === b[0]) return 0;
                return a[0] < b[0] ? -1 : 1;
            });

            return result;
        }

        // Function to generate an ASCII-style table
        function generateTable(tableData) {
            function extractData(tableData, spacePadding, horizontalHeader, verticalHeader) {
                var i, j, k, cell, item, lines, w, vAlign, hAlign, vLen, hLen, mergedData;
                var result = [];
                var arr = tableData;
                var iOffset = 0;
                var jOffset = 0;
                for (i = 0; i < arr.length; i++) {
                    if (i == 0 && ('number' == horizontalHeader || 'letter' == horizontalHeader)) {
                        result.push([]);
                        if ('number' == verticalHeader || 'letter' == verticalHeader) {
                            //add an empty item that will be replaced later:
                            result[0][0] = {
                                cell: {
                                    x: 0,
                                    y: 0,
                                    colspan: 1,
                                    rowspan: 1
                                },
                                empty: true
                            };
                            jOffset = 1;
                        }
                        for (j = 0; j < arr[i].length; j++) {
                            //add an empty item that will be replaced later:
                            result[0][j + jOffset] = {
                                cell: {
                                    x: 0,
                                    y: (j + jOffset),
                                    colspan: 1,
                                    rowspan: 1
                                },
                                empty: true
                            };
                        }
                        iOffset = 1;
                    }
                    result.push([]);
                    if ('number' == verticalHeader || 'letter' == verticalHeader) {
                        //add an empty item that will be replaced later:
                        result[i + iOffset][0] = {
                            cell: {
                                x: (i + iOffset),
                                y: 0,
                                colspan: 1,
                                rowspan: 1
                            },
                            empty: true
                        };
                        jOffset = 1;
                    }
                    for (j = 0; j < arr[i].length; j++) {
                        mergedData = false;
                        if (mergedData) {
                            cell = {
                                x: mergedData.row + iOffset,
                                y: mergedData.col + jOffset,
                                colspan: mergedData.colspan,
                                rowspan: mergedData.rowspan
                            };
                        } else {
                            cell = {
                                x: i + iOffset,
                                y: j + jOffset,
                                colspan: 1,
                                rowspan: 1
                            };
                        }
                        item = arr[i][j];
                        if (!item) {
                            result[i + iOffset][j + jOffset] = {
                                cell: cell,
                                empty: true
                            };
                        } else {
                            w = 0;
                            lines = item.toString().split('\n');
                            for (k = 0; k < lines.length; k++) {
                                if (spacePadding) {
                                    if (lines[k].indexOf(' ', 0) !== 0) {
                                        lines[k] = ' ' + lines[k];
                                    }
                                    if (lines[k].indexOf(' ', lines[k].length - 1) === -1) {
                                        lines[k] = lines[k] + ' ';
                                    }
                                }
                                if (lines[k].length > w) {
                                    w = lines[k].length;
                                }
                            }
                            hAlign = 'left';
                            vAlign = 'top';
                            result[i + iOffset][j + jOffset] = {
                                cell: cell,
                                empty: false,
                                pseudoRows: lines,
                                maxWidth: w,
                                vAlign: vAlign,
                                hAlign: hAlign
                            };
                        }
                    }
                }
                vLen = getVLen(result, (i + iOffset - 1), (j + jOffset - 1));
                hLen = getHLen(result, (i + iOffset - 1), (j + jOffset - 1));
                if ('none' != verticalHeader) {
                    jOffset = 1;
                }
                if ('number' == horizontalHeader || 'letter' == horizontalHeader) {
                    for (j = 0; j < hLen - jOffset; j++) {
                        result[0][j + jOffset] = generateHeader(0, j + jOffset, horizontalHeader, spacePadding, j);
                    }
                }
                if ('none' != horizontalHeader) {
                    iOffset = 1;
                }
                if ('number' == verticalHeader || 'letter' == verticalHeader) {
                    for (i = 0; i < vLen - iOffset; i++) {
                        result[i + iOffset][0] = generateHeader(i + iOffset, 0, verticalHeader, spacePadding, i);
                    }
                }
                return {
                    arr: result,
                    vLen: vLen,
                    hLen: hLen
                };
            }

            function getVLen(arr, vMax, hMax) {
                var i, j, item, v;
                var vLen = 0;

                for (i = vMax; i >= 0; i--) {
                    for (j = 0; j <= hMax; j++) {
                        item = arr[i][j];
                        if (!item.empty) {
                            v = item.cell.x + item.cell.rowspan;
                            if (v > vLen) {
                                vLen = v;
                            }
                        }
                    }
                }
                return vLen;
            }

            function getHLen(arr, vMax, hMax) {
                var i, j, item, h;
                var hLen = 0;

                for (j = hMax; j >= 0; j--) {
                    for (i = 0; i <= vMax; i++) {
                        item = arr[i][j];
                        if (!item.empty) {
                            h = item.cell.y + item.cell.colspan;
                            if (h > hLen) {
                                hLen = h;
                            }
                        }
                    }
                }
                return hLen;
            }

            function generateHeader(i, j, headerType, spacePadding, id) {
                var str = "";
                var num, s;
                if (spacePadding) {
                    str += ' ';
                }
                if ('letter' == headerType) {
                    s = '';
                    num = id;
                    do {
                        s = String.fromCharCode(65 + (num % 26)) + s;
                        num = Math.floor(num / 26) - 1;
                    } while (num > -1);
                    str += s;
                } else {
                    str += (id + 1).toString();
                }
                if (spacePadding) {
                    str += ' ';
                }
                return {
                    cell: {
                        x: i,
                        y: j,
                        colspan: 1,
                        rowspan: 1
                    },
                    empty: false,
                    pseudoRows: [str],
                    maxWidth: str.length,
                    vAlign: 'middle',
                    hAlign: 'center'
                };
            }

            function getWidths(data, spacePadding) {
                var widths = [];
                var mergedCells = [];
                var i, j, w, item, m, a;

                for (j = 0; j < data.hLen; j++) {
                    w = 0;
                    if (spacePadding) {
                        w = 1;
                    }
                    for (i = 0; i < data.vLen; i++) {
                        item = data.arr[i][j];
                        if (!item.empty) {
                            if (item.cell.colspan == 1 && item.cell.rowspan == 1) {
                                if (item.maxWidth > w) {
                                    w = item.maxWidth;
                                }
                            } else if (i == item.cell.x && j == item.cell.y) {
                                mergedCells.push(item);
                            }
                        }
                    }
                    widths[j] = w;
                }
                return widths;
            }

            function getHeights(data, border, horizontalHeader, spacePadding) {
                var heights = [];
                var mergedCells = [];
                var i, j, h, item;

                for (i = 0; i < data.vLen; i++) {
                    h = 0;
                    if (spacePadding) {
                        h = 1;
                    }
                    for (j = 0; j < data.hLen; j++) {
                        item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
                        if (!item.empty) {
                            if (item.cell.colspan == 1 && item.cell.rowspan == 1) {
                                if (item.pseudoRows.length > h) {
                                    h = item.pseudoRows.length;
                                }
                            } else if (i == item.cell.x && j == item.cell.y) {
                                mergedCells.push(item);
                            }
                        }
                    }
                    heights[i] = h;
                }
                return heights;
            }

            function generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, i) {
                var j, k, horizontalBorderKey, generateBorder, item, offset;
                var str = '';

                if (i == -1) {
                    horizontalBorderKey = 'horizontalTop';
                    if ('none' == border.horizontalTop) {
                        return str;
                    }
                } else if (i >= data.vLen - 1) {
                    horizontalBorderKey = 'horizontalBottom';
                    if ('none' == border.horizontalBottom) {
                        return str;
                    }
                } else {
                    if (hasHorizontalInnerHeader(data, border, i, horizontalHeader)) {
                        horizontalBorderKey = 'horizontalInnerHeader';
                    } else if (hasHorizontalInner(data, border, i)) {
                        horizontalBorderKey = 'horizontalInner';
                    } else {
                        return str;
                    }
                }
                var horizontalBorder = border[horizontalBorderKey];
                var horizontalChar = line[charset][horizontalBorder].horizontal;

                str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, -1);
                for (j = 0; j < widths.length; j++) {
                    generateBorder = true;
                    if (i > -1) {
                        item = data.arr[i][j];
                        if (item.cell.x + item.cell.rowspan - 1 > i) {
                            generateBorder = false;
                            offset = calculateOffset(data, heights, border, horizontalHeader, i + 1, j) - 1;
                            str += generateCellContent(data, offset, widths, i, j);
                            j += item.cell.colspan - 1;
                        }
                    }
                    if (generateBorder) {
                        for (k = 0; k < widths[j]; k++) {
                            str += horizontalChar;
                        }
                    }
                    str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, j);
                }
                if (widths.length == 0) {
                    str += generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, widths.length);
                }
                str += '\n';
                return str;
            }

            function generateIntersection(data, border, horizontalHeader, verticalHeader, unicode, i, j) {
                var top, bottom, left, right, horizontalBorderKey, item, verticalBorderKey, intersectionChar;
                var str = '';
                if (i == -1) {
                    top = true;
                    bottom = false;
                    horizontalBorderKey = 'horizontalTop';
                } else if (i >= data.vLen - 1) {
                    top = false;
                    bottom = true;
                    horizontalBorderKey = 'horizontalBottom';
                } else {
                    top = false;
                    bottom = false;
                    if (hasHorizontalInnerHeader(data, border, i, horizontalHeader)) {
                        horizontalBorderKey = 'horizontalInnerHeader';
                    } else if (hasHorizontalInner(data, border, i)) {
                        horizontalBorderKey = 'horizontalInner';
                    } else {
                        //unexpected: empty string return statement in generateSeparationLine(...)
                        return str;
                    }
                }

                if (j == -1) {
                    left = true;
                    right = false;
                    verticalBorderKey = 'verticalLeft';
                } else if (j >= data.hLen - 1) {
                    left = false;
                    right = true;
                    verticalBorderKey = 'verticalRight';
                } else {
                    left = false;
                    right = false;
                    if ('none' != verticalHeader && j == 0) {
                        verticalBorderKey = 'verticalInnerHeader';
                    } else if (j < data.hLen - 1) {
                        verticalBorderKey = 'verticalInner';
                    } else {
                        return str;
                    }
                }

                //handle merged cells (modify the values of top, right, bottom, left):
                if (!top && j >= 0) {
                    item = data.arr[i][j];
                    if (item.cell.y + item.cell.colspan - 1 > j) {
                        top = true;
                    }
                }
                if (!bottom && j >= 0) {
                    item = data.arr[i + 1][j];
                    if (item.cell.y + item.cell.colspan - 1 > j) {
                        bottom = true;
                    }
                }
                if (!left && i >= 0) {
                    item = data.arr[i][j];
                    if (item.cell.x + item.cell.rowspan - 1 > i) {
                        left = true;
                    }
                }
                if (!right && i >= 0) {
                    item = data.arr[i][j + 1];
                    if (item.cell.x + item.cell.rowspan - 1 > i) {
                        right = true;
                    }
                }

                var horizontalBorder = border[horizontalBorderKey];
                var verticalBorder = border[verticalBorderKey];
                intersectionChar = unicode[(top) ? 'none' : verticalBorder][(right) ? 'none' : horizontalBorder][(bottom) ? 'none' : verticalBorder][(left) ? 'none' : horizontalBorder];
                str += intersectionChar;
                return str;
            }

            function calculateOffset(data, heights, border, horizontalHeader, i, j) {
                var offset, item, calc;
                item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
                calc = calcultateHeight(data, border, horizontalHeader, heights, item, i);
                offset = calc.offset;
                if ('bottom' == item.vAlign) {
                    offset += item.pseudoRows.length - calc.height;
                } else if ('middle' == item.vAlign) {
                    offset += Math.ceil((item.pseudoRows.length - calc.height) / 2);
                } else {
                    offset += 0;
                }
                return offset;
            }

            function calcultateHeight(data, border, horizontalHeader, heights, item, i) {
                var offset, height, k;
                offset = 0;
                height = heights[item.cell.x];
                for (k = 1; k < item.cell.rowspan; k++) {
                    height += (hasHorizontalInnerHeader(data, border, item.cell.x + k - 1, horizontalHeader) || hasHorizontalInner(data, border, item.cell.x + k - 1)) ? 1 : 0;
                    if (item.cell.x + k <= i) {
                        offset = height;
                    }
                    height += heights[item.cell.x + k];
                }
                return {
                    height: height,
                    offset: offset
                };
            }

            function generateCellContent(data, offset, widths, i, j) {
                var item, width, k, entry, end;
                var str = '';
                item = data.arr[data.arr[i][j].cell.x][data.arr[i][j].cell.y];
                width = calculateWidth(widths, item);
                if (item.empty) {
                    entry = '';
                } else {
                    entry = item.pseudoRows[offset] || '';
                }
                if ('right' == item.hAlign) {
                    end = width - entry.length;
                } else if ('center' == item.hAlign) {
                    end = Math.floor((width - entry.length) / 2);
                } else {
                    end = 0;
                }
                for (k = 0; k < end; k++) {
                    str += ' ';
                }
                str += escapeHTMLEntities(entry);
                end = width - entry.length - end;
                for (k = 0; k < end; k++) {
                    str += ' ';
                }
                return str;
            }

            function calculateWidth(widths, item) {
                var width, k;
                width = widths[item.cell.y];
                for (k = 1; k < item.cell.colspan; k++) {
                    width += 1;
                    width += widths[item.cell.y + k];
                }
                return width;
            }

            function hasHorizontalInnerHeader(data, border, i, horizontalHeader) {
                return ('none' != border.horizontalInnerHeader && 'none' != horizontalHeader && i == 0 && data.vLen > 1);
            }

            function hasHorizontalInner(data, border, i) {
                return ('none' != border.horizontalInner && i < data.vLen - 1);
            }

            function escapeHTMLEntities(text) {
                return text.replace(/[<>\&]/g, function (c) {
                    return '&#' + c.charCodeAt(0) + ';';
                });
            }

            var unicode = {
                none: {
                    none: {
                        double: {
                            double: '╗'
                        },
                    },
                    double: {
                        none: {
                            double: '═'
                        },
                        double: {
                            none: '╔',
                            double: '╦'
                        },
                    },
                },
                double: {
                    none: {
                        none: {
                            double: '╝'
                        },
                        double: {
                            none: '║',
                            double: '╣'
                        },
                    },
                    double: {
                        none: {
                            none: '╚',
                            double: '╩'
                        },
                        double: {
                            none: '╠',
                            double: '╬'
                        }
                    }
                }
            };

            var line = {
                unicode: {
                    double: {
                        vertical: unicode.double.none.double.none,
                        horizontal: unicode.none.double.none.double
                    }
                }
            };

            var spacePadding = true;
            var charset = 'unicode';
            var horizontalHeader = 'first_line';
            var verticalHeader = 'none';

            var border = {
                horizontalTop: 'double',
                horizontalInnerHeader: 'double',
                horizontalInner: 'double',
                horizontalBottom: 'double',
                verticalLeft: 'double',
                verticalInnerHeader: 'double',
                verticalInner: 'double',
                verticalRight: 'double',
                asciiIntersection: 'plus'
            };

            var data = extractData(tableData, spacePadding, horizontalHeader, verticalHeader);
            var widths = getWidths(data, spacePadding);
            var heights = getHeights(data, border, horizontalHeader, spacePadding);
            var str = "";
            var i, j, m, offsets;

            // top
            str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, -1);

            // rows
            for (i = 0; i < data.vLen; i++) {
                offsets = [];
                for (j = 0; j < widths.length; j++) {
                    offsets[j] = calculateOffset(data, heights, border, horizontalHeader, i, j);
                }

                for (m = 0; m < heights[i]; m++) {
                    str += line[charset][border.verticalLeft].vertical;
                    for (j = 0; j < widths.length; j++) {
                        str += generateCellContent(data, offsets[j] + m, widths, i, j);
                        j += data.arr[i][j].cell.colspan - 1;
                        if ('none' != verticalHeader && j == 0 && data.hLen > 1) {
                            str += line[charset][border.verticalInnerHeader].vertical;
                        } else if (j < widths.length - 1) {
                            str += line[charset][border.verticalInner].vertical;
                        }
                    }
                    str += line[charset][border.verticalRight].vertical;
                    str += '\n';
                }

                str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, i);
            }
            if (data.vLen == 0) {
                str += generateSeparationLine(data, widths, heights, unicode, line, charset, horizontalHeader, verticalHeader, border, data.vLen);
            }
            return str.trim();
        }
        self.postMessage({ type: 'log', method: 'console.table', message: generateTable(DataTransformer(data)) });
    };

    // Override console.clear to clear the console
    console.clear = () => {
        self.postMessage({ type: 'clear', method: 'console.clear' });
    };

    // Override fetch to inject mode: 'cors'
    const Fetch = fetch;
    fetch = (input, init = {}) => {
        init.mode = 'cors';
        return Fetch(input, init);
    };

    try {
        self.postMessage({ executionStatus: 'executionStarted' }); // Notify that execution has started

        // Wrap the code in an IIFE to use setTimeout and setInterval
        const result = (function () { eval(`(() => { ${transpiledCode} })()`) })();

        // If the result is not undefined, post it back as a log message
        if (result !== undefined) {
            self.postMessage({ type: 'log', message: result, typeOf: typeof result, method: 'globalThis.eval' });
        }
    } catch (error) {
        // Determine error type and post the error message back
        const errorType = error instanceof SyntaxError ? "Syntax Error" : "Runtime Error";
        self.postMessage({ type: 'error', message: `${errorType}: ${error.message}` });
    } finally {
        performance.mark('executionEnded'); // Mark the end of execution
        performance.measure('Execution Time', 'executionStarted', 'executionEnded'); // Measure the execution time
        self.postMessage({ executionStatus: 'executionEnded', executionTime: performance.getEntriesByName('Execution Time')[0].duration }); // Notify that execution has ended and post the execution time
    }
};