import { splynxRequest } from "../utills/splynxClient";

export const customerByPhone = async (phoneNumber) => {
  const response = await splynxRequest("get", `/customers/customer`, {main_attributes:{phone:phoneNumber}});
  return response.data[0] || null;
};

export const customerById = async (customerId) => {
  const response = await splynxRequest("get", `/customers/customer`, {id:`${customerId}`});
  return response.data || null;
};