/**
 * Creates a deep clone of a JSON-serializable object
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
const clone =
  typeof structuredClone === "function"
    ? structuredClone
    : (v: any) => JSON.parse(JSON.stringify(v));
export const deepClone = <T>(obj: T): T => {
  if (obj === undefined) {
    return undefined as T;
  }
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return clone(obj);
};
