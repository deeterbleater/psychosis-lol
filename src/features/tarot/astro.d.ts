declare const ZODIAC: readonly ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export type Zodiac = typeof ZODIAC[number];
export declare function longitudeToZodiac(longitude: number): {
    sign: Zodiac;
    degree: number;
};
export declare function getSunMoonForUnix(unix: number): Promise<{
    sun: {
        sign: Zodiac;
        degree: number;
    };
    moon: {
        sign: Zodiac;
        degree: number;
    };
}>;
export {};
