export const DEFAULT_OFIS_ID = "ofis-default";

export function getOfisId(userOfisId?: string) {
  return userOfisId || DEFAULT_OFIS_ID;
}
