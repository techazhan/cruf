/**
 * Spinner — Loading indicator for Cruf.
 * Wraps ora for a consistent spinner experience.
 */

let ora;
let chalk;

async function loadDeps() {
  if (!ora) {
    ora = (await import('ora')).default;
  }
  if (!chalk) {
    chalk = (await import('chalk')).default;
  }
}

export class Spinner {
  constructor(text) {
    this.text = text || 'Processing...';
    this.spinner = null;
  }

  async start(text) {
    await loadDeps();
    this.text = text || this.text;
    this.spinner = ora({
      text: this.text,
      color: 'cyan',
      spinner: 'dots',
    }).start();
    return this;
  }

  succeed(text) {
    if (this.spinner) {
      this.spinner.succeed(text || 'Done');
    }
    return this;
  }

  fail(text) {
    if (this.spinner) {
      this.spinner.fail(text || 'Failed');
    }
    return this;
  }

  warn(text) {
    if (this.spinner) {
      this.spinner.warn(text || 'Warning');
    }
    return this;
  }

  info(text) {
    if (this.spinner) {
      this.spinner.info(text || 'Info');
    }
    return this;
  }

  stop() {
    if (this.spinner) {
      this.spinner.stop();
    }
    return this;
  }

  setText(text) {
    this.text = text;
    if (this.spinner) {
      this.spinner.text = text;
    }
    return this;
  }

  setColor(color) {
    if (this.spinner) {
      this.spinner.color = color;
    }
    return this;
  }
}

/**
 * Create a spinner with the given text
 */
export function spinner(text) {
  return new Spinner(text);
}

/**
 * Run an async function with a spinner
 */
export async function withSpinner(text, fn) {
  const s = new Spinner(text);
  await s.start();
  try {
    const result = await fn(s);
    s.succeed();
    return result;
  } catch (err) {
    s.fail(err.message || 'An error occurred');
    throw err;
  }
}

export default { Spinner, spinner, withSpinner };
