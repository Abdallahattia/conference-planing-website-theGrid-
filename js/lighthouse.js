//@ts-check
import {CLS_FACTOR} from '../utils/constants.js';

const weights = [
    0.20, // fcp
    0.33, // lcp
    0.15, // tti
    0.25, // tbt
    0.07  // cls 
];
const desktopCurves = [
    [1600, 799.4643],
    [2400, 883.7075],
    [4500, 2000.0009],
    [350, 90.5512],
    [0.25, 0.05435]
];
const mobileCurves = [
    [4000, 2000.2137],
    [4000, 2251.6873],
    [7300, 2900.1506],
    [600, 200.631],
    [0.25, 0.05435]
];

const {round, log, exp, sqrt, abs, SQRT2} = Math;

/**
 * @typedef {Object} WindowEx
 * @property {Object} [viewerModel]
 * @property {Object} [publicModel]
 */

/**
 * Get Lighthouse score
 * @param {import('../utils/utils.js').State} state
 * @param {number} fcp
 * @param {{tti: number, tbt: number, lcp: number, cls: number}} metrics
 */
export default function lighthouse([window], fcp, {tti, tbt, lcp, cls}) {
    const w = /** @type {WindowEx} */ (window);
    const deviceClass = w.viewerModel?.deviceInfo.deviceClass || w.publicModel?.deviceInfo.deviceType;
    const isMobile = deviceClass ? deviceClass === 'Smartphone' : isMobileDevice(window);
    const result = {
        isMobile
    };
    if (fcp + tti + tbt + lcp + cls >= 0) {
        const curves = isMobile ? mobileCurves: desktopCurves;
        const score = getScore(curves, [
            fcp,
            lcp,
            tti,
            tbt,
            cls / CLS_FACTOR
        ]);
        result.simLH6 = score * 100;
    }
    return result;
}

/**
 * @param {Window} window
 */
function isMobileDevice({navigator: {userAgent}}) {
    if (/android/i.test(userAgent)) {
        return !/tablet|smart_?tv/i.test(userAgent);
    }
    return /iphone/i.test(userAgent);
}

/**
 * @param {number[][]} curves 
 * @param {Array<number>} measurements
 */
function getScore(curves, measurements) {
    const auditRefs = weights
        .map((weight, index) => [
            weight,
            round(QUANTILE_AT_VALUE(curves[index], measurements[index]) * 100) / 100,
        ]);
    return arithmeticMean(auditRefs);
}

/**
 * @param {number[][]} items
 */
function arithmeticMean(items) {
    const [weight, sum] = items
        .reduce((acc, [weight, score]) => [
            acc[0] + weight,
            acc[1] + score * weight,
        ], [0, 0]);
    return sum / weight || 0;
}

/**
 * Creates a log-normal distribution and finds the complementary
 * quantile (1-percentile) of that distribution at value. All
 * arguments should be in the same units (e.g. milliseconds).
 *
 * @param {number[]} curve
 * @param {number} value
 * @return The complement of the quantile at value.
 * @customfunction
 */
function QUANTILE_AT_VALUE([median, podr], value) {
    const location = log(median);

    // The "podr" value specified the location of the smaller of the positive
    // roots of the third derivative of the log-normal CDF. Calculate the shape
    // parameter in terms of that value and the median.
    // See https://www.desmos.com/calculator/2t1ugwykrl
    const logRatio = log(podr / median);
    const shape = sqrt(1 - 3 * logRatio - sqrt((logRatio - 3) * (logRatio - 3) - 8)) / 2;
    const standardizedX = (log(value) - location) / (SQRT2 * shape);
    return (1 - internalErf_(standardizedX)) / 2;
}

/**
 * Approximates the Gauss error function, the probability that a random variable
 * from the standard normal distribution lies within [-x, x]. Moved from
 * traceviewer.b.math.erf, based on Abramowitz and Stegun, formula 7.1.26.
 * @param {number} x
 */
function internalErf_(x) {
    // erf(-x) = -erf(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * abs(x));
    const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
    return SIGN(x) * (1 - y * exp(-x * x));
}

/**
 * @param {number} x 
 */
function SIGN(x) {
    return x < 0 ? -1 : 1;
}
