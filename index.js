import express from "express";

const app = express();
// Use the modern, built-in body-parser equivalent
app.use(express.json());

// --- ACCURATE DATA FROM THE DOCUMENT ---

// Product weights and their respective centers [cite: 11]
const PRODUCTS = {
    'A': { weight: 3, center: 'C1' },
    'B': { weight: 2, center: 'C1' },
    'C': { weight: 8, center: 'C1' },
    'D': { weight: 12, center: 'C2' },
    'E': { weight: 25, center: 'C2' },
    'F': { weight: 15, center: 'C2' },
    'G': { weight: 0.5, center: 'C3' },
    'H': { weight: 1, center: 'C3' },
    'I': { weight: 2, center: 'C3' }, // Assumption for the unnamed 2kg item [cite: 11]
};

// Distances between all locations as interpreted from the diagram [cite: 15, 22, 23, 24, 25, 26, 28, 29]
const DISTANCES = {
    C1: { C2: 3, C3: 5, L1: 4 },
    C2: { C1: 3, C3: 2, L1: 2.5 },
    C3: { C1: 5, C2: 2, L1: 3 },
    L1: { C1: 4, C2: 2.5, C3: 3 },
};

const CENTERS = ['C1', 'C2', 'C3'];

// --- CORE LOGIC FUNCTIONS ---

/**
 * Calculates the variable cost per unit distance based on the weight of a shipment.
 * @param {number} weight - The total weight of the products for a trip.
 * @returns {number} The cost per unit of distance for that weight. 
 */
function calculateCostPerUnitDistance(weight) {
    if (weight <= 0) return 0;
    if (weight <= 5) return 10;
    // Cost is 10 for the first 5kg, plus 8 for each additional 5kg block. 
    return 10 + Math.ceil((weight - 5) / 5) * 8;
}

/**
 * Calculates the total cost for a specific delivery route, considering the start base
 * and the sequence of pickups.
 * @param {string} startCenter - The starting base for the vehicle ('C1', 'C2', or 'C3').
 * @param {string[]} pickupOrder - An array of center names in the order they will be visited.
 * @param {Object} centerWeights - An object mapping center names to their total order weight.
 * @returns {number} The total cost for this specific route.
 */
function calculateRouteCost(startCenter, pickupOrder, centerWeights) {
    if (pickupOrder.length === 0) {
        return 0;
    }

    let totalCost = 0;
    const firstPickup = pickupOrder[0];

    // Cost for the first trip: Start Base -> First Pickup Center -> L1. 
    // The travel from base to pickup is 0 if the base is the pickup center.
    const firstTripDistance = (startCenter === firstPickup ? 0 : DISTANCES[startCenter][firstPickup]) + DISTANCES[firstPickup]['L1'];
    const firstTripWeight = centerWeights[firstPickup];
    totalCost += firstTripDistance * calculateCostPerUnitDistance(firstTripWeight);

    // Cost for all subsequent trips: L1 -> Next Pickup Center -> L1. 
    for (let i = 1; i < pickupOrder.length; i++) {
        const subsequentPickup = pickupOrder[i];
        // This is a round trip from L1 to the pickup center and back to L1.
        const subsequentTripDistance = DISTANCES['L1'][subsequentPickup] + DISTANCES[subsequentPickup]['L1'];
        const subsequentTripWeight = centerWeights[subsequentPickup];
        totalCost += subsequentTripDistance * calculateCostPerUnitDistance(subsequentTripWeight);
    }

    return totalCost;
}

// Helper function to get all permutations of an array. This is needed to test
// every possible pickup order to find the true minimum cost.
function getPermutations(array) {
    if (array.length === 0) return [[]];
    const firstEl = array[0];
    const rest = array.slice(1);
    const permsWithoutFirst = getPermutations(rest);
    const allPermutations = [];
    permsWithoutFirst.forEach(perm => {
        for (let i = 0; i <= perm.length; i++) {
            const permWithFirst = [...perm.slice(0, i), firstEl, ...perm.slice(i)];
            allPermutations.push(permWithFirst);
        }
    });
    return allPermutations;
}

// --- API ENDPOINT ---

app.post("/calculate", (req, res) => {
    const order = req.body; // The JSON payload of product quantities. [cite: 31, 41]

    // 1. Group the order by center and calculate the total weight for each center.
    const centerWeights = {};
    for (const product in order) {
        if (PRODUCTS[product] && order[product] > 0) {
            const { weight, center } = PRODUCTS[product];
            const quantity = order[product];
            centerWeights[center] = (centerWeights[center] || 0) + (weight * quantity);
        }
    }

    const requiredCenters = Object.keys(centerWeights);
    if (requiredCenters.length === 0) {
        return res.json({ minimum_cost: 0 });
    }

    let minimumCost = Infinity;

    // 2. Iterate through each possible starting center (C1, C2, C3) to find the cheapest option. [cite: 17]
    CENTERS.forEach(startCenter => {
        let costForThisStart = Infinity;
        
        // 3. Find the best order of pickups for this specific starting base.
        // The choice of which center to visit first can change the total cost.
        const pickupPermutations = getPermutations(requiredCenters);
        
        pickupPermutations.forEach(pickupOrder => {
            const currentRouteCost = calculateRouteCost(startCenter, pickupOrder, centerWeights);
            if (currentRouteCost < costForThisStart) {
                costForThisStart = currentRouteCost;
            }
        });
        
        // 4. Update the overall minimum cost.
        if (costForThisStart < minimumCost) {
            minimumCost = costForThisStart;
        }
    });

    res.json({ minimum_cost: minimumCost });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});