import axios from "axios";
import { env } from "../config/env";

export const createPaystackPayment = async (payload: any) => {
  const { data: paystackLinkResponse } = await axios.post(
    `${env.PAYSTACK_BASE_URL}/transaction/initialize`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      },
    },
  );

  return paystackLinkResponse.data;
};
