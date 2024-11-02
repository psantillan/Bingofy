// static/js/logger.js
const DEBUG = true;

function logDebug(context, data) {
    if (!DEBUG) return;
    console.group(`🔍 ${context}`);
    console.log(data);
    console.groupEnd();
}

function logError(context, error) {
    console.error(`🚨 Error in ${context}:`, {
        message: error.message,
        stack: error.stack,
        context: error
    });
}