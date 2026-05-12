from __future__ import annotations

import hashlib
import json
import os
import secrets
import struct
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from solana.rpc.api import Client
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.transaction import Transaction

LAMPORTS_PER_SOL = 1_000_000_000
SYSTEM_PROGRAM_ID = Pubkey.from_string("11111111111111111111111111111111")


class ChainIntegrationError(RuntimeError):
    pass


@dataclass(slots=True)
class CampaignChainTx:
    campaign_pda: str
    bump: int
    signature: str
    program_id: str
    cluster: str


def get_cluster_name() -> str:
    return os.environ.get("KERN_SOLANA_CLUSTER", "devnet")


def get_rpc_url() -> str:
    return os.environ.get("KERN_SOLANA_RPC_URL", "https://api.devnet.solana.com")


def get_program_id() -> Pubkey:
    program_id = os.environ.get("KERN_PROGRAM_ID")
    if not program_id:
        raise ChainIntegrationError(
            "KERN_PROGRAM_ID is required for devnet Solana transactions"
        )
    return Pubkey.from_string(program_id)


def get_platform_treasury() -> Pubkey:
    treasury = os.environ.get("KERN_TREASURY_PUBKEY")
    if not treasury:
        # Fallback treasury for dev/hackathon purposes
        return Pubkey.from_string("11111111111111111111111111111111")
    return Pubkey.from_string(treasury)


def get_oracle_authority_pubkey() -> Pubkey:
    oracle = os.environ.get("KERN_ORACLE_PUBKEY")
    if oracle:
        return Pubkey.from_string(oracle)
    return load_authority_keypair().pubkey()


def load_authority_keypair() -> Keypair:
    # 1. Try loading from environment variable first (Best for Vercel/Production)
    env_key = os.environ.get("KERN_ORACLE_SECRET_KEY")
    if env_key:
        try:
            secret_key = json.loads(env_key)
            return Keypair.from_bytes(bytes(secret_key))
        except Exception as exc:
            raise ChainIntegrationError(f"Invalid KERN_ORACLE_SECRET_KEY env var: {exc}")

    # 2. Fallback to file path (Local development)
    keypair_path = os.environ.get("KERN_SOLANA_KEYPAIR_PATH") or os.environ.get(
        "SOLANA_KEYPAIR_PATH"
    )
    if not keypair_path:
        keypair_path = str(Path.home() / ".config" / "solana" / "id.json")

    try:
        secret_key = json.loads(
            Path(keypair_path).expanduser().read_text(encoding="utf-8")
        )
    except FileNotFoundError as exc:
        raise ChainIntegrationError(
            f"Solana keypair file not found: {keypair_path}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise ChainIntegrationError(
            f"Invalid Solana keypair JSON in {keypair_path}"
        ) from exc

    try:
        return Keypair.from_bytes(bytes(secret_key))
    except Exception as exc:  # pragma: no cover - defensive conversion guard
        raise ChainIntegrationError(
            f"Unable to load Solana keypair from {keypair_path}"
        ) from exc


def get_rpc_client() -> Client:
    return Client(get_rpc_url())


def generate_campaign_seed() -> int:
    return secrets.randbits(64)


def derive_campaign_pda(
    creator_wallet: str,
    seed: int,
    program_id: str | Pubkey | None = None,
) -> tuple[str, int]:
    creator = Pubkey.from_string(creator_wallet)

    if program_id is None:
        resolved_program_id = get_program_id()
    elif isinstance(program_id, Pubkey):
        resolved_program_id = program_id
    else:
        resolved_program_id = Pubkey.from_string(program_id)

    campaign_pda, bump = Pubkey.find_program_address(
        [b"campaign", bytes(creator), seed.to_bytes(8, "little", signed=False)],
        resolved_program_id,
    )
    return str(campaign_pda), bump


def sol_to_lamports(amount_sol: float | int | str | Decimal) -> int:
    amount = Decimal(str(amount_sol))
    return int((amount * LAMPORTS_PER_SOL).to_integral_value(rounding=ROUND_HALF_UP))


def lamports_to_sol(amount_lamports: int) -> Decimal:
    return Decimal(amount_lamports) / LAMPORTS_PER_SOL


def _anchor_discriminator(method_name: str) -> bytes:
    return hashlib.sha256(f"global:{method_name}".encode("utf-8")).digest()[:8]


def _send_instruction(instruction: Instruction) -> str:
    client = get_rpc_client()
    payer = load_authority_keypair()
    blockhash_response = client.get_latest_blockhash()
    blockhash = blockhash_response.value.blockhash

    transaction = Transaction.new_signed_with_payer(
        [instruction], payer.pubkey(), [payer], blockhash
    )
    result = client.send_transaction(transaction)
    signature = result.value
    return str(signature)


def build_initialize_campaign_instruction(
    creator_wallet: str,
    seed: int,
    budget_lamports: int,
    rate_per_1k_lamports: int,
    program_id: Pubkey | None = None,
    payer_wallet: str | None = None,
    oracle_authority_wallet: str | None = None,
) -> tuple[Instruction, str, int, Pubkey]:
    creator_pubkey = Pubkey.from_string(creator_wallet)
    resolved_program_id = program_id or get_program_id()
    campaign_pda, bump = derive_campaign_pda(creator_wallet, seed, resolved_program_id)
    campaign_pubkey = Pubkey.from_string(campaign_pda)

    if payer_wallet and payer_wallet != creator_wallet:
        raise ChainIntegrationError("Initialize campaign requires creator as payer.")

    payer_pubkey = creator_pubkey
    if oracle_authority_wallet:
        oracle_authority = Pubkey.from_string(oracle_authority_wallet)
    else:
        oracle_authority = get_oracle_authority_pubkey()
    platform_treasury = get_platform_treasury()

    data = b"".join(
        [
            _anchor_discriminator("initialize_campaign"),
            struct.pack("<Q", seed),
            struct.pack("<Q", budget_lamports),
            struct.pack("<Q", rate_per_1k_lamports),
        ]
    )

    instruction = Instruction(
        resolved_program_id,
        data,
        [
            AccountMeta(campaign_pubkey, False, True),
            AccountMeta(payer_pubkey, True, True),
            AccountMeta(oracle_authority, False, False),
            AccountMeta(platform_treasury, False, True),
            AccountMeta(SYSTEM_PROGRAM_ID, False, False),
        ],
    )
    return instruction, campaign_pda, bump, resolved_program_id


def build_execute_payout_instruction(
    creator_wallet: str,
    seed: int,
    clipper_wallet: str,
    amount_lamports: int,
    program_id: str | Pubkey | None = None,
) -> tuple[Instruction, str, Pubkey]:
    if program_id is None:
        resolved_program_id = get_program_id()
    elif isinstance(program_id, Pubkey):
        resolved_program_id = program_id
    else:
        resolved_program_id = Pubkey.from_string(program_id)
    campaign_pda, _ = derive_campaign_pda(creator_wallet, seed, resolved_program_id)
    campaign_pubkey = Pubkey.from_string(campaign_pda)
    clipper_pubkey = Pubkey.from_string(clipper_wallet)
    payer = load_authority_keypair()
    platform_treasury = get_platform_treasury()

    data = b"".join(
        [
            _anchor_discriminator("execute_payout"),
            struct.pack("<Q", amount_lamports),
        ]
    )

    instruction = Instruction(
        resolved_program_id,
        data,
        [
            AccountMeta(campaign_pubkey, False, True),
            AccountMeta(payer.pubkey(), True, True),
            AccountMeta(clipper_pubkey, False, True),
            AccountMeta(platform_treasury, False, True),
            AccountMeta(SYSTEM_PROGRAM_ID, False, False),
        ],
    )
    return instruction, campaign_pda, resolved_program_id


def build_unsigned_campaign_transaction(
    creator_wallet: str,
    seed: int,
    budget_lamports: int,
    rate_per_1k_lamports: int,
) -> tuple[str, str, int, str]:
    """
    Build an unsigned transaction for campaign initialization.
    Returns: (serialized_tx_base64, campaign_pda, bump, program_id)

    Creator will sign this transaction with their wallet and submit it back.
    The creator is the payer, not the backend.
    """
    import base64

    # Pass creator_wallet as payer_wallet so we don't need to load backend keypair
    oracle_wallet = os.environ.get("KERN_ORACLE_PUBKEY") or creator_wallet
    instruction, campaign_pda, bump, program_id = build_initialize_campaign_instruction(
        creator_wallet=creator_wallet,
        seed=seed,
        budget_lamports=budget_lamports,
        rate_per_1k_lamports=rate_per_1k_lamports,
        payer_wallet=creator_wallet,  # Creator is the payer for their own transaction
        oracle_authority_wallet=oracle_wallet,
    )

    client = get_rpc_client()
    blockhash_response = client.get_latest_blockhash()
    blockhash = blockhash_response.value.blockhash

    # Build transaction without signing (creator will sign it)
    payer_pubkey = Pubkey.from_string(creator_wallet)
    message = Message.new_with_blockhash([instruction], payer_pubkey, blockhash)
    transaction = Transaction.new_unsigned(message)

    # Serialize to base64 so frontend can deserialize and sign
    serialized = base64.b64encode(bytes(transaction)).decode("utf-8")

    return serialized, campaign_pda, bump, str(program_id)


def submit_signed_transaction(signed_tx_base64: str) -> str:
    """
    Submit a transaction that has already been signed by the creator.
    Returns: transaction signature
    """
    import base64

    try:
        tx_bytes = base64.b64decode(signed_tx_base64)
        transaction = Transaction.from_bytes(tx_bytes)
    except Exception as exc:
        raise ChainIntegrationError(
            f"Failed to deserialize transaction: {exc}"
        ) from exc

    client = get_rpc_client()
    try:
        result = client.send_transaction(transaction)
        signature = result.value
        return str(signature)
    except Exception as exc:
        raise ChainIntegrationError(f"Failed to submit transaction: {exc}") from exc


def send_initialize_campaign(
    creator_wallet: str,
    seed: int,
    budget_lamports: int,
    rate_per_1k_lamports: int,
) -> CampaignChainTx:
    instruction, campaign_pda, bump, program_id = build_initialize_campaign_instruction(
        creator_wallet=creator_wallet,
        seed=seed,
        budget_lamports=budget_lamports,
        rate_per_1k_lamports=rate_per_1k_lamports,
    )
    signature = _send_instruction(instruction)
    return CampaignChainTx(
        campaign_pda=campaign_pda,
        bump=bump,
        signature=signature,
        program_id=str(program_id),
        cluster=get_cluster_name(),
    )


def send_execute_payout(
    creator_wallet: str,
    seed: int,
    clipper_wallet: str,
    amount_lamports: int,
    program_id: str | Pubkey | None = None,
) -> str:
    instruction, _, _ = build_execute_payout_instruction(
        creator_wallet=creator_wallet,
        seed=seed,
        clipper_wallet=clipper_wallet,
        amount_lamports=amount_lamports,
        program_id=program_id,
    )
    return _send_instruction(instruction)
