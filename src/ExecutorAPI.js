class Executor {
    constructor(URL, options = { ESM, TS, codeFormatting: Babel }) {
        this.URL = URL || 'https://runkit.netlify.app/src/Executor.min.js';
        this.codeFormatting = options.codeFormatting || false;
        this.ESM = options.ESM || false;
        this.TS = options.TS || false;
        this.Babel = options.Babel || 'https://unpkg.com/@babel/standalone/babel.min.js';
        this.ExecutorWorker = new Worker(this.URL);
        this.isExecuting = false;
    }

    initiateExecution(code) {
        this.isExecuting = true;
        this.ExecutorWorker.postMessage({ code, ESM: this.ESM, TS: this.TS, codeFormatting: this.codeFormatting, Babel: this.Babel });
    }

    handleResults(callback = data => console.log(data)) {
        this.ExecutorWorker.onmessage = function (event) {
            this.isExecuting = false;
            callback(event.data);
        };
    }

    handleError(callback = error => console.error(error)) {
        this.ExecutorWorker.onerror = function (error) {
            this.isExecuting = false;
            callback(error);
        };
    }

    terminateExecution() {
        this.isExecuting ? (this.ExecutorWorker.terminate(), this.isExecuting = false) : console.error('No ongoing execution to terminate');
    }

    updateOptions(options) {
        this.codeFormatting = options.codeFormatting || this.codeFormatting;
        this.ESM = options.ESM || this.ESM;
        this.TS = options.TS || this.TS;
        this.Babel = options.Babel || this.Babel;
        return { codeFormatting: this.codeFormatting, ESM: this.ESM, TS: this.TS, Babel: this.Babel };
    }

    executionStatus() {
        return this.isExecuting;
    }
}
