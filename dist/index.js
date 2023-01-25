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
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const utils_1 = require("./utils");
const headers = {
    'X-Auth-Email': process.env.CF_EMAIL,
    'X-Auth-Key': process.env.CF_API_KEY,
    'Content-Type': ' application/json',
};
function genDataLocal(countLoop) {
    return {
        ip: '0.0.0.0',
        time: (0, utils_1.getTime)(),
        pi3Status: 0,
        countLoop,
    };
}
function writeLocalFile(ip, pi3Status, countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        const time = (0, utils_1.getTime)();
        const dataWrite = { ip, time, pi3Status, countLoop };
        try {
            yield (0, promises_1.writeFile)('./static/myip.txt', JSON.stringify(dataWrite));
        }
        catch (error) {
            yield (0, utils_1.logAndExit)('Error Function writeLocalFile in index.js', JSON.stringify(error));
        }
        return dataWrite;
    });
}
function pushIPtoPI3(currentIp, countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield axios_1.default.get(`${process.env.URL_PI3}?ip=${currentIp}`);
            yield writeLocalFile(currentIp, res.status, countLoop);
        }
        catch (err) {
            yield (0, utils_1.logAndExit)('Error function pushIPtoPI3', JSON.stringify(err));
        }
    });
}
function getZones() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield (0, axios_1.default)(`${process.env.CF_ENDPOINT}zones`, { headers });
        return res.data.result.map((zone) => {
            return { id: zone.id, name: zone.name };
        });
    });
}
function getDnsRecords(zone) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield (0, axios_1.default)(`${process.env.CF_ENDPOINT}zones/${zone.id}/dns_records`, { headers });
        const dnsRecords = res.data.result.reduce((acc, cur) => {
            if (cur.type !== 'A')
                return acc;
            if (/eco/gm.test(cur.name))
                return acc;
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
    });
}
function updateDnsRecords(DnsRecords, currentIp) {
    return __awaiter(this, void 0, void 0, function* () {
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
                const res = yield (0, axios_1.default)({ method: 'PUT', url, headers, data });
                if (res.data.success)
                    console.log(`Update DNS ${res.data.result.name} success`);
                else
                    console.log(`Update DNS ${res.data.result.name} failed`);
            }
            catch (error) {
                yield (0, utils_1.logAndExit)('Error in function updateDnsRecords in index.js', JSON.stringify(error));
            }
            yield (0, utils_1.sleep)(2000);
        }
    });
}
function handleCloudflare(currentIp) {
    return __awaiter(this, void 0, void 0, function* () {
        const zones = yield getZones();
        const dnsRecords = yield Promise.all(zones.map((zone) => __awaiter(this, void 0, void 0, function* () { return yield getDnsRecords(zone); })));
        yield updateDnsRecords(dnsRecords.flat(), currentIp);
        console.log('Update DDNS Cloudflare successful!');
    });
}
function getIpv4(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield axios_1.default.get(url);
        return data;
    });
}
function readLocalFile(countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield (0, promises_1.readFile)('./static/myip.txt', 'utf8');
            const dataParse = JSON.parse(data);
            return dataParse;
        }
        catch (error) {
            yield (0, utils_1.logAndExit)('Error Function writeLocalFile in index.js', JSON.stringify(error));
            return genDataLocal(countLoop);
        }
    });
}
function init(countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, fs_1.existsSync)('./static/myip.txt')) {
            (0, fs_1.mkdirSync)('./static');
            yield writeLocalFile('0.0.0.0', 0, countLoop);
        }
    });
}
function loopCheck(countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentIp = yield getIpv4(process.env.API_IPV4);
        const localData = yield readLocalFile(countLoop);
        if (localData.ip === currentIp)
            setTimeout(loopCheck, 600000, ++countLoop);
        else {
            pushIPtoPI3(currentIp, countLoop);
            handleCloudflare(currentIp);
            setTimeout(loopCheck, 10000, ++countLoop);
        }
    });
}
function main(countLoop) {
    return __awaiter(this, void 0, void 0, function* () {
        yield init(countLoop);
        yield loopCheck(countLoop);
    });
}
main(1);
