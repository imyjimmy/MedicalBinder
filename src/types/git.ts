export interface GitRepoData {
  baseUrl: string;
  url: string;
  name: string;
  token?: string;
}

export interface ClonedRepo {
  baseUrl: string;
  url: string;
  path: string;
  name: string;
  clonedAt: Date;
  token: string;
}

export type ScanSuccessCallback = (name: string, baseUrl: string, url: string, localPath: string, token: string) => void;