export class AppModule {
  private static defaultInstance: AppModule;

  static getDefaultInstance(): AppModule {
    if (!AppModule.defaultInstance) {
      AppModule.defaultInstance = new AppModule();
    }
    return AppModule.defaultInstance;
  }

  private moduleClasses: Set<new () => any>;
  private moduleInstances: Map<new () => any, any>;

  constructor() {
    this.moduleClasses = new Set();
    this.moduleInstances = new Map();
  }

  register(ModuleClass: new () => any) {
    if (!this.moduleClasses.has(ModuleClass)) {
      this.moduleClasses.add(ModuleClass);
    }
  }

  resolve<T extends new () => any>(ModuleClass: T): InstanceType<T> {
    if (!this.moduleClasses.has(ModuleClass)) {
      throw new Error("Module class is not registered");
    }

    if (!this.moduleInstances.has(ModuleClass)) {
      this.moduleInstances.set(ModuleClass, new ModuleClass());
    }

    return this.moduleInstances.get(ModuleClass);
  }
}
