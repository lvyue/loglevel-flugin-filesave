import { Logger, LogLevel, LogLevelDesc } from 'loglevel';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface LogLevePluginFileSaveOptions {
    /**
     * Path to the file where the log should be written
     */
    file: string;
    /**
     * String or a function (receives methodName and message as arguments) that will be used to format the logged message.
     * Default: methodName + ': ' + message
     */
    prefix?: string | ((methodName: string, message: string) => string);

    /* - Level of the messages that should be passed trough to the console (default loglevel behaviour).
     * Default: logger.levels.SILENT
     */
    consoleLevel?: LogLevel;
    /**
     * Separator that should be used between entries:
     * Default: require('os').EOL (depends on the system)
     */
    separator?: string;
    /* Level of messages that should be written to the file.
     *Default: logger.levels.WARN
     */
    level: LogLevel;
}

export default function (logger: Logger, options: LogLevePluginFileSaveOptions): Logger {
    const {
        file,
        prefix,
        consoleLevel = logger.levels.SILENT,
        separator = os.EOL,
        level = logger.levels.WARN,
    } = options;
    if (!logger || !logger.methodFactory) {
        throw new Error('loglevel instance has to be specified in order to be extended');
    }
    // Force create the file to avoid issues with multiple async appends
    fs.writeFileSync(path.resolve(file), '');

    const originalMethodFactory = logger.methodFactory;

    logger.methodFactory = function (methodName: string, methodLevel, loggerName: string | symbol) {
        const msgLevel = logger.levels[(methodName.toUpperCase() as unknown) as keyof LogLevel];
        const rawMethod = originalMethodFactory(methodName, methodLevel, loggerName);

        return function (_message) {
            if (msgLevel >= level) {
                let message = _message;
                if (typeof prefix === 'string') {
                    message = prefix + message;
                } else if (typeof prefix === 'function') {
                    message = prefix(methodName, message);
                } else {
                    message = methodName + ': ' + message;
                }
                fs.appendFileSync(path.resolve(file), message + separator);
            }
            if (msgLevel >= consoleLevel) {
                rawMethod(methodName + ': ' + _message);
            }
        };
    };

    logger.setLevel((Math.min(level as number, consoleLevel as number) as unknown) as LogLevelDesc);
    return logger;
}
