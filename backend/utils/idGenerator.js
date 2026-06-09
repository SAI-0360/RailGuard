// backend/utils/idGenerator.js
// Generates unique IDs for defects and repairs in the format:
//   DEF-YYYYMMDD-NNN  (for defects)
//   RPR-YYYYMMDD-NNN  (for repairs)

const { DEFECT_ID_PREFIX, REPAIR_ID_PREFIX } = require("./constants");

let defectCounter = 0;
let repairCounter = 0;

function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function generateDefectId() {
  defectCounter += 1;
  return `${DEFECT_ID_PREFIX}${getDateString()}-${String(defectCounter).padStart(3, "0")}`;
}

function generateRepairId() {
  repairCounter += 1;
  return `${REPAIR_ID_PREFIX}${getDateString()}-${String(repairCounter).padStart(3, "0")}`;
}

module.exports = { generateDefectId, generateRepairId };
