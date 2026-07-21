/**
 * Colores ANSI para terminal y configuración de colores por plataforma
 */

const ANSI = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colores
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Colores brillantes
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

const PLATFORM_COLORS = {
    kick: 0x53FC18,
    youtube: 0xFF0000,
};

const PLATFORM_EMOJI = {
    kick: "<:Kicklogo:1519051667897848000>",
    youtube: "<:yt:713085584805068852>",
};

const PLATFORM_REACTION = {
    kick: "<:Kicklogo:1519051667897848000>",
    youtube: "<:yt:713085584805068852>",
};

module.exports = {
    PLATFORM_COLORS,
    PLATFORM_EMOJI,
    PLATFORM_REACTION,
};
