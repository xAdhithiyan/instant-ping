import { tunnelmole } from 'tunnelmole';

async function exposeAPI() {
  const url = await tunnelmole({
    port: 3000,
    // domain: 'instantPingExampleQuent.tunnelmole.net',
  });

  console.log(url);
}
