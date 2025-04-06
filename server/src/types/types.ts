export type SessionDataTypes = {
  id: string;
};

export type otpType = {
  randomOTP: number;
  phoneNumber: string;
};

export type optionsType = {
  method: string;
  to: string;
  type: string;
  body: string;
  link?: string;
};
