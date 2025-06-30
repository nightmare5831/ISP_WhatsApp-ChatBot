import { splynxRequest } from "../utills/splynxClient";

export const getExpiryDate = (lastDate) => {
  const date = new Date(lastDate);
  const newDate = new Date(date);
  newDate.setMonth(date.getMonth() + 1);
  const formatDateTime = (d) => {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} `;
  };
  const newDateTimeString = formatDateTime(newDate);
  return newDateTimeString;
};

export const getStatistics = (statistics) => {
  const today = new Date();
  const currentMonth = []
  let downloadedData = 0;
  let uploadedData = 0;
  statistics.map((statistic) => {
    const date = new Date(statistic.start_date);
    if(date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      currentMonth.push(statistic);
      downloadedData += (statistic.in_bytes)/(1024*1024*1024); // convert to GB
      uploadedData += (statistic.out_bytes)/(1024*1024*1024);  // convert to GB
    }
    return true;
  })
  return {upload : uploadedData.toPrecision(4), download: downloadedData.toPrecision(5)}
}

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
    id: "",
    name: "",
    expire: "",
    plan: "",
    speed: "",
    balance: "",
    status: "",
    dataUsage: "",
    dataLimit: "",
  };

  const customer = await splynxRequest("get", `/customers/customer`, {
    id: customerId,
  });
  const internetService = await splynxRequest("get", `/customers/customer/${customerId}/internet-services`, null);
  const tariff = await splynxRequest("get", `/tariffs/internet/${internetService.data[internetService.data.length-1].tariff_id}`, null);
  const billing = await splynxRequest("get", `/customers/customer-billing`, {
    main_attributes: { customer_id: customerId },
  });
  const statistics = await splynxRequest( "get", `/customers/customer-statistics/${customerId}`, null);
  const {upload, download} = getStatistics(statistics.data);

  result.id = customer.data.id;
  result.name = customer.data.name;
  result.expire = getExpiryDate(customer.data.last_update);
  result.status = customer.data.status;
  result.plan = tariff.data.title || "title not found";
  result.speed = tariff.data.speed_download || "N/A";
  result.balance = billing.data[0].deposit || "0.00";
  result.dataUsage = upload || "0.00";
  result.dataLimit = download || "0.00";
  return result;
};