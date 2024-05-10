// grabbing the parent div element
let questions = document.querySelectorAll(".question");

// show answer on click
questions.forEach(function (question) {
  question.addEventListener("click", function toggleNav() {
    let answer = this.querySelector(":nth-child(2)");
    answer.classList.toggle("showFaq");
  });
});
