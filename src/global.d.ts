declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ERROR_LOG: string;
      API_IPV4: string;
      PATH_MYIP: string;
      URL_PI3: string;
      CF_ENDPOINT: string;
      CF_ACCOUNT_ID: string;
      CF_TOKEN_DNS: string;
      CF_EMAIL: string;
      CF_API_KEY: string;
      CF_ORIGIN_KEY: string;
    }
  }
}
export {};
