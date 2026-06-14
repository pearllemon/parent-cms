// Public entrypoint for @our-org/cms-core.
// During development this re-exports from the parent CMS workspace so the
// child and parent share the exact same code path. When the package is
// published, the build step copies the workspace files into ./src/.
export * from "../../../src/cms-core/index";
