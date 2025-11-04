import { getCreateAccountInstruction } from "@solana-program/system";
import {
  address,
  getStructCodec,
  getU32Codec,
  getEncodedSize,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  airdropFactory,
  lamports,
  generateKeyPairSigner,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  assertIsSendableTransaction,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  getU8Codec,
  appendTransactionMessageInstructions,
} from "@solana/kit";

// ---------------------
// Account Layout
// ---------------------
class CounterAccount {
  count: number;

  constructor({ count }: { count: number }) {
    this.count = count;
  }
}

const CounterAccountCodec = getStructCodec([
  ["count", getU32Codec()],
]);

const GREETING_SIZE = getEncodedSize({ count: 1 }, CounterAccountCodec);

// ---------------------
// Enum Codec (Rust-compatible)
// ---------------------
enum CounterInstructionType {
  Increment = 0,
  Decrement = 1,
}

class CounterInstruction {
  variant: CounterInstructionType;
  value: number;

  constructor(type: CounterInstructionType, value: number) {
    this.variant = type;
    this.value = value;
  }
}

const CounterInstructionCodec = getStructCodec([
  ["variant", getU8Codec()],
  ["value", getU32Codec()],
]
)


console.log("GREETING_SIZE:", GREETING_SIZE);

// ---------------------
// RPC Setup
// ---------------------
const rpc = createSolanaRpc("http://127.0.0.1:8899");
const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");

(async () => {
  const payer = await generateKeyPairSigner();
  const newAccount = await generateKeyPairSigner();

  const airdrop = airdropFactory({ rpc, rpcSubscriptions });

  await airdrop({
    commitment: "confirmed",
    recipientAddress: payer.address,
    lamports: lamports(5_000_000_000n),
  });

  const programId = address("Cid8KTERbh7F8ApBqUHsLCFs5oXc5VSK6EF73meysQRR");

  console.log(`Payer Address: ${payer.address}`);

  const { value: balance } = await rpc.getBalance(payer.address).send();
  console.log(`Balance: ${balance} lamports`);

  const rent = await rpc
    .getMinimumBalanceForRentExemption(BigInt(GREETING_SIZE))
    .send();

  const createAccountIx = getCreateAccountInstruction({
    payer,
    newAccount,
    space: GREETING_SIZE,
    lamports: rent,
    programAddress: programId,
  });

  // ---------------------
  // Encode Increment instruction
  // ---------------------

     const incrementData = CounterInstructionCodec.encode(
      new CounterInstruction(CounterInstructionType.Increment, 5)
     );



  const incrementIx = {
    programAddress: programId,
    accounts: [
      { address: newAccount.address, role: "writable" },
      { address: payer.address, role: "signer" },
    ],
    data: incrementData,
  };

  console.log(incrementIx);

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(payer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([createAccountIx, incrementIx], tx),
  );

  const transaction = await signTransactionMessageWithSigners(transactionMessage);
  assertIsSendableTransaction(transaction);

  const confirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  const signature = getSignatureFromTransaction(transaction);
  console.log("Transaction signature: ", signature);

  await confirmTransaction(transaction, {
    commitment: "confirmed",
    maxRetries: 10,
  });

  const { value: accountInfo } = await rpc
    .getAccountInfo(newAccount.address, { commitment: "confirmed" })
    .send();

  if (accountInfo?.data) {
    const decoded = CounterAccountCodec.decode(new Uint8Array(accountInfo.data[0]));
    console.log("After increment:", decoded);
  }

})();
