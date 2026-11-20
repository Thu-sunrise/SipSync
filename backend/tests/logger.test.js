'use strict';

describe('shared/logger', () => {
  let stdoutSpy;
  let stderrSpy;

  const loadLogger = (level) => {
    jest.resetModules();
    if (level) process.env.LOG_LEVEL = level;
    else delete process.env.LOG_LEVEL;
    return require('../src/shared/logger');
  };

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  test('info ghi JSON ra stdout với level và msg', () => {
    const logger = loadLogger();
    logger.info('hello');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(entry).toMatchObject({ level: 'info', msg: 'hello' });
    expect(entry.time).toBeDefined();
  });

  test('error ghi ra stderr và serialize Error object', () => {
    const logger = loadLogger();
    logger.error({ err: new Error('boom') }, 'that bai');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(entry.level).toBe('error');
    expect(entry.msg).toBe('that bai');
    expect(entry.err.message).toBe('boom');
    expect(entry.err.name).toBe('Error');
  });

  test('debug bị bỏ qua khi LOG_LEVEL=info (mặc định)', () => {
    const logger = loadLogger();
    logger.debug('an');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  test('debug được ghi khi LOG_LEVEL=debug', () => {
    const logger = loadLogger('debug');
    logger.debug('hien');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  test('LOG_LEVEL không hợp lệ fallback về info', () => {
    const logger = loadLogger('xyz');
    logger.debug('an');
    logger.info('hien');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });
});

