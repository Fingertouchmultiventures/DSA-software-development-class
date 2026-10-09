function greet(studentName) {
  return `Hello, ${studentName}! Software is life.`;
}

const students = [
  "Ava", "Liam", "Olivia", "Noah", "Emma",
  "Oliver", "Amelia", "Elijah", "Sophia", "James",
  "Isabella", "William", "Mia", "Benjamin", "Charlotte",
  "Lucas", "Evelyn", "Henry", "Harper", "Alexander",
  "Luna", "Mason", "Camila", "Michael", "Gianna",
  "Ethan", "Elizabeth", "Daniel", "Eleanor", "Jacob",
  "Ella", "Logan", "Abigail", "Jackson", "Sofia",
  "Levi", "Avery", "Sebastian", "Scarlett", "Mateo",
  "Emily", "Jack", "Aria", "Owen", "Penelope",
  "Theodore", "Chloe", "Aiden", "Layla", "Samuel",
];

students.forEach((studentName) => {
  console.log(greet(studentName));
});
