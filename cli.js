"use strict";

const chalk = require("chalk");
const commander = require("commander");
const envInfo = require("envinfo");
const fs = require("fs-extra");
const os = require("os");
const ora = require("ora");
const path = require("path");
const spawn = require("cross-spawn");

const packageJson = require("./package.json");

var babelTemp = require("./templates/babel");
var developmentTemp = require("./templates/development");
var indexJSXTemp = require("./templates/indexJSX");
var indexHTMLTemp = require("./templates/indexHTML");
var webpackTemp = require("./templates/webpack");

const spinner = ora("");

// These files should be allowed to remain on a failed install,
// but then silently removed during the next create.
const errorLogFilePatterns = [
  "npm-debug.log",
  "yarn-error.log",
  "yarn-debug.log"
];

let projectName;

const program = new commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments("<project-directory>")
  .usage(`${chalk.green("<project-directory>")} [options]`)
  .action(name => {
    projectName = name;
  })
  .option("--info", "print environment debug info")
  .allowUnknownOption()
  .on("--help", () => {
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("****************   add help info   ******************");
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  })
  .parse(process.argv);

//--info
if (program.info) {
  console.log(chalk.bold("\nEnvironment Info:"));
  return envInfo
    .run(
      {
        System: ["OS", "CPU"],
        Binaries: ["Node", "npm", "Yarn"],
        Browsers: ["Chrome", "Edge", "Internet Explorer", "Firefox", "Safari"],
        npmPackages: ["react", "react-dom", "react-scripts"],
        npmGlobalPackages: ["learn-cli"]
      },
      {
        duplicates: true,
        showNotFound: true
      }
    )
    .then(console.log);
}

//<project-directory> is undefined
if (typeof projectName === "undefined") {
  console.error("Please specify the project directory:");
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green("<project-directory>")}`
  );
  console.log();
  console.log("For example:");
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green("my-app")}`);
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
}

createApp(projectName, program);

function createApp(name, program) {
  const { useNpm } = program;

  const root = path.resolve(name);
  const appName = path.basename(root);

  spinner.start("loading...");
  //创建文件夹
  fs.ensureDirSync(name);
  if (!isSafeToCreateProjectIn(root, name)) {
    process.exit(1);
  }
  console.log(`Creating a new React app in ${chalk.green(root)}.\n`);
  //创建 package.json
  const packageJson = {
    name: appName,
    version: "0.1.0",
    main: "index.js",
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
      start: "webpack-dev-server"
    },
    license: "MIT"
  };
  //os.EOL 改行
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(packageJson, null, 2) + os.EOL
  );
  //process.chdir(root); node进入root的path
  process.chdir(root);
  fs.ensureDirSync("dist");
  fs.ensureDirSync("src");
  spinner.succeed("loading succeed.");

  if (useNpm) {
    console.log(`You are using ${chalk.green("npm")}.\n`);
    console.log(`Please change to use ${chalk.green("yarn")}.\n`);
    process.exit(1);
  }
  try {
    //使用yarn
    require("child_process").execSync("yarnpkg --version", { stdio: "ignore" });
    yarnInstall(root);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

function yarnInstall(root) {
  try {
    spinner.start("start installing...");
    // 安装包
    spawn.sync("yarn", ["init", "--yes"], { stdio: "inherit" });
    spawn.sync("yarn", ["install"], { stdio: "inherit" });
    spawn.sync(
      "yarn",
      [
        "add",
        "@babel/core",
        "babel-loader",
        "@babel/preset-env",
        "@babel/preset-react",
        "@babel/register",
        "webpack",
        "webpack-cli",
        "webpack-dev-server",
        "html-webpack-plugin",
        "--dev"
      ],
      { stdio: "inherit" }
    );
    spawn.sync("yarn", ["add", "react", "react-dom"], {
      stdio: "inherit"
    });
    //创建 .babelrc development.js src/index.html src/index.jsx .webpack.config.js
    fs.writeFileSync(path.join(root, ".babelrc"), babelTemp);
    fs.writeFileSync(path.join(root, "webpack.config.js"), webpackTemp);
    fs.writeFileSync(path.join(root, "development.js"), developmentTemp);
    fs.writeFileSync(path.join(root, "src/index.html"), indexHTMLTemp);
    fs.writeFileSync(path.join(root, "src/index.jsx"), indexJSXTemp);
    spinner.succeed("finish init.");
  } catch (err) {
    console.log(err);
    spinner.fail("finish fail.");
  }
}

function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    ".DS_Store",
    "Thumbs.db",
    ".git",
    ".gitignore",
    ".idea",
    "README.md",
    "LICENSE",
    ".hg",
    ".hgignore",
    ".hgcheck",
    ".npmignore",
    "mkdocs.yml",
    "docs",
    ".travis.yml",
    ".gitlab-ci.yml",
    ".gitattributes"
  ];
  console.log();
  const conflicts = fs
    .readdirSync(root)
    .filter(file => !validFiles.includes(file))
    .filter(file => !/\.iml$/.test(file))
    .filter(
      file => !errorLogFilePatterns.some(pattern => file.indexOf(pattern) === 0)
    );

  if (conflicts.length > 0) {
    console.log(
      `The directory ${chalk.green(name)} contains files that could conflict:\n`
    );
    for (const file of conflicts) {
      console.log(`  ${file}`);
    }
    console.log(
      `\nEither try using a new directory name, or remove the files listed above.`
    );
    return false;
  }

  // Remove any remnant files from a previous installation
  const currentFiles = fs.readdirSync(path.join(root));
  currentFiles.forEach(file => {
    errorLogFilePatterns.forEach(errorLogFilePattern => {
      // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
      if (file.indexOf(errorLogFilePattern) === 0) {
        fs.removeSync(path.join(root, file));
      }
    });
  });
  return true;
}
