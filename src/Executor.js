self.onmessage = function (event) {
    const code = event.data;
    const consoleLog = console.log;
    console.log = (...args) => {
        consoleLog.apply(console, args);
        self.postMessage({ type: 'log', message: args.join(' ') });
    };
    try {
        const result = eval(code);
        if (result !== undefined) {
            self.postMessage({ type: 'log', message: String(result) });
        }
    } catch (error) {
        const errorType = error instanceof SyntaxError ? "Syntax Error" : "Runtime Error";
        self.postMessage({ type: 'error', message: `${errorType}: ${error.message}` });
    } finally {
        console.log = consoleLog;
    }
};