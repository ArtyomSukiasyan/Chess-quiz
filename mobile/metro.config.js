const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The quiz logic, translations and questions live in the web app (../web/src) and are shared, not copied.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../web/src')];

module.exports = config;
