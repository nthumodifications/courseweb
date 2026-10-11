type AnyFunction = (...args: any[]) => any;

export const createSupabaseServerMock = (defaultClient: AnyFunction) => ({
  default: defaultClient,
  supabaseWithEnv: () => {
    throw new Error("supabaseWithEnv is not used in this test");
  },
});

export const createPrismaClientMock = (fetch: AnyFunction) => ({
  default: { fetch },
});

export const createJwtMock = (sign: AnyFunction = () => "test-jwt") => {
  const verify = async () => undefined;
  const decode = () => ({ header: {}, payload: {} });
  return {
    decode,
    sign,
    verify,
    default: { decode, sign, verify },
  };
};
