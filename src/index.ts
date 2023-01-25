import 'dotenv/config';
import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { LocalData, Zone, DnsRecord } from './interface';
import { getTime, logAndExit, sleep } from './utils';
import { exit } from 'process';

const headers = {
  'X-Auth-Email': process.env.CF_EMAIL,
  'X-Auth-Key': process.env.CF_API_KEY,
  'Content-Type': ' application/json',
};

function genDataLocal(countLoop: number): LocalData {
  return {
    ip: '0.0.0.0',
    time: getTime(),
    pi3Status: 0,
    countLoop,
  };
}

async function writeLocalFile(
  ip: string,
  pi3Status: number,
  countLoop: number
): Promise<LocalData> {
  const time: string = getTime();
  const dataWrite = { ip, time, pi3Status, countLoop };
  try {
    await writeFile('./static/myip.txt', JSON.stringify(dataWrite));
  } catch (error) {
    await logAndExit('Error Function writeLocalFile in index.js', JSON.stringify(error));
  }
  return dataWrite;
}

async function pushIPtoPI3(currentIp: string, countLoop: number): Promise<void> {
  try {
    const res = await axios.get(`${process.env.URL_PI3}?ip=${currentIp}`);
    await writeLocalFile(currentIp, res.status, countLoop);
  } catch (err) {
    await logAndExit('Error function pushIPtoPI3', JSON.stringify(err));
  }
}

async function getZones(): Promise<Zone[]> {
  const res = await axios(`${process.env.CF_ENDPOINT}zones`, { headers });
  return res.data.result.map((zone: Zone) => {
    return { id: zone.id, name: zone.name };
  });
  // Zones này là domain chính, không phải sub-domain
}

async function getDnsRecords(zone: Zone): Promise<DnsRecord> {
  const res = await axios(`${process.env.CF_ENDPOINT}zones/${zone.id}/dns_records`, { headers });
  const dnsRecords = res.data.result.reduce((acc: DnsRecord[], cur: DnsRecord) => {
    if (cur.type !== 'A') return acc;
    if (/eco/gm.test(cur.name)) return acc;

    acc.push({
      id: cur.id,
      zone_id: cur.zone_id,
      name: cur.name,
      type: cur.type,
      content: cur.content,
      proxied: cur.proxied,
      ttl: cur.ttl,
    });
    return acc;
  }, []);

  return dnsRecords;
}

async function updateDnsRecords(DnsRecords: DnsRecord[], currentIp: string) {
  for (const idx in DnsRecords) {
    const url = `${process.env.CF_ENDPOINT}zones/${DnsRecords[idx].zone_id}/dns_records/${DnsRecords[idx].id}`;
    const data = {
      name: DnsRecords[idx].name,
      type: DnsRecords[idx].type,
      ttl: DnsRecords[idx].ttl,
      proxied: DnsRecords[idx].proxied,
      content: currentIp,
    };
    try {
      const res = await axios({ method: 'PUT', url, headers, data });
      if (res.data.success) console.log(`Update DNS ${res.data.result.name} success`);
      else console.log(`Update DNS ${res.data.result.name} failed`);
    } catch (error) {
      await logAndExit('Error in function updateDnsRecords in index.js', JSON.stringify(error));
    }
    // console.log(`update ${idx} done!`, url, data);
    await sleep(2000);
  }
}

async function handleCloudflare(currentIp: string) {
  const zones = await getZones();
  const dnsRecords = await Promise.all(zones.map(async (zone) => await getDnsRecords(zone)));

  await updateDnsRecords(dnsRecords.flat(), currentIp);
  console.log(`Update DDNS Cloudflare with ip ${currentIp} successful!\n`);
}

async function getIpv4(url: string): Promise<string> {
  const { data } = await axios.get(url);
  return data;
}

async function readLocalFile(countLoop: number): Promise<LocalData> {
  try {
    const data: string = await readFile('./static/myip.txt', 'utf8');
    const dataParse: LocalData = JSON.parse(data);
    return dataParse;
  } catch (error) {
    await logAndExit('Error Function writeLocalFile in index.js', JSON.stringify(error));
    return genDataLocal(countLoop);
  }
}

async function init(countLoop: number): Promise<void> {
  if (!existsSync('./static/myip.txt')) {
    mkdirSync('./static');
    await writeLocalFile('0.0.0.0', 0, countLoop);
  }
}

async function loopCheck(countLoop: number): Promise<void> {
  const currentIp: string = await getIpv4(process.env.API_IPV4);
  const localData: LocalData = await readLocalFile(countLoop);
  if (localData.ip === currentIp) setTimeout(loopCheck, 600000, ++countLoop);
  else {
    pushIPtoPI3(currentIp, countLoop);
    handleCloudflare(currentIp);
    setTimeout(loopCheck, 10000, ++countLoop);
  }
}

async function main(countLoop: number) {
  await init(countLoop);
  await loopCheck(countLoop);
}

main(1);
