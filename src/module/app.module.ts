export class AppModule {
  private static defaultInstance: AppModule;

  static getDefaultInstance(): AppModule {
    if (!AppModule.defaultInstance) {
      AppModule.defaultInstance = new AppModule();
    }
    return AppModule.defaultInstance;
  }

  private moduleClasses: Map<string, new () => any>;
  private moduleInstances: Map<string, any>;

  constructor() {
    this.moduleClasses = new Map();
    this.moduleInstances = new Map();
  }

  register(name: string, ModuleClass: new () => any) {
    if (!this.moduleClasses.has(name)) {
      this.moduleClasses.set(name, ModuleClass);
    }
  }

  resolve<T>(name: string): T {
    const ModuleClass = this.moduleClasses.get(name);
    if (!ModuleClass) {
      throw new Error(`Unknown module name: ${name}`);
    }

    if (!this.moduleInstances.has(name)) {
      this.moduleInstances.set(name, new ModuleClass());
    }

    return this.moduleInstances.get(name);
  }
}
