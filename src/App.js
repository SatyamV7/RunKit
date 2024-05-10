var isExecuting = false; // Flag to track code execution status
var importedLibrary; // Variable to store imported library code

// Initialize CodeMirror
var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    lineNumbers: true,
    mode: 'javascript',
    autofocus: true,
    autoComplete: true,
    smartIndent: true,
    lineWrapping: true
});

editor.setValue('// Write your code here\nconsole.log("Hello, World!");\n');

// Function to execute the code in the editor
function executeCode() {
    if (isExecuting) {
        logToConsole('Code execution is already in progress. Please wait...', 'log');
        return;
    }
    if (importedLibrary !== undefined) {
        var code = importedLibrary + '\n' + editor.getValue(); // Get code from Imported File & CodeMirror editor
    }
    else {
        var code = editor.getValue(); // Get code from Imported File & CodeMirror editor
    }
    isExecuting = true; // Set isExecuting to true when code execution starts

    clearConsole();
    // Create a new Web Worker
    const worker = new Worker('./src/Executor.js');
    // Set up a message handler to receive the results
    worker.onmessage = function (event) {
        const { type, message } = event.data;
        logToConsole(message, type);
        isExecuting = false; // Set isExecuting to false after receiving the message
    };
    // Send the code to the worker for execution
    worker.postMessage(code);
    worker.onerror = function (error) {
        logToConsole('Worker Error: ' + error.message, 'error');
        isExecuting = false; // Set isExecuting to false also on error
    };
};

const fileInput = document.querySelector('input[type="file"]');

(function () {
    function getFile() {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            fileToPlainText(file)
                .then(PlainText => {
                    importedLibrary = PlainText;
                    logToConsole('File Imported Successfully', 'msg');
                });
        });
    };
    getFile();
})();

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
    const consoleDiv = document.getElementById('console');
    consoleDiv.innerHTML = '';
};

// Function to handle keyboard shortcuts
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'Enter') {
        executeCode();
    }
});

// Constants
const fileName = 'script.js';
const mimeType = 'application/javascript';
const charset = 'utf-8';

// Function to create a hidden link
function createHiddenLink(codeToSave) {
    const hiddenLink = document.createElement('a');
    hiddenLink.style.display = 'none';
    hiddenLink.href = `data:${mimeType};charset=${charset},${encodeURIComponent(codeToSave)}`;
    hiddenLink.target = '_blank';
    hiddenLink.download = fileName;
    return hiddenLink;
}

// Function to trigger the download
function triggerDownload(hiddenLink) {
    document.body.appendChild(hiddenLink);
    hiddenLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    hiddenLink.remove(); // Remove the link immediately after click
}

// Function to handle the keydown event
function handleKeydown(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
        const codeToSave = editor.getValue();
        const hiddenLink = createHiddenLink(codeToSave);
        setTimeout(() => triggerDownload(hiddenLink), 10); // Add the following line to wrap the triggerDownload function in a setTimeout
    }
}

// Add event listener
document.addEventListener('keydown', handleKeydown, { capture: false, passive: false });

function displayConsole(typeExecute) {
    var playground = document.getElementsByClassName('playground')[0];
    var console = document.getElementsByClassName('playground-console')[0];
    var displayConsole = window.getComputedStyle(console).display;
    displayConsole = !typeExecute ? (displayConsole === 'none' ? (console.style.display = 'block', playground.style.width = 'calc(50vw - 22.5px)') : (console.style.display = 'none', playground.style.width = 'calc(100vw - 30px)')) : (displayConsole = console.style.display = 'block', playground.style.width = 'calc(50vw - 22.5px)');
}