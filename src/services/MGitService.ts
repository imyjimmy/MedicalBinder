import {NativeModules} from 'react-native';

interface MGitModule {
  clone: (url: string, localPath: string, options?: any) => Promise<any>;
  pull: (repositoryPath: string, options?: any) => Promise<any>;
  commit: (repositoryPath: string, message: string, options?: any) => Promise<any>;
  createMCommit: (
    repositoryPath: string,
    message: string,
    authorName: string,
    authorEmail: string,
    nostrPubkey: string
  ) => Promise<any>;
  testMCommitHash: (
    repositoryPath: string,
    commitHash: string,
    nostrPubkey: string
  ) => Promise<any>;
}

class MGitService {
  private static mgitModule: MGitModule | null = null;

  private static getMGitModule(): MGitModule | null {
    if (!this.mgitModule) {
      try {
        this.mgitModule = NativeModules.MGitModule;
      } catch (error) {
        console.warn('MGitModule not available:', error);
        return null;
      }
    }
    return this.mgitModule;
  }

  static async testConnection(): Promise<boolean> {
    const module = this.getMGitModule();
    if (!module) {
      return false;
    }

    // Test if the module is properly linked by checking if methods exist
    return (
      typeof module.clone === 'function' &&
      typeof module.commit === 'function' &&
      typeof module.createMCommit === 'function'
    );
  }

  static async cloneRepository(
    url: string,
    localPath: string,
    options: any = {}
  ): Promise<any> {
    const module = this.getMGitModule();
    if (!module) {
      throw new Error('MGit module not available');
    }

    return module.clone(url, localPath, options);
  }

  static async pullRepository(
    repositoryPath: string,
    options: any = {}
  ): Promise<any> {
    const module = this.getMGitModule();
    if (!module) {
      throw new Error('MGit module not available');
    }

    return module.pull(repositoryPath, options);
  }

  static async createCommit(
    repositoryPath: string,
    message: string,
    options: any = {}
  ): Promise<any> {
    const module = this.getMGitModule();
    if (!module) {
      throw new Error('MGit module not available');
    }

    return module.commit(repositoryPath, message, options);
  }

  static async createMCommit(
    repositoryPath: string,
    message: string,
    authorName: string,
    authorEmail: string,
    nostrPubkey: string
  ): Promise<any> {
    const module = this.getMGitModule();
    if (!module) {
      throw new Error('MGit module not available');
    }

    return module.createMCommit(
      repositoryPath,
      message,
      authorName,
      authorEmail,
      nostrPubkey
    );
  }

  static async testMCommitHash(
    repositoryPath: string,
    commitHash: string,
    nostrPubkey: string
  ): Promise<any> {
    const module = this.getMGitModule();
    if (!module) {
      throw new Error('MGit module not available');
    }

    return module.testMCommitHash(repositoryPath, commitHash, nostrPubkey);
  }
}

export default MGitService;
