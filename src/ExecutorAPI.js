class Executor {
    constructor(URL, options = { TS: false, formatLogs: false }) {
        this.URL = URL || 'https://runkit.netlify.app/src/Executor.min.js';
        this.formatLogs = options.formatLogs || false;
        this.ESM = options.ESM || false;
        this.TS = options.TS || false;
        this.BabelURL = options.BabelURL || 'https://unpkg.com/@babel/standalone/babel.min.js';
        this.ExecutorWorker = new Worker(this.URL);
        this.isExecuting = false;
    }

    execute = (code, callback) => {
        !this.isExecuting ? (
            this.isExecuting = true,
            this.ExecutorWorker.postMessage({ code, TS: this.TS, formatLogs: this.formatLogs }),
            this.ExecutorWorker.onmessage = (event) => {
                this.isExecuting = false;
                event.data.method ? callback(event.data, null) : null;
            },
            this.ExecutorWorker.onerror = (error) => {
                this.isExecuting = false;
                callback(null, error);
            }
        ) : console.error('Another exeution ongoing! Wait until ongoing executions ends!');
    }

    terminateExecution = () => {
        this.isExecuting
            ? (this.ExecutorWorker.terminate(), this.isExecuting = false)
            : console.error('No ongoing execution to terminate');
    }

    setOptions = ({ ESM, TS, formatLogs, BabelURL }) => {
        this.ESM = ESM !== undefined ? ESM : this.ESM;
        this.TS = TS !== undefined ? TS : this.TS;
        this.formatLogs = formatLogs !== undefined ? formatLogs : this.formatLogs;
        this.BabelURL = BabelURL !== undefined ? BabelURL : this.BabelURL;
        return { formatLogs: this.formatLogs, TS: this.TS };
    }

    getOptions = () => ({ formatLogs: this.formatLogs, TS: this.TS });

    terminate = () => {
        this.ExecutorWorker.terminate();
        const keys = Object.keys(this);
        for (let i = 0; i < keys.length; i++) {
            delete this[keys[i]];
        }
    }
}