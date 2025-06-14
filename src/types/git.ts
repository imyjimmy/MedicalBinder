export interface GitRepoData {
  url: string;
  name: string;
  token?: string;
}

export interface ClonedRepo {
  url: string;
  path: string;
  clonedAt: Date;
}