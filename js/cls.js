//@ts-check
import takeRecords from '../utils/takeRecords.js';
import {CLS_FACTOR} from '../utils/constants.js';
import {closestId, closestContainer} from '../utils/utils.js';

const entryType = 'layout-shift';

/**
 * @typedef {Object} LayoutShiftAttribution
 * @property {Node} [node]
 * @property {DOMRectReadOnly} currentRect;
 * 
 * @typedef {Object} LayoutShiftType
 * @property {number} startTime
 * @property {number} value
 * @property {boolean} hadRecentInput;
 * @property {Array<LayoutShiftAttribution>} sources
 * 
 * @typedef {LayoutShiftType & PerformanceEntry} LayoutShift
 * 
 * @typedef {Object} LayoutShiftResult
 * @property {number} cls
 * @property {number} countCls
 * @property {string} [clsId]
 * @property {string} [clsTag]
 * @property {Element} [element]
 */

/**
 * Get CLS attributes
 * @param {import('../utils/utils.js').State} state
 * @param {boolean} [getElement]
 * @returns {LayoutShiftResult}
 */
export default function cls([, , PerformanceObserver], getElement) {
    const entries = takeRecords(PerformanceObserver, entryType);
    if (!entries) {
        return;
    }

    const [cls, countCls, map] = /** @type {Array<LayoutShift>} */(entries)
        .filter(({hadRecentInput}) => !hadRecentInput)
        .map(({sources = [], value}) => {
            const {node} = sources.reduce((acc, {node, currentRect: {width, height}}) => {
                const area = width * height;
                if (area < acc.area) {
                    return acc;
                }
                return {
                    area,
                    node
                };
            }, {area: -1, node: null});
            return [
                node,
                value
            ];
        })
        .reduce(([cls, countCls, map], [node, value]) => {
            if (node) {
                map.set(node, value + (map.get(node) || 0));
            }
            return [
                cls + value,
                ++countCls,
                map   
            ];
        }, [0, 0, new Map()]);

    const nodes = [];
    for (const entry of map.entries()) {
        nodes.push(entry);
    }
    nodes.sort((a, b) => b[1] - a[1]);

    const result = {
        cls: cls * CLS_FACTOR,
        countCls
    };
    if (nodes.length) {
        let node = /** @type {Element} */(nodes[0][0]);
        if (node?.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentElement;
        }
        if (getElement && node) {
            result.element = closestContainer(node);
        }
        const cid = closestId(node);
        if (cid) {
            result.clsId = cid;
        }
        const {tagName} = node;
        if (tagName) {
            result.clsTag = tagName;
        }
    }
    return result;
}
