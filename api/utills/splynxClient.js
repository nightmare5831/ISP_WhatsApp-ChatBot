import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let tokenCache = {
  token: null,
  expiresAt: null
};

export const loginToSplynx = async () => {
  try {
    const response = await axios.post(
      `${process.env.SPLYNX_BASE_URL}/auth/tokens`,
      {
        auth_type: process.env.SPLYNX_AUTH_TYPE,
        login: process.env.SPLYNX_API_USER,
        password: process.env.SPLYNX_API_PASS,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { access_token, expires_in } = response.data;
    
    tokenCache.token = access_token;
    tokenCache.expiresAt = Date.now() + ((expires_in - 300) * 1000);
    
    return access_token;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

const getValidToken = async () => {
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  
  console.log("Token expired or missing, getting new token...");
  return await loginToSplynx();
};

export const splynxRequest = async (method, url, data = null) => {
  const token = await getValidToken();

  try {
    const config = {
      method: method.toUpperCase(),
      url: `${process.env.SPLYNX_BASE_URL}${url}`,
      headers: {
        Authorization: `Splynx-EA (access_token=${token})`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    } else{
      config.params = data;
    }

    return await axios(config);
    
  } catch (error) {
    // If we get 401/403, token might be invalid - clear cache and retry once
    if (error.response && [401, 403].includes(error.response.status)) {
      console.log("Token appears invalid, clearing cache and retrying...");
      tokenCache.token = null;
      tokenCache.expiresAt = null;
      
      // Retry with fresh token
      const newToken = await getValidToken();
      const retryConfig = {
        method: method.toUpperCase(),
        url: `${process.env.SPLYNX_BASE_URL}${url}`,
        headers: {
          Authorization: `Bearer ${newToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        retryConfig.data = data;
      } else {
        retryConfig.params = data; 
      }

      return await axios(retryConfig);
    }
    
    throw error;
  }
};

export const clearTokenCache = () => {
  tokenCache.token = null;
  tokenCache.expiresAt = null;
};

export const testLoginEndpoints = async () => {
  const baseUrl = process.env.SPLYNX_BASE_URL;
  const endpoints = ["/auth/tokens", "/admin/dashboard"];

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting endpoint: ${baseUrl}${endpoint}`);

      const res = await axios.post(
        `${baseUrl}${endpoint}`,
        {
          auth_type: process.env.SPLYNX_AUTH_TYPE,
          login: process.env.SPLYNX_API_USER,
          password: process.env.SPLYNX_API_PASS,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 5000,
          validateStatus: () => true,
        }
      );

      console.log(`✓ Status: ${res.status}`);
      console.log(`✓ Content-Type: ${res.headers["content-type"]}`);

      if (res.status === 200 || res.status === 201) {
        console.log("✓ SUCCESS! This endpoint works");
        console.log("Response data keys:", Object.keys(res.data));
        return endpoint;
      } else if (res.status === 400 || res.status === 401) {
        console.log("⚠ Endpoint exists but credentials may be wrong");
        console.log("Response:", res.data);
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }

  return null;
};