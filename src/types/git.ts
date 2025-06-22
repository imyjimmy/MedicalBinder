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
}

export type ScanSuccessCallback = (name: string, repoUrl: string, localPath: string) => void;