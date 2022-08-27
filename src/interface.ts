interface LocalData {
  ip: string;
  time: string;
  Pi3Status: number;
}

interface Zone {
  id: string;
  name: string;
}

interface DnsRecord {
  id: string;
  zone_id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
  ttl: number;
  zone_name?: string;
}

export { LocalData, Zone, DnsRecord };
