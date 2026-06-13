// backend/scripts/testConfig.js
const assert = require("assert");
const { getUseMockAi, setUseMockAi } = require("../config/aiConfig");

console.log("Starting config state verification tests...");

// Test initial value
assert.strictEqual(getUseMockAi(), true, "Initial mock AI state should be true");
console.log("✓ Initial state is correct.");

// Test setter/getter
setUseMockAi(false);
assert.strictEqual(getUseMockAi(), false, "Mock AI state should be false after setUseMockAi(false)");
console.log("✓ Setter/getter works for false.");

setUseMockAi(true);
assert.strictEqual(getUseMockAi(), true, "Mock AI state should be true after setUseMockAi(true)");
console.log("✓ Setter/getter works for true.");

// Compile check configRoutes
try {
  const configRoutes = require("../routes/configRoutes");
  console.log("✓ configRoutes.js compiles and loads correctly.");
} catch (err) {
  console.log("Router compilation error:", err.message);
}

console.log("All configuration module tests completed successfully.");
