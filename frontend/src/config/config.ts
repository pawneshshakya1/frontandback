const PROD_URL = "http://13.127.19.250:5000/api";
// const DEV_URL = "http://10.39.45.185:5000/api";
const DEV_URL = 'http://192.168.29.27:5000/api';

export const API_URL = __DEV__ ? DEV_URL : PROD_URL;
// export const API_URL = PROD_URL;
