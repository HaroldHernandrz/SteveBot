/**
 * Logger con colores ANSI y niveles de severidad
 */

const { ANSI } = require('./colors');

function timestamp() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function log(level, color, message) {
  const prefix = `${color}[${timestamp()}] [${level}]${ANSI.reset}`;
  console.log(`${prefix} ${message}`);
}

module.exports = {
  info: (msg) => log('ℹ', ANSI.cyan, msg),
  success: (msg) => log('✓', ANSI.green, msg),
  warn: (msg) => log('⚠', ANSI.yellow, msg),
  error: (msg) => log('✗', ANSI.red, msg),
  debug: (msg) => {
    if (process.env.DEBUG === 'true') {
      log('◆', ANSI.dim, msg);
    }
  },
};
