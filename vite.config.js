var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
function loadDeck() {
    try {
        var csvPath = path.join(process.cwd(), 'public', 'card_data.csv');
        var text = fs.readFileSync(csvPath, 'utf8');
        var lines = text.trim().split(/\r?\n/);
        var header = lines.shift() || '';
        var cols_1 = header.split(',');
        return lines.map(function (line) {
            var vals = [];
            var cur = '';
            var inQuotes = false;
            for (var i = 0; i < line.length; i++) {
                var ch = line[i];
                if (ch === '"') {
                    inQuotes = !inQuotes;
                    continue;
                }
                if (ch === ',' && !inQuotes) {
                    vals.push(cur);
                    cur = '';
                }
                else {
                    cur += ch;
                }
            }
            vals.push(cur);
            var row = {};
            cols_1.forEach(function (c, i) { var _a; row[c] = (_a = vals[i]) !== null && _a !== void 0 ? _a : ''; });
            return row;
        });
    }
    catch (_a) {
        return [];
    }
}
var deckCache = loadDeck();
export default defineConfig({
    plugins: [react(), {
            name: 'read-endpoint',
            configureServer: function (server) {
                var _this = this;
                server.middlewares.use('/read', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                    var url, ids, cards, promptList, tarotSpreadBlock, apiKey, text, systemFromFile, systemPrompt, body, r, text, data, content, e_1;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 3, , 4]);
                                url = new URL(req.originalUrl || req.url || '', 'http://localhost');
                                ids = url.pathname.replace(/^\/read\//, '').split('-').filter(Boolean).map(function (n) { return Number(n); });
                                if (!ids.length || ids.some(function (n) { return !Number.isFinite(n) || n < 0 || n > 155; })) {
                                    res.statusCode = 400;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'invalid card ids' }));
                                    return [2 /*return*/];
                                }
                                cards = ids.map(function (i) { return deckCache[i]; }).filter(Boolean);
                                promptList = cards.map(function (c, i) {
                                    var name = c.name;
                                    var desc = c.description;
                                    var pos = ['Past', 'Present', 'Future', 'Theme', 'Challenge', 'Advice'][i] || "Card ".concat(i + 1);
                                    return "".concat(pos, ": ").concat(name, " \u2014 ").concat(desc);
                                }).join('\n');
                                tarotSpreadBlock = "<tarot_spread>\n".concat(promptList, "\n</tarot_spread>");
                                apiKey = process.env.ANTHROPIC_API_KEY || '';
                                if (!apiKey) {
                                    text = "Tarot Summary\n\n".concat(promptList);
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ text: text }));
                                    return [2 /*return*/];
                                }
                                systemFromFile = (function () {
                                    try {
                                        var p = process.env.ANTHROPIC_SYSTEM_PROMPT_FILE || 'anthropic_system_prompt.txt';
                                        if (fs.existsSync(p))
                                            return fs.readFileSync(p, 'utf8');
                                    }
                                    catch (_a) { }
                                    return '';
                                })();
                                systemPrompt = (process.env.ANTHROPIC_SYSTEM_PROMPT || systemFromFile || 'You are an insightful tarot reader. Provide a cohesive, hopeful spread interpretation.').toString();
                                body = {
                                    model: 'claude-3-haiku-20240307',
                                    max_tokens: 800,
                                    temperature: 0.7,
                                    system: systemPrompt,
                                    messages: [{ role: 'user', content: tarotSpreadBlock }],
                                };
                                return [4 /*yield*/, fetch('https://api.anthropic.com/v1/messages', {
                                        method: 'POST',
                                        headers: {
                                            'content-type': 'application/json',
                                            'x-api-key': apiKey,
                                            'anthropic-version': '2023-06-01',
                                        },
                                        body: JSON.stringify(body),
                                    })];
                            case 1:
                                r = _c.sent();
                                if (!r.ok) {
                                    text = "Tarot Summary\n\n".concat(promptList);
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ text: text }));
                                    return [2 /*return*/];
                                }
                                return [4 /*yield*/, r.json()];
                            case 2:
                                data = _c.sent();
                                content = ((_b = (_a = data === null || data === void 0 ? void 0 : data.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || 'No response.';
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ text: content }));
                                return [3 /*break*/, 4];
                            case 3:
                                e_1 = _c.sent();
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'internal_error' }));
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                server.middlewares.use('/astro', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                    var url, u, ephPath, hasSepl, hasSemo, hasLeap, mod, data, e_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                url = new URL(req.originalUrl || req.url || '', 'http://localhost');
                                u = Number(url.searchParams.get('unix') || '0');
                                if (!Number.isFinite(u) || u <= 0) {
                                    res.statusCode = 400;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'invalid_unix' }));
                                    return [2 /*return*/];
                                }
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                ephPath = path.join(process.cwd(), 'public', 'sweph');
                                hasSepl = fs.existsSync(path.join(ephPath, 'sepl_18.se1'));
                                hasSemo = fs.existsSync(path.join(ephPath, 'semo_18.se1'));
                                hasLeap = fs.existsSync(path.join(ephPath, 'seleapsec.txt'));
                                return [4 /*yield*/, server.ssrLoadModule('/src/features/tarot/astro.ts')];
                            case 2:
                                mod = _a.sent();
                                return [4 /*yield*/, mod.getSunMoonForUnix(u)];
                            case 3:
                                data = _a.sent();
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(__assign(__assign({}, data), { _diag: { hasSepl: hasSepl, hasSemo: hasSemo, hasLeap: hasLeap } })));
                                return [3 /*break*/, 5];
                            case 4:
                                e_2 = _a.sent();
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'astro_failed', message: String((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2) }));
                                return [3 /*break*/, 5];
                            case 5: return [2 /*return*/];
                        }
                    });
                }); });
            },
        }],
});
