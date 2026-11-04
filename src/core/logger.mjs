const COLORS = { info: 34, warn: 33, error: 31, done: 32 };
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(level, text) {
  return useColor ? `\x1b[${COLORS[level]}m${text}\x1b[0m` : text;
}

export function createLogger({ quiet = false } = {}) {
  const emit = (level, stream, marker) => (message) => {
    if (quiet && level === 'info') return;
    stream.write(`${paint(level, marker)} ${message}\n`);
  };
  return {
    info: emit('info', process.stdout, '::'),
    done: emit('done', process.stdout, 'ok'),
    warn: emit('warn', process.stderr, '!!'),
    error: emit('error', process.stderr, 'xx'),
  };
}
