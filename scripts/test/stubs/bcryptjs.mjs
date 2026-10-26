// Deterministic password hashing for tests: no bcrypt work, no real hashes.
import { createHash } from "node:crypto";

const digest = (value) => createHash("sha256").update(String(value)).digest("hex");

const bcrypt = {
  async hash(value) {
    return `test$${digest(value)}`;
  },
  async compare(value, hash) {
    return hash === `test$${digest(value)}`;
  },
  hashSync(value) {
    return `test$${digest(value)}`;
  },
  compareSync(value, hash) {
    return hash === `test$${digest(value)}`;
  },
};

export default bcrypt;

export const hash = bcrypt.hash;
export const compare = bcrypt.compare;
export const hashSync = bcrypt.hashSync;
export const compareSync = bcrypt.compareSync;
