"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.logAndExit = exports.getTime = exports.createPath = void 0;
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
function sleep(miliseconds) {
    return new Promise((resolve) => setTimeout(resolve, miliseconds));
}
exports.sleep = sleep;
function getTime() {
    const dateOb = new Date();
    const date = ('0' + dateOb.getDate()).slice(-2);
    const month = ('0' + (dateOb.getMonth() + 1)).slice(-2);
    return `${date}-${month}-${dateOb.getFullYear()} - ${dateOb.getHours()}:${dateOb.getMinutes()}`;
}
exports.getTime = getTime;
function createPath(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirPath = path_1.default.join(__dirname, dir);
        if (!(0, fs_1.existsSync)(dirPath))
            try {
                yield (0, promises_1.mkdir)(dirPath, { recursive: true });
            }
            catch (error) {
                console.log(error);
                process.exit(1);
            }
    });
}
exports.createPath = createPath;
function logAndExit(errTitle, errMsg, errCode = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        console.error(errTitle);
        yield (0, promises_1.appendFile)('./static/error.log', `[${getTime()}] - ${errMsg}\n`);
        process.exit(errCode);
    });
}
exports.logAndExit = logAndExit;
