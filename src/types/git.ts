export interface GitRepoData {
  url: string;
  name: string;
  token?: string;
}

export interface ClonedRepo {
  url: string;
  path: string;
  name: string;
  clonedAt: Date;
  token: string;
}

export type ScanSuccessCallback = (name: string, repoUrl: string, localPath: string, token: string) => void;