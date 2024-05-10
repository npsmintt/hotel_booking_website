console.log("Before attaching event listener");

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("finishBooking")
    .addEventListener("click", function () {
      console.log("Finish Booking Button Clicked");
      //Get the URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const checkInDate = urlParams.get("checkInDate");
      const checkOutDate = urlParams.get("checkOutDate");
      //Get the first name for the local storage
      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const email = document.getElementById("email").value.trim();
      const mobileNumber = document.getElementById("mobileNumber").value.trim();
      const city = document.getElementById("city").value.trim();
      const postcode = document.getElementById("postcode").value.trim();
      const fullAddress = document.getElementById("fullAddress").value.trim();
      const specialRequirements = document
        .getElementById("specialRequirements")
        .value.trim();
      const cardNumber = document.getElementById("cardNumber").value.trim();
      const expiryDate = document.getElementById("expiryDate").value.trim();
      const cvc = document.getElementById("cvc").value.trim();

      // Validate required fields
      if (
        !firstName ||
        !lastName ||
        !email ||
        !mobileNumber ||
        !city ||
        !postcode ||
        !fullAddress ||
        !specialRequirements ||
        !cardNumber ||
        !expiryDate ||
        !cvc
      ) {
        alert("Please fill in all required fields.");
        return;
      }

      // Validate card number length
      if (cardNumber.length !== 16) {
        alert("Please enter a valid 16-digit card number.");
        return;
      }

      const cvcRegex = /^[0-9]{3}$/;
      if (!cvcRegex.test(cvc)) {
        alert("Please enter a valid 3-digit CVC.");
        return;
      }

      // Handle the case when firstName is empty
      const sanitizedFirstName = firstName !== "" ? firstName : null;
      handleFinishBooking(checkInDate, checkOutDate, sanitizedFirstName);

      redirectToBookingReferencePage(
        checkInDate,
        checkOutDate,
        sanitizedFirstName
      );
    });

  function redirectToBookingReferencePage(
    checkInDate,
    checkOutDate,
    sanitizedFirstName
  ) {
    const bookingReferencePageUrl = `/booking-reference?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&firstName=${sanitizedFirstName}`;
    console.log(
      `Redirecting to booking-reference page: ${bookingReferencePageUrl}`
    );

    // Redirect to the booking-reference page
    window.location.href = bookingReferencePageUrl;
  }

  function handleFinishBooking(checkInDate, checkOutDate, sanitizedFirstName) {
    // Fetch the form data

    const urlParams = new URLSearchParams(window.location.search);

    const roomTypeCounts = [];

    // Iterate over roomTypes and roomCounts parameters
    urlParams.getAll("roomTypes").forEach((roomType, index) => {
      const count = parseInt(urlParams.getAll("roomCounts")[index]) || 0;
      roomTypeCounts.push({ type: roomType, count: count });
    });

    const formData = {
      firstName: sanitizedFirstName,
      lastName: document.getElementById("lastName").value,
      email: document.getElementById("email").value,
      fullAddress: document.getElementById("fullAddress").value,
      specialRequirements: document.getElementById("specialRequirements").value,
      cardNumber: document.getElementById("cardNumber").value,
      expiryDate: document.getElementById("expiryDate").value,
      cvc: document.getElementById("cvc").value,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      totalPrice: document.getElementById("sum-price").innerText,
      roomTypeCounts: roomTypeCounts,
    };

    console.log("Form Data:", formData);
    // Send the form data to the server
    fetch("/submit-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json()) 
      .then((data) => {
        console.log("Form submission response:", data);
        if (data.success) {
          console.log("Form submitted successfully!");
        } else {
          console.error("Failed to submit form:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
      
      });
  }
});
