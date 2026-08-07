// This project was scaffolded as a JS project and had TypeScript added
// incrementally (see tsconfig.json), so it's missing the ambient
// module declaration create-next-app's TS template normally ships for
// global CSS side-effect imports (e.g. `import '../styles/globals.css'`
// in _app.tsx). Without this, `next build`'s type check fails on that
// import even though webpack handles the actual CSS fine at runtime.
declare module '*.css';
