// backend/routes/workOrderRoutes.js
// Routes for auto-generated work orders.
// GET /api/work-orders         — return all work orders
// GET /api/work-orders?status=pending — filter by status
//
// Uses factory pattern: server.js passes the workOrders array reference in.

const express = require("express");

/**
 * Creates the work order router with injected workOrders array.
 * @param {Array} workOrders — reference to the global workOrders array in server.js
 * @returns {express.Router}
 */
function createWorkOrderRoutes(workOrders) {
  const router = express.Router();

  // GET /api/work-orders
  router.get("/", (req, res) => {
    const { status } = req.query;
    if (status) {
      const filtered = workOrders.filter(wo => wo.status === status);
      return res.json({ workOrders: filtered });
    }
    res.json({ workOrders });
  });

  return router;
}

module.exports = createWorkOrderRoutes;
