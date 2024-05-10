// Change the order of each item when clicking '>' button
document.querySelectorAll(".s_button")[1].onclick = () => {
  //get all items
  let lists = document.querySelectorAll(".item");
  //when the user click the button, put the first item to the last item, so the second item will become the first item, the third item becomes the second item
  document.querySelector("#slide").appendChild(lists[0]);
};

// Change the order of each item when clicking '<' button
document.querySelectorAll(".s_button")[0].onclick = () => {
  //get all items
  let lists = document.querySelectorAll(".item");
  //when the user click the button, put the last item to the first item
  document.querySelector("#slide").prepend(lists[lists.length - 1]);
};


var viewMoreButtons = document.querySelectorAll(".viewMore");

// Attach the click event to each button
viewMoreButtons.forEach(function (button) {
  button.onclick = function () {
    window.location.href = "/rooms-facilities";
  };
});
