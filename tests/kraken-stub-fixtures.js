"use strict";
const { setKrakenStubEnabled, registerKrakenStub, resetKrakenStubs } = require("../dist/server/kraken-stub");
const { useEncryptionKeyForTests } = require("../dist/server/secure-storage");
const DEFAULT_PRICE = "30000.00";
const DEFAULT_VOLUME = "150.00";
const DEFAULT_HIGH = "31000.00";
const DEFAULT_LOW = "29500.00";
const DEFAULT_BALANCE = "50000.00";
function setupTestEncryptionKey() {
    const mockKey = Buffer.alloc(32, 1).toString("base64");
    useEncryptionKeyForTests(mockKey);
}
function primeKrakenHappyPath(options = {}) {
    const price = options.price || DEFAULT_PRICE;
    const open = options.open || price;
    const volume = options.volume || DEFAULT_VOLUME;
    const high = options.high || DEFAULT_HIGH;
    const low = options.low || DEFAULT_LOW;
    const balance = options.balance || DEFAULT_BALANCE;
    setKrakenStubEnabled(true);
    resetKrakenStubs();
    registerKrakenStub('/0/private/Balance', {
        error: [],
        result: {
            ZUSD: balance
        }
    });
    registerKrakenStub('/0/private/AddOrder', {
        error: [],
        result: {
            descr: {
                order: `buy 1.0 BTCUSD @ market`,
                pair: 'XXBTZUSD'
            },
            txid: ['TEST-TXID-12345']
        }
    });
    registerKrakenStub(/\/0\/public\/Ticker\?pair=.*/, ({ endpoint }) => {
        const match = endpoint.match(/pair=([^&]+)/);
        const pair = match ? match[1] : 'XXBTZUSD';
        return {
            error: [],
            result: {
                [pair]: {
                    c: [price, "1.0"],
                    o: open,
                    v: ["0.0", volume],
                    h: ["0.0", high],
                    l: ["0.0", low]
                }
            }
        };
    });
    registerKrakenStub(/\/0\/public\/OHLC\?pair=.*&interval=.*/, ({ endpoint }) => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const candles = Array.from({ length: 10 }).map((_, idx) => {
            const timestamp = nowSeconds - (idx * 3600);
            return [
                timestamp,
                open,
                high,
                low,
                price,
                price,
                volume,
                10
            ];
        });
        return {
            error: [],
            result: {
                [endpoint.match(/pair=([^&]+)/)?.[1] || 'XXBTZUSD']: candles,
                last: nowSeconds
            }
        };
    });
    registerKrakenStub('/0/private/ClosedOrders', {
        error: [],
        result: {
            closed: {}
        }
    });
}
module.exports = {
    setupTestEncryptionKey,
    primeKrakenHappyPath,
    resetKrakenStubs,
};
