async function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}


console.log("Waiting for 2 seconds...");
await wait(10000, "Done waiting!").then((result) => {
  console.log(result);
});
console.log("This will log immediately, before the wait is complete.");