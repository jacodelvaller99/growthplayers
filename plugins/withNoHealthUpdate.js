// react-native-health siempre añade NSHealthUpdateUsageDescription; Polaris no escribe en Salud (App Review 2.5.1).
const { withInfoPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withInfoPlist(config, (c) => {
    delete c.modResults.NSHealthUpdateUsageDescription;
    return c;
  });
