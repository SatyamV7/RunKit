class Executor {
    constructor(URL, options = { ESM: false, TS: false, codeFormatting: false, BabelURL: null }) {
        this.URL = URL || 'https://runkit.netlify.app/src/Executor.min.js';
        this.codeFormatting = options.codeFormatting || false;
        this.ESM = options.ESM || false;
        this.TS = options.TS || false;
        this.BabelURL = options.BabelURL || 'https://unpkg.com/@babel/standalone/babel.min.js';
        this.ExecutorWorker = new Worker(this.URL);
        this.isExecuting = false;
    }

    execute = (code, callback) => {
        this.isExecuting = true;
        this.ExecutorWorker.postMessage({ code, ESM: this.ESM, TS: this.TS, codeFormatting: this.codeFormatting, BabelURL: this.BabelURL });
        this.ExecutorWorker.onmessage = function (event) {
            this.isExecuting = false;
            event.data.method ? callback(event.data, null) : null;
        };
        this.ExecutorWorker.onerror = function (error) {
            this.isExecuting = false;
            callback(null, error);
        };
    }

    terminateExecution = () => {
        if (this.isExecuting) {
            this.ExecutorWorker.terminate();
            this.isExecuting = false;
        } else {
            console.error('No ongoing execution to terminate');
        }
    }

    setOptions = ({ ESM, TS, codeFormatting, BabelURL }) => {
        this.ESM = ESM !== undefined ? ESM : this.ESM;
        this.TS = TS !== undefined ? TS : this.TS;
        this.codeFormatting = codeFormatting !== undefined ? codeFormatting : this.codeFormatting;
        this.BabelURL = BabelURL !== undefined ? BabelURL : this.BabelURL;
    }

    getOptions = () => { return { codeFormatting: this.codeFormatting, ESM: this.ESM, TS: this.TS, BabelURL: this.BabelURL } };

    terminate = () => {
        this.ExecutorWorker.terminate();
        const keys = Object.keys(this);
        for (let i = 0; i < keys.length; i++) {
            delete this[keys[i]];
        }
    }
}