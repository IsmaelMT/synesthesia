require('babel-register')({
  presets: ["webpack-preset-es2015"]
});

module.exports = require('./webpack.config')({
  production: true
});
