self.onmessage = function (event) {
    const { code, ESM, TS, formatCode, maxEnvLnLen } = event.data;

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
    function JavaScriptObject(obj, indentLevel = 1, format = formatCode) {
        let indent = format ? '\u00A0'.repeat(indentLevel * 4) : '';
        let formatted = format ? '{\n' : '{';
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
                formatted += format ? `${indent}${key}: ${value},\n` : `${key}:${value},`;
            }
        }
        formatted = format ? formatted.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}}` : formatted.slice(0, -1) + '}';
        return formatted;
    }

    function JavaScriptArray(arr, indentLevel = 1, format = formatCode) {
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
            formatted += format ? `${indent}${value},\n` : `${value},`;
        }
        formatted = format ? formatted.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}]` : formatted.slice(0, -1) + ']';
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

    function JavaScriptBigInt(num) {
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
        return { type: typeOfMessage, message: messages, typeOf: typeof args };
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
            self.postMessage({ type: 'error', message: errorMessage });
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
            self.postMessage({ type: 'error', message: errorMessage });
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
        self.postMessage({ type: 'log', message: message });
    };

    // Override console.countReset to reset the count for a label
    console.countReset = (label = 'default') => {
        if (counts[label]) {
            counts[label] = 0;
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage });
        }
    };

    // Override console.assert to log an error message if the assertion is false
    console.assert = (condition, ...args) => {
        if (!condition) {
            const message = `Assertion failed: ${args.join(' ')}`;
            self.postMessage({ type: 'error', message: message });
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
        self.postMessage({ type: 'log', message: output }); // Post message back to the main thread
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
            // const extSpaces = (maxWidth + (hasValue ? 2 : 1)) * 3 + 2;

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

            return result;
        }

        // Function to create an ASCII-style table
        function generateTable(a) {
            var b = Math.floor;
            function c(a, b, c, g) {
                var h, l, m, n, o, p, q, r, s, t, u, v, x, y = [], z = a, A = 0, B = 0;
                for (h = 0; h < z.length; h++) {
                    if (0 == h && ("number" == c || "letter" == c)) {
                        for (y.push([]), ("number" == g || "letter" == g) && ((y[0][0] = { cell: { x: 0, y: 0, colspan: 1, rowspan: 1 }, empty: !0 }), (B = 1)), l = 0; l < z[h].length; l++)
                            y[0][l + B] = { cell: { x: 0, y: l + B, colspan: 1, rowspan: 1 }, empty: !0 };
                        A = 1;
                    }
                    for (y.push([]), ("number" == g || "letter" == g) && ((y[h + A][0] = { cell: { x: h + A, y: 0, colspan: 1, rowspan: 1 }, empty: !0 }), (B = 1)), l = 0; l < z[h].length; l++)
                        if (((x = !1), (n = x ? { x: x.row + A, y: x.col + B, colspan: x.colspan, rowspan: x.rowspan } : { x: h + A, y: l + B, colspan: 1, rowspan: 1 }), (o = z[h][l]), !o)) y[h + A][l + B] = { cell: n, empty: !0 };
                        else {
                            for (q = 0, p = o.toString().split("\n"), m = 0; m < p.length; m++)
                                b && (0 !== p[m].indexOf(" ", 0) && (p[m] = " " + p[m]), -1 === p[m].indexOf(" ", p[m].length - 1) && (p[m] += " ")), p[m].length > q && (q = p[m].length);
                            (t = "left"), (s = "top"), (y[h + A][l + B] = { cell: n, empty: !1, pseudoRows: p, maxWidth: q, vAlign: s, hAlign: t });
                        }
                }
                if (((u = d(y, h + A - 1, l + B - 1)), (v = e(y, h + A - 1, l + B - 1)), "none" != g && (B = 1), "number" == c || "letter" == c)) for (l = 0; l < v - B; l++) y[0][l + B] = f(0, l + B, c, b, l);
                if (("none" != c && (A = 1), "number" == g || "letter" == g)) for (h = 0; h < u - A; h++) y[h + A][0] = f(h + A, 0, g, b, h);
                return { arr: y, vLen: u, hLen: v };
            }
            function d(a, b, c) {
                var d, e, f, g, h = 0;
                for (d = b; 0 <= d; d--) for (e = 0; e <= c; e++) (f = a[d][e]), f.empty || ((g = f.cell.x + f.cell.rowspan), g > h && (h = g));
                return h;
            }
            function e(a, b, c) {
                var d, e, f, g, k = 0;
                for (e = c; 0 <= e; e--) for (d = 0; d <= b; d++) (f = a[d][e]), f.empty || ((g = f.cell.y + f.cell.colspan), g > k && (k = g));
                return k;
            }
            function f(a, c, d, e, f) {
                var h, i, g = String.fromCharCode, j = "";
                if ((e && (j += " "), "letter" == d)) {
                    (i = ""), (h = f);
                    do (i = g(65 + (h % 26)) + i), (h = b(h / 26) - 1);
                    while (-1 < h);
                    j += i;
                } else j += (f + 1).toString();
                return e && (j += " "), { cell: { x: a, y: c, colspan: 1, rowspan: 1 }, empty: !1, pseudoRows: [j], maxWidth: j.length, vAlign: "middle", hAlign: "center" };
            }
            function g(a, b, c, d, e, f, g, m, n, p) {
                var i, s, t, u, v, w, x = "";
                if (-1 == p) {
                    if (((t = "horizontalTop"), "none" == n.horizontalTop)) return x;
                } else if (p >= a.vLen - 1) {
                    if (((t = "horizontalBottom"), "none" == n.horizontalBottom)) return x;
                } else if (q(a, n, p, g)) t = "horizontalInnerHeader";
                else if (r(a, n, p)) t = "horizontalInner";
                else return x;
                var y = n[t], z = e[f][y].horizontal;
                for (x += h(a, n, g, m, d, p, -1), i = 0; i < b.length; i++) {
                    if (((u = !0), -1 < p && ((v = a.arr[p][i]), v.cell.x + v.cell.rowspan - 1 > p && ((u = !1), (w = l(a, c, n, g, p + 1, i) - 1), (x += o(a, w, b, p, i)), (i += v.cell.colspan - 1))), u)) for (s = 0; s < b[i]; s++) x += z;
                    x += h(a, n, g, m, d, p, i);
                }
                return 0 == b.length && (x += h(a, n, g, m, d, p, b.length)), (x += "\n"), x;
            }
            function h(a, b, c, d, e, f, g) {
                var h, i, j, k, l, m, n, o, p = "";
                if (-1 == f) (h = !0), (i = !1), (l = "horizontalTop");
                else if (f >= a.vLen - 1) (h = !1), (i = !0), (l = "horizontalBottom");
                else if (((h = !1), (i = !1), q(a, b, f, c))) l = "horizontalInnerHeader";
                else if (r(a, b, f)) l = "horizontalInner";
                else return p;
                if (-1 == g) (j = !0), (k = !1), (n = "verticalLeft");
                else if (g >= a.hLen - 1) (j = !1), (k = !0), (n = "verticalRight");
                else if (((j = !1), (k = !1), "none" != d && 0 == g)) n = "verticalInnerHeader";
                else if (g < a.hLen - 1) n = "verticalInner";
                else return p;
                !h && 0 <= g && ((m = a.arr[f][g]), m.cell.y + m.cell.colspan - 1 > g && (h = !0)), !i && 0 <= g && ((m = a.arr[f + 1][g]), m.cell.y + m.cell.colspan - 1 > g && (i = !0)), !j && 0 <= f && ((m = a.arr[f][g]), m.cell.x + m.cell.rowspan - 1 > f && (j = !0)), !k && 0 <= f && ((m = a.arr[f][g + 1]), m.cell.x + m.cell.rowspan - 1 > f && (k = !0));
                var s = b[l], t = b[n];
                return (o = e[h ? "none" : t][k ? "none" : s][i ? "none" : t][j ? "none" : s]), (p += o), p;
            }
            function l(a, b, c, d, e, f) {
                var h, i, j, g = Math.ceil;
                return (
                    (i = a.arr[a.arr[e][f].cell.x][a.arr[e][f].cell.y]), (j = n(a, c, d, b, i, e)), (h = j.offset), (h += "bottom" == i.vAlign ? i.pseudoRows.length - j.height : "middle" == i.vAlign ? g((i.pseudoRows.length - j.height) / 2) : 0), h
                );
            }
            function n(a, b, c, d, e, f) {
                var g, h, i;
                for (g = 0, h = d[e.cell.x], i = 1; i < e.cell.rowspan; i++) (h += q(a, b, e.cell.x + i - 1, c) || r(a, b, e.cell.x + i - 1) ? 1 : 0), e.cell.x + i <= f && (g = h), (h += d[e.cell.x + i]);
                return { height: h, offset: g };
            }
            function o(a, c, d, e, f) {
                var g, h, i, j, l, m = "";
                for (g = a.arr[a.arr[e][f].cell.x][a.arr[e][f].cell.y], h = p(d, g), j = g.empty ? "" : g.pseudoRows[c] || "", l = "right" == g.hAlign ? h - j.length : "center" == g.hAlign ? b((h - j.length) / 2) : 0, i = 0; i < l; i++) m += " ";
                for (m += s(j), l = h - j.length - l, i = 0; i < l; i++) m += " ";
                return m;
            }
            function p(a, b) {
                var c, d;
                for (c = a[b.cell.y], d = 1; d < b.cell.colspan; d++) (c += 1), (c += a[b.cell.y + d]);
                return c;
            }
            function q(a, b, c, d) {
                return "none" != b.horizontalInnerHeader && "none" != d && 0 == c && 1 < a.vLen;
            }
            function r(a, b, c) {
                return "none" != b.horizontalInner && c < a.vLen - 1;
            }
            function s(a) {
                return a.replace(/[<>\&]/g, function (a) {
                    return "&#" + a.charCodeAt(0) + ";";
                });
            }
            var t, k, u, v, w = {
                none: { none: { double: { double: "\u2557" } }, double: { none: { double: "\u2550" }, double: { none: "\u2554", double: "\u2566" } } }, double: { none: { none: { double: "\u255D" }, double: { none: "\u2551", double: "\u2563" } }, double: { none: { none: "\u255A", double: "\u2569" }, double: { none: "\u2560", double: "\u256C" } } },
            }, x = { unicode: { double: { vertical: w.double.none.double.none, horizontal: w.none.double.none.double } } }, y = !0, z = "unicode", A = "first_line", B = "none", C = {
                horizontalTop: "double", horizontalInnerHeader: "double", horizontalInner: "double", horizontalBottom: "double", verticalLeft: "double", verticalInnerHeader: "double", verticalInner: "double", verticalRight: "double", asciiIntersection: "plus",
            }, D = c(a, y, A, B), E = (function d(b, c) {
                var e, f, g, h, k, l, a = [], m = [];
                for (f = 0; f < b.hLen; f++) {
                    for (g = 0, c && (g = 1), e = 0; e < b.vLen; e++) (h = b.arr[e][f]), h.empty || (1 == h.cell.colspan && 1 == h.cell.rowspan ? h.maxWidth > g && (g = h.maxWidth) : e == h.cell.x && f == h.cell.y && m.push(h));
                    a[f] = g;
                }
                return a;
            })(D, y), F = (function f(b, c, d, e) {
                var g, k, l, n, o, m, a = [], p = [];
                for (g = 0; g < b.vLen; g++) {
                    for (l = 0, e && (l = 1), k = 0; k < b.hLen; k++)
                        (n = b.arr[b.arr[g][k].cell.x][b.arr[g][k].cell.y]), n.empty || (1 == n.cell.colspan && 1 == n.cell.rowspan ? n.pseudoRows.length > l && (l = n.pseudoRows.length) : g == n.cell.x && k == n.cell.y && p.push(n));
                    a[g] = l;
                }
                return a;
            })(D, C, A, y), G = "";
            for (G += g(D, E, F, w, x, z, A, B, C, -1), t = 0; t < D.vLen; t++) {
                for (v = [], k = 0; k < E.length; k++) v[k] = l(D, F, C, A, t, k);
                for (u = 0; u < F[t]; u++) {
                    for (G += x[z][C.verticalLeft].vertical, k = 0; k < E.length; k++)
                        (G += o(D, v[k] + u, E, t, k)), (k += D.arr[t][k].cell.colspan - 1), "none" != B && 0 == k && 1 < D.hLen ? (G += x[z][C.verticalInnerHeader].vertical) : k < E.length - 1 && (G += x[z][C.verticalInner].vertical);
                    (G += x[z][C.verticalRight].vertical), (G += "\n");
                }
                G += g(D, E, F, w, x, z, A, B, C, t);
            }
            return 0 == D.vLen && (G += g(D, E, F, w, x, z, A, B, C, D.vLen)), G.trim();
        }
        self.postMessage({ type: 'log', message: generateTable(DataTransformer(data)) });
    };

    // Override console.clear to clear the console
    console.clear = () => {
        self.postMessage({ type: 'clear' });
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
            self.postMessage({ type: 'log', message: result, typeOf: typeof result });
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