import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../../../src/utils/logger.js';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

import * as core from '@actions/core';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs info messages', () => {
    const logger = new Logger('info');
    logger.info('hello');
    expect(core.info).toHaveBeenCalledWith('hello');
  });

  it('respects log level gating', () => {
    const logger = new Logger('warn');
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(core.debug).not.toHaveBeenCalled();
    expect(core.info).not.toHaveBeenCalled();
    expect(core.warning).toHaveBeenCalledWith('warn msg');
    expect(core.error).toHaveBeenCalledWith('error msg');
  });

  it('redacts secret keys in meta', () => {
    const logger = new Logger('info');
    logger.info('config', { apiKey: 'sk-1234', name: 'test' });
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('"apiKey":"***"'),
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('"name":"test"'),
    );
  });

  it('redacts multiple secret patterns', () => {
    const logger = new Logger('info');
    logger.info('secrets', {
      token: 'abc',
      password: '123',
      secret: 'xyz',
      authorization: 'Bearer xxx',
      safe: 'ok',
    });
    const call = vi.mocked(core.info).mock.calls[0][0];
    expect(call).toContain('"token":"***"');
    expect(call).toContain('"password":"***"');
    expect(call).toContain('"secret":"***"');
    expect(call).toContain('"authorization":"***"');
    expect(call).toContain('"safe":"ok"');
  });

  it('maskSecret calls core.setSecret', () => {
    const logger = new Logger();
    logger.maskSecret('my-api-key');
    expect(core.setSecret).toHaveBeenCalledWith('my-api-key');
  });

  it('does not call setSecret for empty strings', () => {
    const logger = new Logger();
    logger.maskSecret('');
    expect(core.setSecret).not.toHaveBeenCalled();
  });

  it('formats message without meta', () => {
    const logger = new Logger('debug');
    logger.debug('simple');
    expect(core.debug).toHaveBeenCalledWith('simple');
  });
});
