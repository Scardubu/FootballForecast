/**
 * Windows-compatible console logging utility
 * Strips emojis on Windows to prevent encoding issues
 */

const isWindows = process.platform === 'win32';

/**
 * Strip emojis from text for Windows compatibility
 */
function stripEmojis(text: string): string {
  if (!isWindows) return text;
  
  // Replace common emojis with text equivalents
  return text
    .replace(/🟡/g, '[*]')
    .replace(/✅/g, '[OK]')
    .replace(/❌/g, '[ERROR]')
    .replace(/⚠️/g, '[WARN]')
    .replace(/ℹ️/g, '[INFO]')
    .replace(/🕐/g, '[TIME]')
    .replace(/🗄️/g, '[DB]')
    .replace(/🔥/g, '[HIGH]')
    .replace(/⚡/g, '[MED]')
    .replace(/🌙/g, '[LOW]')
    .replace(/🚀/g, '[START]')
    .replace(/📊/g, '[DATA]')
    .replace(/🔧/g, '[CONFIG]')
    .replace(/🎯/g, '[TARGET]')
    .replace(/🕷️/g, '[SCRAPE]')
    .replace(/🤖/g, '[ML]')
    .replace(/🔍/g, '[CHECK]')
    .replace(/💡/g, '[TIP]')
    .replace(/📝/g, '[NOTE]')
    .replace(/🔒/g, '[SECURE]')
    .replace(/🌐/g, '[WEB]')
    .replace(/⏰/g, '[SCHEDULE]')
    .replace(/🎬/g, '[START]')
    .replace(/🛠️/g, '[TOOL]')
    .replace(/🌟/g, '[STAR]')
    .replace(/🔄/g, '[SYNC]')
    .replace(/📈/g, '[UP]')
    .replace(/📉/g, '[DOWN]')
    .replace(/🎲/g, '[RANDOM]')
    .replace(/🌍/g, '[GLOBAL]')
    // Remove any remaining emojis
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '[?]');
}

/**
 * Windows-compatible console.log replacement
 */
export function consoleLog(...args: any[]): void {
  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return stripEmojis(arg);
    }
    return arg;
  });
  console.log(...processedArgs);
}

/**
 * Windows-compatible console.warn replacement
 */
export function consoleWarn(...args: any[]): void {
  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return stripEmojis(arg);
    }
    return arg;
  });
  console.warn(...processedArgs);
}

/**
 * Windows-compatible console.error replacement
 */
export function consoleError(...args: any[]): void {
  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return stripEmojis(arg);
    }
    return arg;
  });
  console.error(...processedArgs);
}

// Export as default for easy replacement
export default {
  log: consoleLog,
  warn: consoleWarn,
  error: consoleError,
  stripEmojis
};
