import { Redis } from "ioredis";

export const redis = new Redis();

// If there is additional configs such password, port, etc
// export const redis = new Redis({
//   password: "my-password",
//   port: 7000,
// });
