var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import * as path from 'node:path';
// Lazy import to avoid SSR issues; Vite dev endpoint runs in Node
var swe = null;
function loadSweph() {
    return __awaiter(this, void 0, void 0, function () {
        var mod, eph;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (swe)
                        return [2 /*return*/, swe];
                    return [4 /*yield*/, import('sweph')];
                case 1:
                    mod = _b.sent();
                    swe = mod;
                    try {
                        eph = path.join(process.cwd(), 'public', 'sweph');
                        // Correct API per sweph typings
                        (_a = swe.set_ephe_path) === null || _a === void 0 ? void 0 : _a.call(swe, eph);
                    }
                    catch (_c) { }
                    return [2 /*return*/, swe];
            }
        });
    });
}
var ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export function longitudeToZodiac(longitude) {
    var norm = ((longitude % 360) + 360) % 360;
    var idx = Math.floor(norm / 30);
    var deg = norm - idx * 30;
    return { sign: ZODIAC[idx], degree: deg };
}
export function getSunMoonForUnix(unix) {
    return __awaiter(this, void 0, void 0, function () {
        var s, c, d, year, month, day, hour, minute, second, jd, flags, sunRes, moonRes, sunLon, moonLon;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadSweph()];
                case 1:
                    s = _a.sent();
                    c = s.constants;
                    d = new Date(unix * 1000);
                    year = d.getUTCFullYear();
                    month = d.getUTCMonth() + 1;
                    day = d.getUTCDate();
                    hour = d.getUTCHours();
                    minute = d.getUTCMinutes();
                    second = d.getUTCSeconds() + (d.getUTCMilliseconds() / 1000);
                    jd = s.utc_to_jd(year, month, day, hour, minute, second, c.SE_GREG_CAL);
                    flags = c.SEFLG_SWIEPH;
                    sunRes = s.calc_ut(jd.jd_ut, c.SE_SUN, flags);
                    moonRes = s.calc_ut(jd.jd_ut, c.SE_MOON, flags);
                    sunLon = Array.isArray(sunRes === null || sunRes === void 0 ? void 0 : sunRes.data) ? Number(sunRes.data[0]) : 0;
                    moonLon = Array.isArray(moonRes === null || moonRes === void 0 ? void 0 : moonRes.data) ? Number(moonRes.data[0]) : 0;
                    return [2 /*return*/, {
                            sun: longitudeToZodiac(sunLon),
                            moon: longitudeToZodiac(moonLon),
                        }];
            }
        });
    });
}
