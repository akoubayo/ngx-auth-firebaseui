import {chain, noop, Rule, SchematicContext, Tree} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {
  addModuleImportToRootModule,
  addPackageJsonDependency,
  getProjectFromWorkspace,
  getWorkspace,
  NodeDependency,
  NodeDependencyType
} from 'schematics-utilities';

/** Loads the full version from the given Angular package gracefully. */
function loadPackageVersionGracefully(): string | null {
  try {
    console.log('ngx-auth-firebaseui version = ', require(`../../package.json`).version);
    return require(`../../package.json`).version;
  } catch {
    return null;
  }
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function addPackageJsonDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {

    const ngCoreVersionTag = getPackageVersionFromPackageJson(host, '@angular/core');

    const dependencies: NodeDependency[] = [
      {type: NodeDependencyType.Default, version: loadPackageVersionGracefully() || '3.2.3', name: 'ngx-auth-firebaseui'},
      {type: NodeDependencyType.Default, version: ngCoreVersionTag || '8.1.1', name: '@angular/animations'},
      {type: NodeDependencyType.Default, version: ngCoreVersionTag || '8.1.1', name: '@angular/forms'},
      {type: NodeDependencyType.Default, version: ngCoreVersionTag || '8.1.1', name: '@angular/router'},
      {type: NodeDependencyType.Default, version: '^8.0.0-beta.26', name: '@angular/flex-layout'},
      {type: NodeDependencyType.Default, version: '^5.2.1', name: 'angularfire2'},
      {type: NodeDependencyType.Default, version: '^6.3.40', name: 'firebase'}
    ];

    dependencies.forEach(dependency => {
      addPackageJsonDependency(host, dependency);
      context.logger.log('info', `✅️ Added "${dependency.name}" into ${dependency.type}`);
    });

    return host;
  };
}

export function installPackageJsonDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    context.logger.log('info', `🔍 Installing packages...`);

    return host;
  };
}

export function addModuleToImports(options: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    const project = getProjectFromWorkspace(
      workspace,
      // Takes the first project in case it's not provided by CLI
      options.project ? options.project : Object.keys(workspace['projects'])[0]
    );

    // const x =
    //   `apiKey: 'your-firebase-apiKey',
    //   authDomain: 'your-firebase-authDomain',
    //   databaseURL: 'your-firebase-databaseURL',
    //   projectId: 'your-firebase-projectId',
    //   storageBucket: 'your-firebase-storageBucket',
    //   messagingSenderId: 'your-firebase-messagingSenderId'`;
    const moduleName = `NgxAuthFirebaseUIModule.forRoot(PUT_YOUR_FIREBASE_API_KEY_HERE)`;

    addModuleImportToRootModule(host, moduleName, 'ngx-auth-firebaseui', project);

    context.logger.log('info', `✅️ "${moduleName}" is imported`);

    return host;
  };
}

/** Gets the version of the specified package by looking at the package.json in the given tree. */
export function getPackageVersionFromPackageJson(tree: Tree, name: string): string | null {
  if (!tree.exists('package.json')) {
    return null;
  }

  const packageJson = JSON.parse(tree.read('package.json')!.toString('utf8'));

  if (packageJson.dependencies && packageJson.dependencies[name]) {
    return packageJson.dependencies[name];
  }

  return null;
}

function addLibAssetsToAssets(options: any) {
  return (host: Tree, context: SchematicContext) => {
    const ngxAuthFirebaseui = 'ngx-auth-firebaseui';
    const assetPath = 'node_modules/ngx-auth-firebaseui/assets/';

    try {
      const angularJsonFile = host.read('angular.json');

      if (angularJsonFile) {
        const angularJsonFileObject = JSON.parse(angularJsonFile.toString('utf-8'));
        const project = options.project ? options.project : Object.keys(angularJsonFileObject['projects'])[0];
        const projectObject = angularJsonFileObject.projects[project];
        const assets = projectObject.architect.build.options.assets;
        context.logger.log('info', `"${assets}`);

        assets.push({
          glob: '**/*',
          input: assetPath,
          output: './assets/'
        });
        host.overwrite('angular.json', JSON.stringify(angularJsonFileObject, null, 2));
        context.logger.log('info', `✅️ Added "${ngxAuthFirebaseui}" icons to assets`);
      }
    } catch (e) {
      context.logger.log('error', `🚫 Failed to add the icons "${ngxAuthFirebaseui}" to assets`);
      context.logger.log('error', e);
    }

    return host;
  };
}

export default function (options: any): Rule {
  return chain([
    options && options.skipPackageJson ? noop() : addPackageJsonDependencies(),
    options && options.skipPackageJson ? noop() : installPackageJsonDependencies(),
    options && options.skipModuleImport ? noop() : addModuleToImports(options),
    options && options.skipPolyfill ? noop() : addLibAssetsToAssets(options)
  ]);
}
