import { google } from 'googleapis';

const authClient = (() => {
  const auth = new google.auth.OAuth2();

  const setAuth = (token: string) => {
    auth.setCredentials({ access_token: token });
    return google.gmail({ version: 'v1', auth });
  };

  return {
    setAuth,
  };
})();

export default authClient;
