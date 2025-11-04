// programs/counter/src/lib.rs
#![allow(unexpected_cfgs)]

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize)]
enum InstructionType {
    Increment(u32),
    Decrement(u32),
}

#[derive(BorshSerialize, BorshDeserialize, Default)]
struct Counter {
    count: u32,
}

entrypoint!(counter_contract);

pub fn counter_contract(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let acc = next_account_info(&mut accounts.iter())?;

    if acc.owner != program_id {
        msg!("Account not owned by this program");
        return Err(ProgramError::IncorrectProgramId);
    }

    msg!("Parsing instruction...");
    let instruction_type = InstructionType::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    msg!("Deserializing counter data...");
    let mut counter_data = Counter::try_from_slice(&acc.data.borrow())?;

    match instruction_type {
        InstructionType::Increment(value) => {
            msg!("Executing Increment: value = {}", value);
            counter_data.count = counter_data.count.saturating_add(value);
        }
        InstructionType::Decrement(value) => {
            msg!("Executing Decrement: value = {}", value);
            counter_data.count = counter_data.count.saturating_sub(value);
        }
    }

    counter_data.serialize(&mut *acc.data.borrow_mut())?;
    msg!("Program succeeded... count = {}", counter_data.count);
    Ok(())
}
