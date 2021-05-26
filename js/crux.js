//@ts-check
import takeRecords from '../utils/takeRecords.js';
import {getPn} from './pages.js';
import {entryType as lcpEntryType, lcpResult} from './lcp.js';
import cls from './cls.js';

const entryType = 'crux';

let helpers;

/**
 * Compute LCP and CLS as close as possible to CrUX
 * @param {import('../utils/utils.js').State} state
 * @param {Promise<{startTime: number}>} visibility
 */
export default function crux(state, visibility) {
    const [, , PerformanceObserver] = state;

    helpers = {
        cls: () => cls(state, true),
        lcp: () => {
            const entries = /** @type {Array<import('./lcp.js').LargestContentfulPaint>} */(takeRecords(PerformanceObserver, lcpEntryType));
            return entries?.pop();
        }
    };

    return visibility.then(({startTime}) => {
        const clsValue = cls(state);
        const lcpValue = lcpResult(helpers.lcp());
        return {
            ...clsValue,
            ...lcpValue,
            entryType,
            startTime,
            pn: getPn()
        };
    });
}

/**
 * @template T
 * @param {T} target
 * @returns {T}
 */
export function addGetters(target) {
    /** @type {PropertyDescriptorMap} */
    const map = {};
    addProp('lcp');
    addProp('cls');
    return Object.defineProperties(target, map);

    function addProp(prop) {
        map[prop] = {
            value: () => helpers?.[prop]()?.element
        };
    }
}
