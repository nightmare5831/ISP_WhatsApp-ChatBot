import { splynxRequest } from "../utills/splynxClient";

export const customerByPhone = async (phoneNumber) => {
  const response = await splynxRequest("get", `/customers/customer`, {
    main_attributes: { phone: phoneNumber },
  });
  return response.data[0] || null;
};

export const customerByIdPassword = async (customerId) => {
  const parts = customerId.split(" ");
  const id = parts[0];
  const login = parts[1];
  const response = await splynxRequest("get", `/customers/customer`, {
    main_attributes: { id, login },
  });
  return response.data[0] || null;
};

export const customerById = async (customerId) => {
  const response = await splynxRequest("get", `/customers/customer`, {
    id: customerId,
  });
  console.log('customer', response.data);
  const speed = await splynxRequest("get", `/customers/customer/${customerId}/internet-services`,null);
  console.log('speed', speed.data);
  return response.data || null;
};