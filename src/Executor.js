self.onmessage = function (event) {
    const code = event.data;
    const consoleLog = console.log;
    console.log = (...args) => {
        consoleLog.apply(console, args);
        self.postMessage({ type: 'log', message: args.join(' ') });
    };
    try {
        self.postMessage({ executionStatus: 'executionStarted' }); // Send a message indicating that the execution has started
        const result = eval(code);
        if (result !== undefined) {
            self.postMessage({ type: 'log', message: String(result) });
        }
    } catch (error) {
        const errorType = error instanceof SyntaxError ? "Syntax Error" : "Runtime Error";
        self.postMessage({ type: 'error', message: `${errorType}: ${error.message}` });
    } finally {
        console.log = consoleLog;
        self.postMessage({ executionStatus: 'executionEnded' }); // Send a message indicating that the execution has ended
    }
};