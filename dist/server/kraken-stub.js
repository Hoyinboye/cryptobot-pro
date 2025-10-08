"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetKrakenStubs = exports.registerKrakenStub = exports.setKrakenStubEnabled = exports.handleStubbedRequest = exports.isKrakenStubEnabled = void 0;
let stubEnabled = process.env.KRAKEN_STUB === 'true' || process.env.NODE_ENV === 'test';
const handlers = [];
function isKrakenStubEnabled() {
    return stubEnabled;
}
exports.isKrakenStubEnabled = isKrakenStubEnabled;
function setKrakenStubEnabled(enabled) {
    stubEnabled = enabled;
}
exports.setKrakenStubEnabled = setKrakenStubEnabled;
async function handleStubbedRequest(endpoint, payload, apiKey, apiSecret) {
    const match = handlers.find(entry => {
        if (typeof entry.matcher === 'string') {
            return entry.matcher === endpoint;
        }
        if (entry.matcher instanceof RegExp) {
            return entry.matcher.test(endpoint);
        }
        return false;
    });
    if (!match) {
        throw new Error(`No Kraken stub registered for endpoint ${endpoint}`);
    }
    const handler = match.handler;
    if (typeof handler === 'function') {
        return await handler({ endpoint, payload, apiKey, apiSecret });
    }
    return handler;
}
exports.handleStubbedRequest = handleStubbedRequest;
function registerKrakenStub(endpointMatcher, responseOrHandler) {
    handlers.push({
        matcher: endpointMatcher,
        handler: responseOrHandler,
    });
}
exports.registerKrakenStub = registerKrakenStub;
function resetKrakenStubs() {
    handlers.length = 0;
}
exports.resetKrakenStubs = resetKrakenStubs;
