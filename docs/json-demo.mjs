const event = {id: `event1`, city: "Lagos", date: "2026-12-12", tiers: {general: true, VIP: true, couples: true, "table for 2": true, "table for 4": true, "table for 8": true, "table for 10": true}}

const text = JSON.stringify(event);

console.log(text);
console.log(JSON.parse(text));

//{id: `event1`, city: "Lagos", date: "2026-12-12", tiers: {general: true, VIP: true, couples: true, "table for 2": true, "table for 4": true, "table for 8": true, "table for 10": true}}
