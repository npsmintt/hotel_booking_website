document.addEventListener("DOMContentLoaded", function () {
  console.log("Homepage Script loaded");

  const bookNowButton = document.getElementById("bookNowButton");
  //check if the button is found
  if (bookNowButton) {
    bookNowButton.addEventListener("click", async function () {
      console.log("Homepage Button Clicked");

      const checkInDate = document.getElementById("checkInDate").value;
      const checkOutDate = document.getElementById("checkOutDate").value;

      if (checkInDate && checkOutDate) {
        try {
          // Fetch available rooms
          const roomsData = await fetchAvailableRooms(
            checkInDate,
            checkOutDate
          );
          const rooms = roomsData.rooms;

          // Loop through each room available
          for (const room of rooms) {
            // Access individual room details
            const rClass = room.r_class;
            const roomCount = room.room_count;
            const fullClassName = room.full_class_name;

            // Fetch room price
            const price = await fetchRoomPrice(rClass);

            //
            console.log(
              `Room Class: ${rClass}, Room Count: ${roomCount}, Full Class Name: ${fullClassName}, Price: ${price}`
            );
          }

          // Log the fetched rooms data on the client side
          console.log("Debugging: rooms data on client side:", rooms);

          // Redirect to booking page with selected date and available rooms
          redirectToBookingPage(checkInDate, checkOutDate, rooms);
        } catch (error) {
          console.error("Error fetching available rooms:", error.message);
          alert("Error fetching available rooms. Please try again.");
        }
      } else {
        alert("Please choose valid check-in and check-out dates");
      }
    });
  } else {
    console.error("Button not found");
  }

  //fetch available rooms
  async function fetchAvailableRooms(checkInDate, checkOutDate) {
    const response = await fetch(
      `/fetch-rooms?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch available rooms: ${response.statusText}`
      );
    }

    return response.json();
  }

  //fetch room price
  async function fetchRoomPrice(roomClass) {
    const response = await fetch(`/fetch-price?roomClass=${roomClass}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }

    const result = await response.json();
    const price = result.price;
    //I need the price for calculation
    return price;
  }

  //redirect to booking page
  function redirectToBookingPage(checkInDate, checkOutDate, rooms) {
    const encodedRooms = encodeURIComponent(JSON.stringify(rooms));
    const bookingPageUrl = `/booking?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&rooms=${encodedRooms}`;
    console.log(`Redirecting to booking page: ${bookingPageUrl}`);
    window.location.href = bookingPageUrl;
  }
});
