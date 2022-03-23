import ipRegex from 'ip-regex';
import urlRegex from 'url-regex';
import fs from 'fs';

class JobTCP_UDP {
  constructor(type, ip, port, payload, interval_ms) {
    this.type = type;
    this.args = {
      address: `${ip}:${port}`,
      body: `{{ random_payload ${payload} }}`,
      interval_ms: interval_ms,
    };
  }
}

class JobHTTP {
  constructor(url, count) {
    this.type = 'http';
    this.count = count;
    this.args = {
      request: {
        method: 'GET',
        path: url,
        // headers: {
        //   'sec-ch-ua':
        //     "'Not A;Brand';v='99', 'Chromium';v='99', 'Google Chrome';v='99'",
        //   'sec-ch-ua-mobile': '?0',
        //   'sec-ch-ua-platform': 'Linux',
        //   'Upgrade-Insecure-Requests': '1',
        //   'User-Agent':
        //     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36',
        // },
      },
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

  if (url) {
    const count = 10;
    let job = new JobHTTP(url[0], count);
    jobs.jobs.push(job);
  }

  if (portsTCP) {
    portsTCP.forEach((port) => {
      const type = 'tcp';
      const payload = 10;
      const interval_ms = 100;
      if (skipHTTPPorts) {
        if (port !== '80' && port !== '443') {
          let job = new JobTCP_UDP(type, ip, port, payload, interval_ms);
          jobs.jobs.push(job);
        }
      } else {
        let job = new JobTCP_UDP(type, ip, port, payload, interval_ms);
        jobs.jobs.push(job);
      }
    });
  }

  if (portsUDP) {
    portsUDP.forEach((port) => {
      const type = 'udp';
      const payload = 100;
      const interval_ms = 100;
      let job = new JobTCP_UDP(type, ip, port, payload, interval_ms);
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
