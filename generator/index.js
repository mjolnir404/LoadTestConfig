import ipRegex from 'ip-regex';
import urlRegex from 'url-regex';
import fs from 'fs';

class JobHTTP {
  constructor(url, count, client) {
    this.type = 'http';
    this.count = count;
    this.args = {
      request: {
        method: 'GET',
        path: url,
      },
      client: client,
    };
  }
}
class JobTCP {
  constructor(type, count, ip, port, payload, interval_ms) {
    this.type = type;
    this.count = count;
    this.args = {
      address: `${ip}:${port}`,
      body: `{{ random_payload ${payload} }}`,
      interval_ms: interval_ms,
    };
  }
}

class JobUDP {
  constructor(type, count, ip, port, payload, interval_ms) {
    this.type = type;
    this.filter = '{{ (.Value (ctx_key "global")).EnablePrimitiveJobs }}';
    this.count = count;
    this.args = {
      address: `${ip}:${port}`,
      body: `{{ random_payload ${payload} }}`,
      interval_ms: interval_ms,
    };
  }
}

let jobs = {
  jobs: [],
};

let rawdata = fs.readFileSync('ip.txt', { encoding: 'utf8', flag: 'r' });
rawdata.split(/\r?\n/).forEach((line, index) => {
  const ip = line.match(ipRegex());
  const url = line.match(urlRegex());
  const portsTCP = line.match(/\d+(?=\/tcp)/g);
  const portsUDP = line.match(/\d+(?=\/udp)/g);
  const skipHTTPPorts = false;
  const count = 18; // Global count

  if (url) {
    // const count = 10;
    let job = new JobHTTP(url[0], count);
    jobs.jobs.push(job);
  }

  if (portsTCP) {
    portsTCP.forEach((port) => {
      const type = 'tcp';
      // const count = 10;
      const payload = 10;
      const interval_ms = 1;
      if (skipHTTPPorts) {
        if (port !== '80' && port !== '443') {
          let job = new JobTCP(type, count, ip, port, payload, interval_ms);
          jobs.jobs.push(job);
        }
      } else {
        let job = new JobTCP(type, count, ip, port, payload, interval_ms);
        jobs.jobs.push(job);
      }
    });
  }

  if (portsUDP) {
    portsUDP.forEach((port) => {
      const type = 'udp';
      // const count = 10;
      const payload = 10;
      const interval_ms = 1000;
      let job = new JobUDP(type, count, ip, port, payload, interval_ms);
      jobs.jobs.push(job);
    });
  }
});

const jsonString = JSON.stringify(jobs, null, 2);

fs.writeFile('./output.json', jsonString, (err) => {
  if (err) {
    console.log('Error writing file', err);
  } else {
    console.log('Successfully wrote file');
  }
});
