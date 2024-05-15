// States & Variables
let Executor; // Variable to store the Web Worker
var importedLibrary; // Variable to store imported library code
var isExecuting = false; // Variable to store the execution status

// UI Elements
var runButton = document.querySelector('button.button.primary-button.run-button');
var stopButton = document.querySelector('button.button.primary-button.stop-button');
var clearButton = document.querySelector('button.button.clear-button');
const fileInput = document.querySelector('input[type="file"]');
const consoleDiv = document.getElementById('console');

// Initialize Monaco
var editor = monaco.editor.create(document.getElementById('editor'), {
    value: ['// Your JavaScript Code Here!'].join('\n'),
    language: 'javascript',
    minimap: { enabled: false },
    acceptSuggestionOnEnter: 'smart',
    autoClosingBrackets: 'always',
    autoClosingComments: 'always',
    autoIndent: 'advanced',
    quickSuggestions: true,
    formatOnType: true,
    formatOnPaste: true,
    automaticLayout: true,
    parameterHints: { enabled: true },
    highlightActiveBracketPair: true,
    lineNumbersMinChars: 2,
    fontFamily: "JetBrains Mono",
    stickyScroll: { enabled: false },
});

// Function to execute the code in the editor
function executeCode() {
    if (importedLibrary !== undefined) {
        var code = importedLibrary + '\n' + editor.getValue(); // Get code from Imported File & Monaco editor
    }
    else {
        var code = editor.getValue(); // Get code from Imported File & Monaco editor
    }
    clearConsole();
    isExecuting = true;
    runButton.disabled = true;
    stopButton.disabled = false;
    // Create a new Web Worker
    Executor = new Worker('/src/ExecutorEngine.js');
    // Set up a message handler to receive the results
    Executor.onmessage = function (event) {
        const { type, message, executionStatus } = event.data;
        logToConsole(message, type);
        // If the worker has started executing the code, disable the runButton
        if (executionStatus === 'executionStarted') {
            isExecuting = true;
            runButton.disabled = true;
            stopButton.disabled = false;
        }
        // If the worker has finished executing the code, enable the runButton
        if (executionStatus === 'executionEnded') {
            isExecuting = false;
            runButton.disabled = false;
            stopButton.disabled = true;
        }
    };
    // Send the code to the Executor for execution
    Executor.postMessage(code);
    Executor.onerror = function (error) {
        logToConsole('Worker Error: ' + error.message, 'error');
        isExecuting = false;
        runButton.disabled = false;
        stopButton.disabled = true;
    };
};

runButton.addEventListener('click', executeCode);

stopButton.disabled = true; // Disable the stop button by default

// Function to stop the code execution
function stopExecution() {
    if (Executor !== undefined) {
        isExecuting = false;
        Executor.terminate(); // Terminate the Executor and log a message to the console
        runButton.disabled = false;
        stopButton.disabled = true;
        logToConsole('Code execution stopped by the user', 'error');
    }
};

stopButton.addEventListener('click', stopExecution);

// Function to add messages to the console
function logToConsole(message, type) {
    const consoleDiv = document.getElementById('console');
    const messageElement = document.createElement('div');
    messageElement.classList.add('console-message', type);
    messageElement.textContent = message;
    consoleDiv.appendChild(messageElement);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
};

// Function to clear all console messages
function clearConsole() {
    consoleDiv.innerHTML = '';
};

// Function to show/hide the console
function displayConsole(typeExecute) {
    var playground = document.getElementsByClassName('playground')[0];
    var console = document.getElementsByClassName('playground-console')[0];
    var downloadButton = document.getElementsByClassName('download-button')[0];
    var clearButton = document.getElementsByClassName('clear-button')[0];
    var displayConsole = window.getComputedStyle(console).display;
    if (typeExecute) {
        displayConsole = console.style.display = 'block';
        clearButton.style.display = 'block';
        playground.style.width = 'calc(50vw - 22.5px)';
        localStorage.setItem('consoleState', 'block');
    } else {
        if (displayConsole === 'none') {
            console.style.display = 'block';
            clearButton.style.display = 'block';
            playground.style.width = 'calc(50vw - 22.5px)';
            downloadButton.style.left = 'calc(50vw - 65px)';
            localStorage.setItem('consoleState', 'block');
        } else {
            console.style.display = 'none';
            clearButton.style.display = 'none';
            playground.style.width = 'calc(100vw - 30px)';
            downloadButton.style.left = 'calc(100vw - 122.65px)';
            localStorage.setItem('consoleState', 'none');
        }
    }
}

// Call this function on page load to set the console state
window.onload = function () {
    var consoleState = localStorage.getItem('consoleState');
    if (consoleState) {
        var playground = document.getElementsByClassName('playground')[0];
        var console = document.getElementsByClassName('playground-console')[0];
        var clearButton = document.getElementsByClassName('clear-button')[0];
        var downloadButton = document.getElementsByClassName('download-button')[0];
        console.style.display = consoleState;
        clearButton.style.display = consoleState;
        playground.style.width = consoleState === 'none' ? 'calc(100vw - 30px)' : 'calc(50vw - 22.5px)';
        downloadButton.style.left = consoleState === 'none' ? 'calc(100vw - 122.65px)' : 'calc(50vw - 65px)';
    }
};

// IIFE to import library
(function () {
    function importLibrary() {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            fileToPlainText(file)
                .then(PlainText => {
                    importedLibrary = PlainText;
                    logToConsole('File Imported Successfully', 'msg');
                });
        });
    };
    importLibrary();
})();

// Helper function to convert a file to plain text
function fileToPlainText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const plainText = reader.result;
            resolve(plainText);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

// Function to handle keyboard shortcuts

// Execute code on pressing Ctrl + Enter
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'Enter') {
        executeCode();
    }
});

// Stop execution on pressing Ctrl + Escape
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'Escape') {
        stopExecution();
    }
});

// Save the code in the editor to a localstorage upon detecting a change in the editor
window.editor.getModel().onDidChangeContent((event) => {
    localStorage.setItem('code', editor.getValue());
});

// Load the code from the localstorage
function loadCode() {
    var localStorageCode = localStorage.getItem('code');
    if (localStorageCode !== null && localStorageCode !== '') {
        editor.setValue(localStorageCode);
    }
    else {
        editor.setValue('// Write your JavaScript code here\n');
    }
};

document.addEventListener('DOMContentLoaded', loadCode);

// Save the code in the editor to a file

// Constants
const fileName = 'Script.js';
const mimeType = 'application/javascript';
const charset = 'utf-8';

// Function to create a hidden link
function createHiddenLink(codeToSave) {
    const hiddenLink = document.createElement('a');
    hiddenLink.style.display = 'none';
    hiddenLink.href = `data:${mimeType};charset=${charset},${encodeURIComponent(codeToSave)}`;
    hiddenLink.download = fileName;
    return hiddenLink;
}

// Function to trigger the download
function triggerDownload(hiddenLink) {
    document.body.appendChild(hiddenLink);
    hiddenLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    hiddenLink.remove(); // Remove the link immediately after click
}

function saveCodeToFile() {
    const codeToSave = editor.getValue();
    const hiddenLink = createHiddenLink(codeToSave);
    setTimeout(() => triggerDownload(hiddenLink), 10);
}

// Function to handle the keydown event
function handleKeydown(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
        saveCodeToFile();
    }
}

// Add event listener
document.addEventListener('keydown', handleKeydown, { capture: false, passive: false });