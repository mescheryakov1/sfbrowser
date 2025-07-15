import { contextBridge } from 'electron';
import log from 'electron-log';

contextBridge.exposeInMainWorld('log', {
  info: (...args: any[]) => log.info(...args),
  warn: (...args: any[]) => log.warn(...args),
  error: (...args: any[]) => log.error(...args)
});
