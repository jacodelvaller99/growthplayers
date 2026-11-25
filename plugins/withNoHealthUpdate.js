// react-native-health referencia las APIs de escritura de HealthKit, así que Apple RECHAZA la carga
// (ITMS-90683) si falta NSHealthUpdateUsageDescription — builds 16–18 fallaron por borrarla.
// Polaris no escribe en Salud: la clave se deja, con un texto que dice exactamente eso (App Review 2.5.1).
const { withInfoPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.NSHealthUpdateUsageDescription =
      'Polaris no escribe ni modifica datos en Apple Salud. Solo lee, con tu permiso, los datos que describe el acceso de lectura para calcular tu recuperación.';
    return c;
  });
