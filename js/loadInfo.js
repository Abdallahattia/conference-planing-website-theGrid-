//@ts-check
/* global process, requirejs */
const INFO_LABEL = 'wix-perf-measure-info';

/**
 * @type {Promise}
 */
let info;
/**
 * Load and execgit statute info helper
 * @param {Window} window 
 * @param {Document} document
 * @param {string} src 
 * @param {Promise[]} measurements 
 */
export default function loadInfo(window, document, src, measurements) {
    Object.defineProperty(measurements, 'info', {
        value() {
            if (typeof process === 'undefined') {
                /** @type {Object} */ (window).process = {env: {}}; // It's OK to leak it for debugging
            }
            if (process.env.NODE_ENV !== 'production') { // removed in production
                if (!info) {
                    info = import('../info.js');
                }
                return info.then(invoke).catch(fail);
            }
            if (!info) {
                info = new Promise((resolve, reject) => {
                    if (!src) {
                        return reject();
                    }
                    const script = document.createElement('script');
                    script.src = src.replace('measure.', 'measure-info.');
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            info.then(() => {
                // @ts-ignore
                if (typeof requirejs === 'function') {
                    // @ts-ignore
                    requirejs([INFO_LABEL], invoke, fail);
                } else {
                    invoke(window[INFO_LABEL]);
                }
            }).catch(fail);

            function invoke(r) {
                if (r) {
                    r.default(measurements);
                } else {
                    fail();
                }
            }
            function fail() {
                console.info('Failed to load info'); // eslint-disable-line no-console
            }
        }
    });
}
