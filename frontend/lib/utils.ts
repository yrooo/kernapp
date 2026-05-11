import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanWalletAddress(address: string | null | undefined): string {
  if (!address) return "";
  const prefixes = ["web3:solana:", "web3:ethereum:", "web3:base:", "web3:"];
  const lowerAddress = address.toLowerCase();
  for (const prefix of prefixes) {
    if (lowerAddress.startsWith(prefix)) {
      return address.slice(prefix.length);
    }
  }
  return address;
}
