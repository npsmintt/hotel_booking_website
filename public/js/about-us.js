/*
     Set the display of #team to none, so by default, only #about section will show on About Us page
     */

// Click to show and hide sections

document.querySelectorAll("main nav a").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    //this = the element trigger the function, for example, if #about is selected, this = #about
    const selectedSectionId = this.getAttribute("href").substring(1);
    //Ternary operator: if (selectedSectionId === 'about'), nonSelectedSectionId = 'team', vice versa
    const nonSelectedSectionId =
      selectedSectionId === "about" ? "team" : "about";
    //Hide the section that is not selected
    if (nonSelectedSectionId) {
      document.getElementById(nonSelectedSectionId).style.display = "none";
    }

    // Show the selected section
    document.getElementById(selectedSectionId).style.display = "block";
  });
});
