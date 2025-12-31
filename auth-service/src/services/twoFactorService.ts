import { auth } from "../auth";

const twofactorEnable = async (password: string, issuer?: string) => {
  return await auth.api.enableTwoFactor({ body: { password: password, issuer: issuer } });
};
const twofactorDisable = async (password: string) => {
  return await auth.api.disableTwoFactor({ body: { password: password } });
};

export { twofactorEnable, twofactorDisable };
