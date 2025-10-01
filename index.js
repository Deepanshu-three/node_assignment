import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// Example assumptions (replace with exact values from your PDF)
const distances = {
  C1: { L1: 10, C2: 15, C3: 20 },
  C2: { L1: 12, C1: 15, C3: 18 },
  C3: { L1: 8, C1: 20, C2: 18 }
};

// Products stocked in centers
const stock = {
  C1: ["A", "B", "C"],
  C2: ["D", "E", "F"],
  C3: ["G", "H", "I"]
};

// Cost per km
const COST_PER_KM = 2;

// Function to calculate minimum cost
function calculateMinCost(order) {
  let totalCost = Infinity;

  for (let startCenter of Object.keys(stock)) {
    let cost = 0;
    let remainingOrder = { ...order };

    for (let product in remainingOrder) {
      if (remainingOrder[product] > 0) {
        let center = Object.keys(stock).find(c => stock[c].includes(product));
        if (!center) continue;

        if (center !== startCenter && startCenter !== "L1") {
          cost += distances[startCenter][center] * COST_PER_KM;
        }

        cost += distances[center]["L1"] * COST_PER_KM;

        startCenter = "L1";
      }
    }

    totalCost = Math.min(totalCost, cost);
  }

  return totalCost;
}

// API endpoint
app.post("/calculate", (req, res) => {
  const order = req.body;
  const minCost = calculateMinCost(order);
  res.json({ minimumCost: minCost });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
