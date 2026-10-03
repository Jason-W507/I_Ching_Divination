declare module "lunar-javascript" {
  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): {
      getLunar(): {
        getYear(): number;
        getMonth(): number;
        getDay(): number;
        getMonthInChinese(): string;
        getDayInChinese(): string;
      };
    };
  };
}
