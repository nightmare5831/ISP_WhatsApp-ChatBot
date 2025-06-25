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
  let result = {
    id:'', name:'', expire:'', plan:'', speed:'', balance:'', status:'', dataUsage:'', dataLimit:''
  }

  const customer = await splynxRequest("get", `/customers/customer`, {
    id: customerId,
  });
  const internetService = await splynxRequest("get", `/customers/customer/${customerId}/internet-services`,null);
  const tariff = await splynxRequest("get", `/tariffs/internet/${internetService.data[0].tariff_id}`, null);
  const billing = await splynxRequest("get", `/customers/${customerId}/billing-info`, null);

  console.log('customer', customer.data)
  console.log('billing', billing.data)
  
  result.id = customer.data.id;
  result.name = customer.data.name;
  result.expire = customer.data.last_update;
  result.plan = customer.data.billing_type || 'Prepaid(custom)';
  result.status = customer.data.status;
  result.balance = customer.data.mrr_total || '0.00';
  result.speed = tariff.data.speed_download || 'N/A';
  
  return result;
};