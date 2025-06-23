import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const loginToSplynx = async () => {
  const res = await axios.post(`${process.env.SPLYNX_BASE_URL}/admin/auth/login`, {
    login: process.env.SPLYNX_API_USER,
    password: process.env.SPLYNX_API_PASS,
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  accessToken = res.data.auth_token;
  console.log('Splynx access token:', accessToken);
  return accessToken;
};

export const splynxRequest = async (method, url, data = null, params = null) => {
  const token = await loginToSplynx();

  return await axios({
    method,
    url: `${process.env.SPLYNX_BASE_URL}${url}`,
    data,
    params,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const testLoginEndpoints = async () => {
  // Test with base URL as just the domain
  const baseUrl = 'https://isp-my-app.splynx.app';
  const endpoints = [
    '/api/2.0/admin/auth/login',
    '/api/2.0/admin/auth/token',
    '/api/2.0/auth/login',
    '/api/admin/auth/login',
    '/admin/auth/login', 
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting endpoint: ${baseUrl}${endpoint}`);
      
      const res = await axios.post(
        `${baseUrl}${endpoint}`,
        {
          login: process.env.SPLYNX_API_USER,
          password: process.env.SPLYNX_API_PASS,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        }
      );
      
      console.log(`✓ Status: ${res.status}`);
      console.log(`✓ Content-Type: ${res.headers['content-type']}`);
      
      if (res.status === 200 || res.status === 201) {
        console.log('✓ SUCCESS! This endpoint works');
        console.log('Response:', res.data);
        return endpoint;
      } else if (res.status === 400 || res.status === 401) {
        console.log('⚠ Endpoint exists but credentials may be wrong');
        console.log('Response:', res.data);
      }
      
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
  
  return null;
};