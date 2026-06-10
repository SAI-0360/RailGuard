const http = require("http");

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting backend API tests...");
  const baseOpts = {
    hostname: "localhost",
    port: 3001,
    headers: {
      "Content-Type": "application/json"
    }
  };

  try {
    // Test 1: Simulate vibration spike on SEG-042
    console.log("\n--- Test 1: Simulating vibration spike on SEG-042 ---");
    const spikeRes = await makeRequest(
      { ...baseOpts, path: "/api/segments/SEG-042/simulate", method: "POST" },
      { action: "spike", value: 9.5 }
    );
    console.log("Status Code:", spikeRes.statusCode);
    if (spikeRes.statusCode === 200 && spikeRes.body.segment) {
      const seg = spikeRes.body.segment;
      console.log("Segment ID:", seg.segmentId);
      console.log("Current vibrationLevel:", seg.vibrationLevel);
      console.log("History length:", seg.vibrationHistory.length);
      
      // Verify progressive spike history generation
      const history = seg.vibrationHistory;
      const firstVal = history[0].vibrationLevel;
      const lastVal = history[history.length - 1].vibrationLevel;
      console.log(`First history point: ${firstVal} mm/s`);
      console.log(`Last history point: ${lastVal} mm/s`);
      
      if (lastVal > firstVal && Math.abs(lastVal - 9.5) < 0.5) {
        console.log("✅ PASS: Progressive spike history ramp generated successfully.");
      } else {
        console.log("❌ FAIL: Progressive spike history ramp was NOT generated properly.");
      }
    } else {
      console.log("❌ FAIL: Failed to simulate vibration spike", spikeRes.body);
    }

    // Test 2: Trigger scenario critical_degrade
    console.log("\n--- Test 2: Running critical_degrade scenario ---");
    const degradeRes = await makeRequest(
      { ...baseOpts, path: "/api/demo/scenario", method: "POST" },
      { scenario: "critical_degrade" }
    );
    console.log("Status Code:", degradeRes.statusCode);
    if (degradeRes.statusCode === 200) {
      console.log("Message:", degradeRes.body.message);
      console.log("Segment status:", degradeRes.body.segment.status);
      console.log("Segment riskScore:", degradeRes.body.segment.riskScore);
      console.log("✅ PASS: critical_degrade scenario completed successfully.");
    } else {
      console.log("❌ FAIL: Failed to trigger critical_degrade", degradeRes.body);
    }

    // Test 3: Trigger clear_all scenario
    console.log("\n--- Test 3: Running clear_all scenario ---");
    const clearRes = await makeRequest(
      { ...baseOpts, path: "/api/demo/scenario", method: "POST" },
      { scenario: "clear_all" }
    );
    console.log("Status Code:", clearRes.statusCode);
    if (clearRes.statusCode === 200) {
      console.log("Message:", clearRes.body.message);
      console.log("✅ PASS: clear_all scenario completed successfully.");
    } else {
      console.log("❌ FAIL: Failed to trigger clear_all", clearRes.body);
    }

  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

runTests();
