import 'dotenv/config';
import path from 'path';
import { existsSync } from 'fs';
import { appendFile, mkdir } from 'fs/promises';

function sleep(miliseconds: number): Promise<never> {
  return new Promise((resolve) => setTimeout(resolve, miliseconds));
}

function getTime(): string {
  const dateOb = new Date();
  const date = ('0' + dateOb.getDate()).slice(-2);
  const month = ('0' + (dateOb.getMonth() + 1)).slice(-2);
  return `${date}-${month}-${dateOb.getFullYear()} - ${dateOb.getHours()}:${dateOb.getMinutes()}`;
}

async function createPath(dir: string): Promise<void> {
  const dirPath = path.join(__dirname, dir);
  if (!existsSync(dirPath))
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
}

async function logAndExit(errTitle: string, errMsg: string, errCode = 0): Promise<never> {
  console.error(errTitle);
  await appendFile(process.env.ERROR_LOG, `[${getTime()}] - ${errMsg}\n`);
  process.exit(errCode);
}

export { createPath, getTime, logAndExit, sleep };
