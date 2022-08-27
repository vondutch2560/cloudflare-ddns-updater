import 'dotenv/config';
import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { LocalData, Zone, DnsRecord } from './interface';
import { getTime, logAndExit, sleep } from './utils';

const headers = {
  'X-Auth-Email': process.env.CF_EMAIL,
  'X-Auth-Key': process.env.CF_API_KEY,
  'Content-Type': ' application/json'
};

async function writeLocalFile(ip: string, Pi3Status: number): Promise<LocalData> {
  const time = getTime();
  const dataWrite = { ip, time, Pi3Status };
  try {
    await writeFile(process.env.PATH_MYIP, JSON.stringify(dataWrite));
  } catch (error) {
    await logAndExit('Error Function writeLocalFile in index.js', JSON.stringify(error));
  }
  return dataWrite;
}

async function pushIPtoPI3(currentIp: string): Promise<void> {
  try {
    const res = await axios.get(`${process.env.URL_PI3}?ip=${currentIp}`);
    await writeLocalFile(currentIp, res.status);
  } catch (err) {
    await logAndExit('Error function pushIPtoPI3', JSON.stringify(err));
  }
}

async function getZones(): Promise<Zone[]> {
  const res = await axios(`${process.env.CF_ENDPOINT}zones`, { headers });
  return res.data.result.map((zone: Zone) => {
    return { id: zone.id, name: zone.name };
  });
}

async function getDnsRecords(zone: Zone): Promise<DnsRecord> {
  const res = await axios(`${process.env.CF_ENDPOINT}zones/${zone.id}/dns_records`, { headers });
  const dnsRecords = res.data.result.reduce((acc: DnsRecord[], cur: DnsRecord) => {
    if (cur.proxied === false || cur.zone_name === cur.name) {
      acc.push({
        id: cur.id,
        zone_id: cur.zone_id,
        name: cur.name,
        type: cur.type,
        content: cur.content,
        proxied: cur.proxied,
        ttl: cur.ttl
      });
    }
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
      content: currentIp
    };
    try {
      const res = await axios({ method: 'PUT', url, headers, data });
      if (res.data.success) console.log(`Update DNS ${res.data.result.name} success`);
      else console.log(`Update DNS ${res.data.result.name} failed`);
    } catch (error) {
      await logAndExit('Error in function updateDnsRecords in index.js', JSON.stringify(error));
    }
    console.log(`update ${idx} done!`, url, data);
    await sleep(2000);
  }
}

async function handleCloudflare(currentIp: string) {
  const zones = await getZones();
  const dnsRecords = await Promise.all(zones.map(async (zone) => await getDnsRecords(zone)));
  await updateDnsRecords(dnsRecords.flat(), currentIp);
  console.log('Update DDNS Cloudflare successful!');
}

async function getIpv4(url: string): Promise<string> {
  const { data } = await axios.get(url);
  return data;
}

async function readLocalFile(): Promise<LocalData | undefined> {
  const isExistLocalFile = existsSync(process.env.PATH_MYIP);
  if (isExistLocalFile) {
    try {
      const data: string = await readFile(process.env.PATH_MYIP, 'utf8');
      const dataParse: LocalData = JSON.parse(data);
      return dataParse;
    } catch (error) {
      await logAndExit('Error Function writeLocalFile in index.js', JSON.stringify(error));
    }
  } else {
    const dataSample = await writeLocalFile('0.0.0.0', 0);
    return dataSample;
  }
}

async function main(countLog: number) {
  console.log(`[${getTime()}] - count loop: ${countLog}`);
  const currentIp: string = await getIpv4(process.env.API_IPV4);
  const localData: LocalData | undefined = await readLocalFile();

  if (localData !== undefined && localData.ip === currentIp) setTimeout(main, 600000, ++countLog);
  else {
    pushIPtoPI3(currentIp);
    handleCloudflare(currentIp);
    setTimeout(main, 10000, ++countLog);
  }
}

main(1);
