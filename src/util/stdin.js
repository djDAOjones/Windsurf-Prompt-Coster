/**
 * Read all of stdin as a string. Resolves on end, on error, or after a timeout
 * so a misbehaving caller can never hang the hook. Never rejects.
 */

/**
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<string>}
 */
export function readStdin({ timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(data);
    };

    // No piped input (interactive terminal): nothing to read.
    if (process.stdin.isTTY) return finish();

    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
      const t = setTimeout(finish, timeoutMs);
      if (typeof t.unref === 'function') t.unref();
    } catch {
      finish();
    }
  });
}
