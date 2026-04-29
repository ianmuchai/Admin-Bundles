const {
  MikrotikService,
  createServiceForSelection,
  loadSitesFromEnv,
  resolveSiteConfig,
} = require('./mikrotikService');

const defaultService = new MikrotikService(loadSitesFromEnv().default);

module.exports = defaultService;
module.exports.MikrotikService = MikrotikService;
module.exports.createServiceForSelection = createServiceForSelection;
module.exports.resolveSiteConfig = resolveSiteConfig;
module.exports.getAllSites = loadSitesFromEnv;
module.exports.getMikrotikForSite = async function getMikrotikForSite(siteKey) {
  return createServiceForSelection({ siteKey });
};
