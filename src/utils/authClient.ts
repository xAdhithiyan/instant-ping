import { google } from 'googleapis';

const authClient = (() => {
  const auth = new google.auth.OAuth2();

  const getAuth = () => {
    return auth;
  };

  const setAuth = (token: string) => {
    auth.setCredentials({ access_token: token });
  };

  return {
    getAuth,
    setAuth,
  };
})();

export default authClient;
