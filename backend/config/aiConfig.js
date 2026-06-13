// backend/config/aiConfig.js
// Hosts the mutable runtime state for the Mock AI toggle.
// Defaults to true to conserve API limits by default.

let useMockAiRuntime = true;

module.exports = {
  getUseMockAi: () => useMockAiRuntime,
  setUseMockAi: (val) => {
    useMockAiRuntime = !!val;
    return useMockAiRuntime;
  }
};
