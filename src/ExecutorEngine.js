self.onmessage = function (event) {
    const code = event.data; // The code to be evaluated is passed in event.data

    // Store the original console methods
    const consoleLog = console.log;
    const consoleWarn = console.warn;
    const consoleError = console.error;
    const consoleTime = console.time;
    const consoleTimeLog = console.timeLog;
    const consoleTimeEnd = console.timeEnd;
    const consoleAssert = console.assert;
    const consoleInfo = console.info;

    // Object to store start times for console.time
    const timers = {};

    // Override console.log to also post messages back to the main thread
    function JavaScriptObject(obj) {
        let formatted = '{ ';
        for (let key in obj) {
            let value = obj[key];
            if (typeof value === 'string') {
                value = `'${value}'`;
            }
            formatted += `${key}: ${value}, `;
        }
        formatted = formatted.slice(0, -2) + ' }';
        return formatted;
    }

    console.log = (...args) => {
        consoleLog.apply(console, args);
        args.forEach(arg => {
            let message;
            switch (typeof arg) {
                case 'object':
                    message = JavaScriptObject(arg);
                    break;
                case 'string':
                    message = `'${arg}'`;
                    break;
                default:
                    message = arg;
                    break;
            }
            self.postMessage({ type: 'log', message: message, typeOf: typeof arg });
        });
    };

    // Override console.warn to also post messages back to the main thread
    console.warn = (...args) => {
        consoleWarn.apply(console, args);
        self.postMessage({ type: 'warn', message: args.join(' ') });
    };

    // Override console.error to also post messages back to the main thread
    console.error = (...args) => {
        consoleError.apply(console, args);
        self.postMessage({ type: 'error', message: args.join(' ') });
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
            consoleLog.apply(console, [message, ...args]);
            self.postMessage({ type: 'log', message: [message, ...args].join(' ') });
        } else {
            const errorMessage = `No such label: ${label}`;
            consoleError.apply(console, [errorMessage]);
            self.postMessage({ type: 'error', message: errorMessage });
        }
    };

    // Override console.timeEnd to end the timer and log the elapsed time
    console.timeEnd = (label = 'default', ...args) => {
        if (timers[label]) {
            const elapsed = performance.now() - timers[label];
            const message = `${label}: ${+elapsed.toFixed(3)}ms - timer ended`;
            consoleLog.apply(console, [message, ...args]);
            self.postMessage({ type: 'log', message: [message, ...args].join(' ') });
            delete timers[label]; // Remove the timer
        } else {
            const errorMessage = `No such label: ${label}`;
            consoleError.apply(console, [errorMessage]);
            self.postMessage({ type: 'error', message: errorMessage });
        }
    };

    // Override console.assert to log an error message if the assertion is false
    console.assert = (condition, ...args) => {
        if (!condition) {
            const message = `Assertion failed: ${args.join(' ')}`;
            consoleError.apply(console, [message]);
            self.postMessage({ type: 'error', message });
        }
    };

    // Override console.info to log an informational message
    console.info = (...args) => {
        consoleLog.apply(console, args); // Use console.log's underlying functionality
        self.postMessage({ type: 'info', message: args.join(' ') });
    };

    try {
        self.postMessage({ executionStatus: 'executionStarted' }); // Notify that execution has started

        const result = eval(code); // Evaluate the received code

        // If the result is not undefined, post it back as a log message
        if (result !== undefined) {
            self.postMessage({ type: 'log', message: result, typeOf: typeof result });
        }
        if (result === undefined) {
            self.postMessage({ type: 'log', message: 'undefined', typeOf: 'undefined' });
        }
        if (result === '') {
            self.postMessage({ type: 'log', message: '‎', typeOf: 'string' });
        }
    } catch (error) {
        // Determine error type and post the error message back
        const errorType = error instanceof SyntaxError ? "Syntax Error" : "Runtime Error";
        self.postMessage({ type: 'error', message: `${errorType}: ${error.message}` });
    } finally {
        // Restore original console methods
        console.log = consoleLog;
        console.warn = consoleWarn;
        console.error = consoleError;
        console.time = consoleTime;
        console.timeLog = consoleTimeLog;
        console.timeEnd = consoleTimeEnd;
        console.assert = consoleAssert;
        console.info = consoleInfo;

        self.postMessage({ executionStatus: 'executionEnded' }); // Notify that execution has ended
    }
};