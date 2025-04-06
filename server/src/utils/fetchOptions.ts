import { type optionsType } from '../types/types';

const fetchOptions = (optionDetails: optionsType) => {
  const options: RequestInit = {
    method: optionDetails.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
    },

    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: optionDetails.to,
      type: optionDetails.type,
      text: { body: `${optionDetails.body}` },
    }),
  };

  return options;
};

const specialFetchOption = (optionDetails: optionsType) => {
  const options: RequestInit = {
    method: optionDetails.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
    },

    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: optionDetails.to,
      type: optionDetails.type,
      [optionDetails.type]: {
        link: optionDetails?.link,
        ...(optionDetails.type === 'document' && {
          filename: optionDetails?.body, // or any other field for filename
        }),
      },
    }),
  };

  return options;
};

export { fetchOptions, specialFetchOption };
