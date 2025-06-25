export interface NostrKeyPair {
  privateKey: string; // hex format
  publicKey: string;  // hex format
  npub: string;       // bech32 format (npub1...)
  nsec: string;       // bech32 format (nsec1...)
}

export interface NostrEvent {
  id: string;
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
  sig: string;
}

export interface NostrAuthChallenge {
  challenge: string;
  tag: string;
}

export interface NostrAuthResponse {
  status: string;
  pubkey?: string;
  metadata?: NostrProfile;
  token?: string;
  reason?: string;
}

export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  banner?: string;
}

export interface StoredNostrCredentials {
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  profile?: NostrProfile;
  lastLoginAt: string;
  serverToken?: string;
}