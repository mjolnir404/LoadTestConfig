import ipRegex from 'ip-regex';
import urlRegex from 'url-regex';
import fs from 'fs';

const debug = true;

class JobHTTP {
  constructor(url, count, client) {
    this.type = 'http';
    this.count = count;
    this.args = {
      request: {
        method: 'GET',
        path: url,
      },
      client,
    };
  }
}

class Client {
  constructor(ip, port, tls) {
    this.static_host = {
      addr: `${ip}:${port}`,
      is_tls: tls,
    };
  }
}

class JobTCP {
  constructor(count, ip, port, payload, interval_ms) {
    this.type = 'tcp';
    this.count = count;
    this.args = {
      address: `${ip}:${port}`,
      body: `{{ random_payload ${payload} }}`,
      interval_ms: interval_ms,
    };
  }
}

class JobUDP {
  constructor(count, ip, port, payload, interval_ms) {
    this.type = 'udp';
    this.filter = '{{ (.Value (ctx_key "global")).EnablePrimitiveJobs }}';
    this.count = count;
    this.args = {
      address: `${ip}:${port}`,
      body: `{{ random_payload ${payload} }}`,
      interval_ms: interval_ms,
    };
  }
}

class Target {
  constructor(url) {
    this.url = url;
    this.ip = [];
  }
}

// Parse file and get targets

let targets = [];

let rawdata = fs.readFileSync('ip.txt', { encoding: 'utf8', flag: 'r' });
rawdata.split(/\r?\n/).forEach((line, index) => {
  const ip = line.match(ipRegex());
  const url = line.match(urlRegex());
  const urlNoSchema = line.match(urlRegex({ exact: true, strict: false }));
  const portsTCP = line.match(/\d+(?=\/tcp)/g);
  const portsUDP = line.match(/\d+(?=\/udp)/g);

  if (url) {
    let target = new Target(url.toString());
    targets.push(target);
  }

  if (urlNoSchema) {
    let target = new Target(urlNoSchema.toString());
    targets.push(target);
  }

  if (ip) {
    if (portsTCP) {
      portsTCP.forEach((port) => {
        targets[targets.length - 1].ip.push({
          type: 'tcp',
          port: port,
          address: `${ip}`,
        });
      });
    }
    if (portsUDP) {
      portsUDP.forEach((port) => {
        targets[targets.length - 1].ip.push({
          type: 'udp',
          port: port,
          address: `${ip}`,
        });
      });
    }
  }

  // if (portsTCP) {
  //   portsTCP.forEach((port) => {
  //     const type = 'tcp';
  //     // const count = 10;
  // const payload = 10;
  // const interval_ms = 1;
  //     if (skipHTTPPorts) {
  //       if (port !== '80' && port !== '443') {
  //         let job = new JobTCP(type, count, ip, port, payload, interval_ms);
  //         jobs.jobs.push(job);
  //       }
  //     } else {
  //       let job = new JobTCP(type, count, ip, port, payload, interval_ms);
  //       jobs.jobs.push(job);
  //     }
  //   });
  // }

  // if (portsUDP) {
  //   portsUDP.forEach((port) => {
  //     const type = 'udp';
  //     // const count = 10;
  //     const payload = 10;
  //     const interval_ms = 1000;
  //     let job = new JobUDP(type, count, ip, port, payload, interval_ms);
  //     jobs.jobs.push(job);
  //   });
  // }
});

// Create Jobs

let jobs = {
  jobs: [],
};

const skipNoSchemaURLs = false;
const count = 18; // Global count

targets.forEach((target) => {
  target.ip.forEach((ip) => {
    // Handling HTTP Jobs
    if (ip.type === 'tcp' && ip.port === '443') {
      let job = new JobHTTP(
        target.url,
        count,
        new Client(ip.address, ip.port, true),
      );
      jobs.jobs.push(job);
    }
    if (ip.type === 'tcp' && ip.port === '80') {
      let job = new JobHTTP(
        target.url,
        count,
        new Client(ip.address, ip.port, false),
      );
      jobs.jobs.push(job);
    }

    // Handling TCP Jobs
    if (ip.type === 'tcp' && !['80', '443'].includes(ip.port)) {
      const payload = 10;
      const interval_ms = 1;
      let job = new JobTCP(count, ip.address, ip.port, payload, interval_ms);
      jobs.jobs.push(job);
    }

    // Handling UDP Jobs
    if (ip.type === 'udp') {
      const payload = 10;
      const interval_ms = 1000;
      let job = new JobUDP(count, ip.address, ip.port, payload, interval_ms);
      jobs.jobs.push(job);
    }
  });
});

if (debug) {
  targets.forEach((target) => {
    console.log(`${target.url}`);
    target.ip.forEach((ip) => {
      console.log(`${ip.address} - ${ip.type} - ${ip.port}`);
    });
  });
}

const jsonString = JSON.stringify(jobs, null, 2);
console.log(`Number of Jobs: ${jobs.jobs.length}`);

fs.writeFile('./output.json', jsonString, (err) => {
  if (err) {
    console.log('Error writing file', err);
  } else {
    console.log('Successfully wrote file');
  }
});
