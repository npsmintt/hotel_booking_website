
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("proceedToPay")
    .addEventListener("click", function () {
      console.log("Proceed to Pay Button Clicked");

      // Fetch check-in and check-out date
      const checkInDate = document.getElementById("checkInDate").value;
      const checkOutDate = document.getElementById("checkOutDate").value;

      // Find the selected rooms
        const selectedRooms = findSelectedRooms();
        console.log("Selected Rooms:", selectedRooms);

      // Fetch the prices for all selected rooms concurrently
      Promise.all(selectedRooms.map((room) => fetchRoomPrice(room.type)))
        .then((roomPrices) => {
          // Filter out rooms for which price could not be fetched
          const validRoomPrices = roomPrices.filter((price) => price !== null);
          // Calculate total price for all selected rooms
          const numRooms = parseInt(document.getElementById("numRooms").value);
          const totalPrice = calculateTotalPrice(
            validRoomPrices,
            checkInDate,
            checkOutDate,
            numRooms
          );

          console.log("checkInDate:", checkInDate);
          console.log("checkOutDate:", checkOutDate);
          console.log("selectedRooms:", selectedRooms);
          console.log("totalPrice:", totalPrice);

          // Redirect to the payment page with selected date, room types, and total price
          redirectToPaymentPage(
            checkInDate,
            checkOutDate,
            selectedRooms,
            totalPrice
          );
        })
        .catch((error) => {
          console.error("Error fetching room prices:", error.message);
        });
    });

  // Function to find the selected rooms
  function findSelectedRooms() {
    const rooms = document.querySelectorAll(".each-room");
    const selectedRooms = [];
    for (const room of rooms) {
      const numRooms = parseInt(room.querySelector("#numRooms").value);
      if (numRooms > 0) {
        const roomType = room.getAttribute("data-room-type"); 
        selectedRooms.push({ type: roomType, count: numRooms });
      }
    }

    return selectedRooms;
  }

  // Function to fetch the price for the selected room type
  async function fetchRoomPrice(roomType) {
    const response = await fetch(`/fetch-price?roomClass=${roomType}`);
    if (!response.ok) {
      console.error(
        `Failed to fetch prices for room type ${roomType}: ${response.statusText}`
      );
      return null;
    }

    const result = await response.json();
    return result.price;
  }

  // Function to calculate total price for all selected rooms
  function calculateTotalPrice(
    roomPrices,
    checkInDate,
    checkOutDate,
    numRooms
  ) {
    // checkInDate and checkOutDate are valid date strings
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    // Calculate the number of nights
    const numberOfNights = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    );
    console.log("Number of Nights:", numberOfNights);
    console.log("Room Prices:", roomPrices);

    // Calculate total price for all selected rooms
    const totalPrice =
      numRooms *
      roomPrices.reduce((acc, price) => acc + parseInt(price), 0) *
      numberOfNights;

    console.log("Total price:", totalPrice);
    return totalPrice;
  }


  function redirectToPaymentPage(
    checkInDate,
    checkOutDate,
    selectedRooms,
    totalPrice
  ) {
    // Convert selected rooms array to a query string
    const roomTypeQueryString = selectedRooms
      .map((room) => `roomTypes=${room.type}&roomCounts=${room.count}`)
      .join("&");

    const paymentPageUrl = `/payment?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&${roomTypeQueryString}&totalPrice=${totalPrice}`;
    console.log(`Redirecting to payment page: ${paymentPageUrl}`);

    // Redirect to the payment page
    window.location.href = paymentPageUrl;
  }

});
