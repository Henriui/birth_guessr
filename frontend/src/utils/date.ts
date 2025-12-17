import dayjs, { type ConfigType } from 'dayjs';

export const EU_DATE_FORMAT = 'DD/MM/YYYY';

export function formatEuDate(value: ConfigType): string {
  return dayjs(value).format(EU_DATE_FORMAT);
}
