importScripts('./TableGenerator.js');

// Arbitary Code Executor, Console Overrider & Data Formatter
self.onmessage = function (event) {
    event.data.code = event.data.code.trim();
    const { code, executionID } = event.data;

    // Object to store start times for console.time
    const timers = {};

    // Object to store counts for console.count
    const counts = {};

    // Counter to store group level for console.group
    let level = 0;

    // Formatting functions for different data types
    function JavaScriptObject(obj = {}, indentLevel = 1, format = true, visited = new WeakMap()) {
        if (visited.has(obj)) {
            return `[Circular]`;
        }
        visited.set(obj, true);

        let indent = format ? '\u00A0'.repeat(indentLevel * 4) : '';
        let className = obj.constructor && obj.constructor.name !== 'Object' ? obj.constructor.name : '';

        // Handle special objects like DataView, ArrayBuffer, TypedArrays
        if (obj instanceof DataView) {
            return `DataView {\n${indent}byteLength: ${obj.byteLength},\n${indent}byteOffset: ${obj.byteOffset},\n${indent}buffer: ${JavaScriptObject(obj.buffer, indentLevel + 1, format, visited)}\n${'\u00A0'.repeat((indentLevel - 1) * 4)}}`;
        } else if (ArrayBuffer.isView(obj)) {
            return `${obj.constructor.name}(${obj.length}) [ ${Array.from(obj).join(', ')} ]`;
        } else if (obj instanceof ArrayBuffer) {
            return `ArrayBuffer {\n${indent}[Uint8Contents]: <${Array.from(new Uint8Array(obj)).map(byte => byte.toString(16).padStart(2, '0')).join(' ')}>,\n${indent}byteLength: ${obj.byteLength}\n${'\u00A0'.repeat((indentLevel - 1) * 4)}}`;
        }

        if (Object.getOwnPropertyNames(obj).length === 0 && Object.getOwnPropertySymbols(obj).length === 0) return `${className} {}`.trim();
        let ObjectRepresentation = format ? `${className} {\n` : `${className} { `;
        const keys = [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj).map(symbol => symbol.toString())];
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                let value = obj[key];
                if (typeof value === 'function') {
                    if (className) {
                        continue;
                    } else {
                        value = JavaScriptFunction(value, true, key);
                    }
                } else if (typeof value === 'string') {
                    value = `'${JavaScriptString(value)}'`;
                } else if (typeof value === 'symbol') {
                    value = value.toString();
                } else if (value instanceof Map && value.constructor.name === 'Map') {
                    value = JavaScriptMap(value, indentLevel + 1, format, visited);
                } else if (value instanceof Set && value.constructor.name === 'Set') {
                    value = JavaScriptSet(value, indentLevel + 1, format, visited);
                } else if (obj instanceof WeakMap && value.constructor.name === 'WeakMap') {
                    return JavaScriptWeakMap();
                } else if (obj instanceof WeakSet && value.constructor.name === 'WeakSet') {
                    return JavaScriptWeakSet();
                } else if (Array.isArray(value)) {
                    value = JavaScriptArray(value, indentLevel + 1, format, visited);
                } else if (typeof value === 'object' && value !== null) {
                    value = JavaScriptObject(value, indentLevel + 1, format, visited);
                }
                ObjectRepresentation += format ? `${indent}${key}: ${value},\n` : `${key}: ${value}, `;
            }
        }
        ObjectRepresentation = format ? ObjectRepresentation.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}}` : ObjectRepresentation.slice(0, -2) + ' }';
        return ObjectRepresentation.trim();
    }

    function JavaScriptArray(arr = [], indentLevel = 1, format = !true, visited = new WeakMap()) {
        if (visited.has(arr)) {
            return `[Circular]`;
        }
        visited.set(arr, true);

        if (arr.length === 0) return '[]';
        let indent = format ? '\u00A0'.repeat(indentLevel * 4) : '';
        let ArrayRepresentation = format ? '[\n' : '[';
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i];
            if (typeof value === 'string') {
                value = `'${JavaScriptString(value)}'`;
            } else if (typeof value === 'symbol') {
                value = value.toString();
            } else if (value instanceof Map && value.constructor.name === 'Map') {
                value = JavaScriptMap(value, indentLevel + 1, format, visited);
            } else if (value instanceof Set && value.constructor.name === 'Set') {
                value = JavaScriptSet(value, indentLevel + 1, format, visited);
            } else if (value instanceof WeakMap) {
                value = JavaScriptWeakMap();
            } else if (value instanceof WeakSet) {
                value = JavaScriptWeakSet();
            } else if (Array.isArray(value)) {
                value = JavaScriptArray(value, indentLevel + 1, format, visited);
            } else if (typeof value === 'object' && value !== null) {
                value = JavaScriptObject(value, indentLevel + 1, format, visited);
            } else if (typeof value === 'function') {
                value = JavaScriptFunction(value, true, value.name);
            }
            ArrayRepresentation += format ? `${indent}${value},\n` : `${value}, `;
        }
        ArrayRepresentation = format ? ArrayRepresentation.slice(0, -2) + `\n${'\u00A0'.repeat((indentLevel - 1) * 4)}]` : ArrayRepresentation.slice(0, -2) + ']';
        return ArrayRepresentation.trim();
    }

    function JavaScriptSet(set = new Set(), indentLevel = 1, format = true, visited = new WeakMap()) {
        if (visited.has(set)) {
            return `[Circular]`;
        }
        visited.set(set, true);

        if (set.size === 0) return 'Set(0) {}';
        const values = Array.from(set).map(value =>
            typeof value === 'string' ? `'${value}'`
                : typeof value === 'bigint' ? `${BigInt(value)}n`
                    : value instanceof Map && value.constructor.name === 'Map' ? JavaScriptMap(value, indentLevel + 1, format, visited)
                        : value instanceof Set && value.constructor.name === 'Set' ? JavaScriptSet(value, indentLevel + 1, format, visited)
                            : value instanceof WeakMap ? JavaScriptWeakMap()
                                : value instanceof WeakSet ? JavaScriptWeakSet()
                                    : Array.isArray(value) ? JavaScriptArray(value, indentLevel + 1, format, visited)
                                        : typeof value === 'object' ? JavaScriptObject(value, indentLevel + 1, format, visited)
                                            : typeof value === 'function' ? JavaScriptFunction(value, true, value.name)
                                                : value.toString()
        ).join(', ');
        return `Set(${set.size}) { ${values} }`;
    }

    function JavaScriptMap(map = new Map(), indentLevel = 1, format = true, visited = new WeakMap()) {
        if (visited.has(map)) {
            return `[Circular]`;
        }
        visited.set(map, true);

        if (map.size === 0) return 'Map(0) {}';
        const entries = Array.from(map).map(([key, value]) => {
            const formatData = (value) =>
                typeof value === 'string' ? `'${value}'`
                    : typeof value === 'bigint' ? `${BigInt(value)}n`
                        : value instanceof Map && value.constructor.name === 'Map' ? JavaScriptMap(value, indentLevel + 1, format, visited)
                            : value instanceof Set && value.constructor.name === 'Set' ? JavaScriptSet(value, indentLevel + 1, format, visited)
                                : value instanceof WeakMap ? JavaScriptWeakMap()
                                    : value instanceof WeakSet ? JavaScriptWeakSet()
                                        : Array.isArray(value) ? JavaScriptArray(value, indentLevel + 1, format, visited)
                                            : typeof value === 'object' ? JavaScriptObject(value, indentLevel + 1, format, visited)
                                                : typeof value === 'function' ? JavaScriptFunction(value, true, value.name)
                                                    : value.toString()
            key = formatData(key);
            value = formatData(value);
            return `${key} => ${value}`;
        }).join(', ');
        return `Map(${map.size}) { ${entries} }`;
    }

    function JavaScriptWeakSet() {
        return 'WeakSet { <items unknown> }';
    }

    function JavaScriptWeakMap() {
        return 'WeakMap { <items unknown> }';
    }

    function JavaScriptString(str = '') {
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

    function JavaScriptNumber(num = Number()) {
        return Number(num).toString();
    }

    function JavaScriptBoolean(bool = Boolean()) {
        return Boolean(bool).toString();
    }

    function JavaScriptBigInt(num = BigInt()) {
        return `${BigInt(num)}n`;
    }

    function JavaScriptFunction(fn = Function(), isMinimal = false, symbol) {
        if (!isMinimal) return fn.toString();
        const FunctionName = symbol || "(anonymous)";
        return `[${fn.constructor.name}${FunctionName === "(anonymous)" ? "" : ":"} ${FunctionName}]`;
    }

    // Master message handler to process different types of messages
    function masterConsoleHandler(consoleMethod, ...args) {
        let messages = args.map(arg => {
            let message;
            switch (true) {
                case typeof arg === 'string' && arg.constructor.name === 'String':
                    message = JavaScriptString(arg);
                    break;
                case typeof arg === 'bigint' && arg.constructor.name === 'BigInt':
                    message = JavaScriptBigInt(arg);
                    break;
                case typeof arg === 'number' && arg.constructor.name === 'Number':
                    message = JavaScriptNumber(arg);
                    break;
                case typeof arg === 'boolean' && arg.constructor.name === 'Boolean':
                    message = JavaScriptBoolean(arg);
                    break;
                case typeof arg === 'function' && arg instanceof Function && (arg.constructor.name === 'Function' || arg.constructor.name === 'AsyncFunction'):
                    message = JavaScriptFunction(arg);
                    break;
                case arg instanceof Set && arg.constructor.name === 'Set':
                    message = JavaScriptSet(arg);
                    break;
                case arg instanceof Map && arg.constructor.name === 'Map':
                    message = JavaScriptMap(arg);
                    break;
                case arg instanceof WeakMap && arg.constructor.name === 'WeakMap':
                    message = JavaScriptWeakMap();
                    break;
                case arg instanceof WeakSet && arg.constructor.name === 'WeakSet':
                    message = JavaScriptWeakSet();
                    break;
                case Array.isArray(arg) && arg instanceof Array && arg.constructor.name === 'Array':
                    message = JavaScriptArray(arg);
                    break;
                case arg !== null && typeof arg === 'object' && arg instanceof Object:
                    message = JavaScriptObject(arg);
                    break;
                default:
                    message = arg.toString();
                    break;
            }
            return message;
        }).join(' ');
        messages = '\u00A0'.repeat(level * 2) + messages.replace(/\u000A/g, '\u000A' + '\u00A0'.repeat(level * 2));
        return { type: consoleMethod, message: messages, method: String(`(() => { return console['${consoleMethod}'] })`), executionID };
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
            self.postMessage({ type: 'log', message: [message, ...args].join(' '), method: String(() => { return console.timeLog }), executionID });
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: String(() => { return console.timeLog }), executionID });
        }
    };

    // Override console.timeEnd to end the timer and log the elapsed time
    console.timeEnd = (label = 'default', ...args) => {
        if (timers[label]) {
            const elapsed = performance.now() - timers[label];
            const message = `${label}: ${+elapsed.toFixed(3)}ms`;
            self.postMessage({ type: 'log', message: [message, ...args].join(' '), method: String(() => { return console.timeEnd }), executionID });
            delete timers[label]; // Remove the timer
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: String(() => { return console.timeEnd }), executionID });
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
        self.postMessage({ type: 'log', message: message, method: String(() => { return console.count }), executionID });
    };

    // Override console.countReset to reset the count for a label
    console.countReset = (label = 'default') => {
        if (counts[label]) {
            counts[label] = 0;
        } else {
            const errorMessage = `No such label: ${label}`;
            self.postMessage({ type: 'error', message: errorMessage, method: String(() => { return console.countReset }), executionID });
        }
    };

    // Override console.assert to log an error message if the assertion is false
    console.assert = (condition, ...args) => {
        if (!condition) {
            const message = `Assertion failed: ${args.join(' ')}`;
            self.postMessage({ type: 'error', message: message, method: String(() => { return console.assert }), executionID });
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
        level++;
    };

    // Override console.groupEnd to reduce indentation level
    console.groupEnd = () => {
        level--;
    };

    // Override console.groupCollapsed to log indented message
    console.groupCollapsed = () => {
        level++;
    };

    // Override console.dir to log an object with its properties
    console.dir = (obj) => {
        function directoryStructure(obj, indentLevel = 1) {
            let indent = '\u00A0'.repeat(indentLevel * 4); // 4 spaces per level
            let formatted = '';
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    formatted += JavaScriptArray(obj, 0, false);
                } else {
                    // Regular object, format its properties
                    formatted += 'Object';
                    let isFirstProperty = true;
                    for (let key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            if (isFirstProperty) {
                                formatted += '\n'; // Add newline after the first property
                                isFirstProperty = false;
                            }
                            let value = obj[key];
                            if (value instanceof Set) {
                                formatted += `${indent}${key}: ${JavaScriptSet(value)}\n`;
                            } else if (value instanceof Map) {
                                formatted += `${indent}${key}: ${JavaScriptMap(value)}\n`;
                            } else if (value instanceof WeakMap) {
                                formatted += `${indent}${key}: ${JavaScriptWeakMap()}\n`;
                            } else if (value instanceof WeakSet) {
                                formatted += `${indent}${key}: ${JavaScriptWeakSet()}\n`;
                            } else if (value instanceof ArrayBuffer || value instanceof DataView) {
                                formatted += `${indent}${key}: ${JavaScriptObject(value)}\n`;
                            } else if (typeof value === 'object' && value !== null) {
                                formatted += `${indent}${key}: ${directoryStructure(value, indentLevel + 1)}\n`;
                            } else if (typeof value === 'function') {
                                formatted += `${indent}${key}: ${JavaScriptFunction(value, true, key)}\n`;
                            } else if (typeof value === 'string') {
                                formatted += `${indent}${key}: '${value}'\n`;
                            } else {
                                formatted += `${indent}${key}: ${value.toString()}\n`;
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
        self.postMessage({ type: 'log', message: directoryStructure(obj), method: String(() => { return console.dir }), executionID }); // Post message back to the main thread
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
            const hasPrimitives = Object.keys(data).some(key => typeof data[key] !== 'object');
            const result = Array.from({ length: maxHeight + 1 }, () =>
                Array.from({ length: maxWidth + (hasPrimitives ? 2 : 1) }, () => null)
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
            function formatData(value, key) {
                if (typeof value === 'string') return `'${value}'`;
                if (typeof value === 'number') return value.toString();
                if (typeof value === 'boolean') return value.toString();
                if (typeof value === 'bigint') return `${value}n`;
                if (typeof value === 'symbol') return value.toString();
                if (typeof value === 'function') return JavaScriptFunction(value, true, key);
                if (Array.isArray(value)) return JavaScriptArray(value);
                if (value instanceof Set) return JavaScriptSet(value);
                if (value instanceof Map) return JavaScriptMap(value);
                if (value instanceof WeakSet) return JavaScriptWeakSet(value);
                if (value instanceof WeakMap) return JavaScriptWeakMap(value);
                if (typeof value === 'object' && value !== null) return JavaScriptObject(value);
                return String(value);
            }

            if (maxHeight !== 0) {
                result[0][0] = '(index)';
                if (hasPrimitives) result[0][1] = 'Value';
            }

            const { primitives, arrays, objects } = sortData(data);
            let rowIndex = 1;

            // Process primitives (non-object values)
            if (hasPrimitives) {
                Object.keys(primitives).forEach(key => {
                    result[rowIndex][0] = key;
                    result[rowIndex][1] = formatData(primitives[key], key);
                    rowIndex++;
                });
            }

            // Process arrays
            Object.keys(arrays).forEach(key => {
                result[rowIndex][0] = key;
                arrays[key].forEach((item, index) => {
                    if (result[0][hasPrimitives ? index + 2 : index + 1] === null) {
                        result[0][hasPrimitives ? index + 2 : index + 1] = index + 1;
                    }
                    result[rowIndex][hasPrimitives ? index + 2 : index + 1] = formatData(item, key);
                });
                rowIndex++;
            });

            // Process objects
            Object.keys(objects).forEach(key => {
                result[rowIndex][0] = key;
                const object = objects[key];
                [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object).map(symbol => symbol.toString())].forEach(objectKey => {
                    let headerIndex = header.get(objectKey) || result[0].indexOf(null);
                    if (headerIndex === -1) {
                        headerIndex = result[0].length;
                        result[0][headerIndex] = objectKey;
                    } else {
                        result[0][headerIndex] = result[0][headerIndex] || objectKey;
                    }
                    header.set(objectKey, headerIndex);
                    result[rowIndex][headerIndex] = formatData(object[objectKey], objectKey);
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

        self.postMessage({ type: 'log', method: String(() => { return console.table }), message: TableGenerator(DataTransformer(data), 'HTML'), executionID });
    };

    // Override console.clear to clear the console
    console.clear = () => {
        self.postMessage({ type: 'clear', method: String(() => { return console.clear }), executionID });
    };

    try {
        performance.mark('executionStarted'); // Mark the start of execution

        self.postMessage({ executionStatus: 'executionStarted' }); // Notify that execution has started

        const result = Function(code)();

        if (result !== undefined) {
            self.postMessage({ type: 'log', message: result, method: String(() => { return globalThis.Function }), executionID });
        }
    } catch (error) {
        let errorMessage = `Uncaught ${error.constructor.name}: ${error.message}\n\nStack Trace: ${error.stack}`;
        self.postMessage({ type: 'error', message: errorMessage, method: String(() => { return globalThis.Function }), executionID });
    } finally {
        performance.mark('executionEnded'); // Mark the end of execution
        performance.measure('Execution Time', 'executionStarted', 'executionEnded'); // Measure the execution time
        self.postMessage({
            executionStatus: 'executionEnded',
            executionTime: performance.getEntriesByName('Execution Time')[0].duration
        }); // Notify that execution has ended and post the execution time
    }
};