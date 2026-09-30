// Vitest stub for the "server-only" package. Next.js maps this import to an
// error-throwing module for client bundles; under vitest it just needs to
// resolve to a no-op so server modules can be unit-tested.
const noop = {};
export default noop;
