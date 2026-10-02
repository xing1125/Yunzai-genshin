// Local shim: re-export miao-plugin's models so the `#miao.models` subpath
// import resolves inside this package. Node forbids `../` in `imports` targets,
// so we use a plain relative import here (allowed) and point package.json's
// "#miao.models" at this file. Keeps upstream model/*.js untouched.
export * from '../miao-plugin/models/index.js'
