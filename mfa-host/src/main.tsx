// Module Federation bootstrap pattern: async boundary ensures
// all shared modules (react, react-dom) are loaded before the app starts.
import("./bootstrap")
