'use strict';

(function () {

    const MAX_CODE_RUN_MILLIS = 3000;
    const DEBOUNCE_MILLIS = 1000;

    // create the sandbox iframe
    const sandbox = document.createElement("iframe");
    sandbox.src = "sandbox.html"
    sandbox.sandbox = 'allow-scripts allow-same-origin'
    sandbox.style = "display:none";
    document.body.appendChild(sandbox);


    /**
     * Limit the time needed to evaluate a piece of code
     * to prevent infinite loops. Sadly a side effect of this
     * is that the debugger will not work.     
     * 
     * How this works:
     * 1. Create a new worker
     * 2. We send the code to the worker.
     * 3. Worker sends back a first message (with id+1) signaling that is starting evaluation
     * 4. We init a timeout
     * 5. a. Worker sends a second message (with id) indicating all good
     *    b. Worker is blocked and doesn't sends a second message, timeout expires 
     *       and we consider that the worker is caught up in an infinite loop
     * 6. Terminate worker and call callback with result 
     */
    const limitEval = (code, imports, callback, codeEvaluationTimeout = 1000) => {
        let id = Math.floor(performance.now());

        const formatedImports = imports.map(i => `"${i}"`);
        let blobImports = imports.length > 0 ? `importScripts(${formatedImports.join(',')})` : '';

        const blob = new Blob(
            [`
                ${blobImports}

                onmessage = a => {     
                    const { id, code } = a.data;

                    // signal start
                    postMessage({ id: id + 1 });

                    try {
                        let r = eval.call(this, code);
                        if(r instanceof Promise) {
                            r.then(() => postMessage({id}))
                             .catch(() => postMessage({id}))
                        } else {
                            postMessage({id})
                        }                                              
                    }
                    catch(e) { postMessage({id}) }
                };

                // hide console output from worker     
                console.log = () => {}           
                console.time = () => {}    
                console.timeEnd = () => {}               
                console.warn = () => {}               
                console.error = () => {}     
            `],
            { type: 'text/javascript' }
        );


        // create worker with the above blob that will receive 
        // dynamic code through postMessage
        const worker = new Worker(URL.createObjectURL(blob));

        // listen for worker messages            
        worker.onmessage = e => {
            const wrkrId = e && e.data && e.data.id;
            if (wrkrId === id) onDone(true) // all good, message received
            else if (wrkrId === id + 1) { // start signal id
                // if id not reset till now it means that the code evaluation 
                // is not done so we force stop it!
                setTimeout(() => id && onDone(false), codeEvaluationTimeout);
            }
        };

        // called when the worker is done with the code evaluation
        const onDone = result => {
            id = 0; // reset id to flag message received
            worker.terminate();
            URL.revokeObjectURL(blob);
            callback && callback.call(null, result);
        };


        // give worker the code to evaluate
        worker.postMessage({ code, id });
    }


    let timer, callbackRef;

    /**
     * Code is evaluated twice.
     * First in a worker to see if it has an infinite loop or not.
     * Second in the sandbox frame.
     * 
     * @param {*} code 
     * @param {*} callback 
     */
    const evaluateCode = (code, imports = [], callback) => {
        callbackRef = callback;

        // import in iframe
        sandbox.contentWindow.postMessage({ imports }, '*');

        clearTimeout(timer);
        timer = setTimeout(() => {
            limitEval(code, imports, function (success, returnValue) {
                console.clear();
                if (success) {
                    // do code evaluation in the sandbox frame
                    // since now we know is not an infinite loop
                    sandbox.contentWindow.postMessage({ code }, '*');
                }
                else {
                    console.warn('The code takes too long to run. Is there an infinite loop?');
                }
            }, MAX_CODE_RUN_MILLIS);
        }, DEBOUNCE_MILLIS)
    }

    window.addEventListener('message', e => {
        callbackRef && callbackRef.call(null, e.data);
    });

    // export 
    window.evaluateCode = evaluateCode;
}())