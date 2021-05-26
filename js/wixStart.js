//@ts-check
import {addField} from '../utils/utils.js';
import getWixBiSession from '../utils/wixBiSession.js';

const entryType = 'wix-start';

/**
 * Initial Wix session attributes
 * @param {import('../utils/utils.js').State} state
 */
export default function wixStart([window]) {
    const wixBiSession = getWixBiSession(window);
    if (!wixBiSession) {
        return Promise.reject(entryType);
    }

    const result = {};

    const {thunderboltVersion, viewerModel, boltVersion, rendererModel} = /** @type {Object} */(window);
    addField(result, 'msid', rendererModel?.metaSiteId || wixBiSession.msId);

    const commonConfig = window.commonConfig || viewerModel?.siteFeaturesConfigs.commonConfig;
    addField(result, '_brandId', commonConfig?.brand);

    if (thunderboltVersion) {
        viewerInfo(viewerModel?.site.isResponsive ? 'thunderboltResponsive' : 'thunderbolt', thunderboltVersion);
    } else {
        viewerInfo(wixBiSession.renderType, boltVersion);
    }

    addField(result, 'dc', wixBiSession.dc || viewerModel?.site.dc);

    return Promise.resolve(result);

    function viewerInfo(viewerName, v) {
        addField(result, 'viewerName', viewerName);
        addField(result, 'v', v);
    }
}
