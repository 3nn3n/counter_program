import {
  getStructCodec,
  getU32Codec,
  getEncodedSize,
} from "@solana/kit";

class CounterAccount {
  count: number;

  constructor({ count }: { count: number }) {
    this.count = count;
  }
}

const CounterAccountCodec = getStructCodec([
  ["count", getU32Codec()],
]);

// ✅ No need to pass a value for fixed-size struct
const GREETING_SIZE = getEncodedSize({count: 0}, CounterAccountCodec);

console.log("GREETING_SIZE:", GREETING_SIZE); // -> 4 bytes

// Encode an instance
const counter = new CounterAccount({ count: 10 });
const encoded = CounterAccountCodec.encode(counter);
console.log("Encoded buffer:", encoded);

// Decode later
const decoded = CounterAccountCodec.decode(encoded);
console.log("Decoded object:", decoded); // { count: 10 }
