function greet(studentName) {
  return `Hello, ${studentName}! Software is life.`;
}

const students = [
  "Ava", "Liam", "Olivia", "Noah", "Emma"];

students.forEach((studentName) => {
  console.log(greet(studentName));
});