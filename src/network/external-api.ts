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

export const getBankList = async () => {
  const { data } = await axios.get(`${env.PAYSTACK_BASE_URL}/bank`, {
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    },
  });

  return data.data;
};

export const validateAccount = async (
  account_number: string,
  bank_code: string,
) => {
  try {
    const { data } = await axios.get(
      `${env.PAYSTACK_BASE_URL}/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return {
      found: true,
      account_name: data.data?.account_name,
    };
  } catch (error) {
    return {
      found: false,
      account_name: null,
    };
  }
};

export const validateBlacklist = async (identity: any) => {
  try {
    const { data } = await axios.get(
      `${env.LENDSQR_BASE_URL}/v2/verification/karma/${identity}`,
      {
        headers: {
          Authorization: `Bearer ${env.LENDSQR_SECRET_KEY}`,
        },
      },
    );

    if (data?.data) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(
      "Error validating blacklist:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};
