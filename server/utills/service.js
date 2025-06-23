import { splynxRequest } from "../utills/splynxClient";

export const customerByPhone = async (phone) => {
  const response = await splynxRequest("get", "/admin/customers", null, {
    main_phone: phone
  });
  return response.data[0] || null;
};