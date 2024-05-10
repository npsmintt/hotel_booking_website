const express = require("express");
const app = express();
const path = require("path");
const pg = require("pg");
const bodyParser = require("body-parser");
const config = require("./config.js")[process.env.NODE_ENV || "development"];
const PORT = 8000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

//TEST CODE

// app.get('/rooms', (req, res) => {
//   console.log(req);
//   const { param1, param2 } = req.query;
//   res.render('sample', { data: [{title: 'title1', description:'room1'},{title: 'title2', description:'room2'}] });
// });

app.get("/", (req, res) => {
  res.render("homepage");
});

app.get("/about-us", (req, res) => {
  res.render("about-us");
});

app.get("/attractions", (req, res) => {
  res.render("attractions");
});

app.get("/booking-reference", async (req, res) => {
  const { checkInDate, checkOutDate, firstName } = req.query;
  const startDate = new Date(checkInDate);
  const endDate = new Date(checkOutDate);

  try {
    const pool = new pg.Pool(config);
    const client = await pool.connect();

    await client.query("SET search_path to hotelbooking");

    // Query: Fetch the latest booking reference
    /* 
       This solution needs to be improved.
    */
    const bookingInfoQuery = `
          SELECT
              MAX(b.b_ref) + 1 AS latest_booking_reference
          FROM
              hotelbooking.booking b
      `;

    const { rows } = await pool.query(bookingInfoQuery);
    const latestBookingReference = rows[0].latest_booking_reference;

    console.log("Latest Booking Reference:", latestBookingReference);

    if (!latestBookingReference) {
      console.error("No booking reference provided");
      return res.status(404).send("Booking reference not found");
    }

    // Log parameters before rendering
    console.log("Rendering page with parameters:", {
      checkInDate: startDate.toLocaleDateString(),
      checkOutDate: endDate.toLocaleDateString(),
      bookingReference: latestBookingReference,
      firstName: firstName,
    });

    // Render the page with the provided parameters
    res.render("booking-reference", {
      checkInDate: startDate.toLocaleDateString(),
      checkOutDate: endDate.toLocaleDateString(),
      bookingReference: latestBookingReference,
      firstName: firstName,
    });

    // Release the client back to the pool, make sure it can be used by other applications and also it is more efficient.
    client.release();
  } catch (error) {
    console.error("Error rendering booking reference page:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/manage-booking", (req, res) => {
  res.render("manage-booking");
});

//get booking details
app.get("/booking-details/:b_ref", async (req, res) => {
  try {
    const pool = new pg.Pool(config);

    const client = await pool.connect();

    // get b_ref from request parameters

    const { b_ref } = req.params;

    // Set search_path

    await client.query("SET search_path TO hotelbooking;");

    // Retrieve customer details (modified query because previous one was wrong)

    const Query1 = `

    SELECT c.c_name, c.c_address, c.c_email, rb.checkin, rb.checkout, b.b_cost

    FROM hotelbooking.customer c, hotelbooking.roombooking rb, hotelbooking.booking b where b.b_ref = $1 AND c.c_no = b.c_no AND b.b_ref = rb.b_ref;

    `;

    const result1 = await pool.query(Query1, [b_ref]);

    const customerDetails = result1.rows[0];

    const roomTypeMapping = {
      std_d: "Standard Double Room",

      std_t: "Standard Twin Room",

      sup_d: "Superior Double Room",

      sup_t: "Superior Twin Room",
    };

    const Query2 = `SELECT r.r_class, COUNT(r.*) FROM hotelbooking.roombooking rb, hotelbooking.room r WHERE rb.b_ref = $1 AND rb.r_no = r.r_no

    GROUP BY r.r_class;`;

    const result = await pool.query(Query2, [b_ref]);

    const roomCounts = result.rows.map((row) => ({
      r_class: roomTypeMapping[row.r_class] || row.r_class,

      count: row.count,
    }));

    // Map booking details for rendering

    const mappedBookDetail = {
      c_name: customerDetails.c_name,

      c_address: customerDetails.c_address,

      c_email: customerDetails.c_email,

      checkin: new Date(customerDetails.checkin).toLocaleDateString("en-GB", {
        day: "numeric",

        month: "short",

        year: "numeric",
      }),

      checkout: new Date(customerDetails.checkout).toLocaleDateString("en-GB", {
        day: "numeric",

        month: "short",

        year: "numeric",
      }),

      b_cost: customerDetails.b_cost,
    };

    // Render the cr-booking-details template with b_ref and mappedBookDetail

    // res.render('bookingDetails', { b_ref, mappedBookDetail });

    res.render("booking-details", { b_ref, mappedBookDetail, roomCounts });
  } catch (error) {
    console.error("Error:", error.message);

    res.status(500).send("Internal Server Error");
  }
});

//add a room
app.post("/add-room/:b_ref/:roomType", async (req, res) => {
  const pool = new pg.Pool(config);

  const client = await pool.connect();

  const { b_ref, roomType } = req.params;

  let checkInDate, checkOutDate;

  try {
    // get the check-in and check-out dates from the database

    const query1 = `

            SELECT checkin

            FROM hotelbooking.roombooking where b_ref = $1;

        `;

    const checkInDateResult = await pool.query(query1, [b_ref]);

    checkInDate = checkInDateResult.rows[0].checkin;

    const query2 = `

            SELECT checkout

            FROM hotelbooking.roombooking where b_ref = $1;

        `;

    const checkOutDateResult = await pool.query(query2, [b_ref]);

    checkOutDate = checkOutDateResult.rows[0].checkout;

    // get the first available room in the room category from the database

    const query3 = `

        WITH AvailableRooms AS (

            SELECT r.r_no, r.r_class

            FROM hotelbooking.room r

            WHERE NOT EXISTS (

                SELECT 1

                FROM hotelbooking.roombooking rb

                WHERE r.r_no = rb.r_no

                AND (

                    ($2 BETWEEN rb.checkin AND rb.checkout)

                    OR ($3 BETWEEN rb.checkin AND rb.checkout)

                    OR (rb.checkin BETWEEN $2 AND $3)

                    OR (rb.checkout BETWEEN $2 AND $3)

                )

            )

        ),

        SelectedRooms AS (

            SELECT ar.r_no, ar.r_class

            FROM AvailableRooms ar

            WHERE ar.r_class = $4

            LIMIT 1

        )

        INSERT INTO hotelbooking.roombooking (r_no, b_ref, checkin, checkout)

        SELECT

            sr.r_no,

            $1,

            $2::date AS checkin,

            $3::date AS checkout

        FROM SelectedRooms sr;

    `;

    await pool.query(query3, [b_ref, checkInDate, checkOutDate, roomType]);

    // another query to add the calculate the price of the extra room and add it to the total b_cost

    const query4 = `UPDATE hotelbooking.booking b

      SET

          b_cost = b.b_cost + (SELECT price FROM hotelbooking.rates WHERE r_class = $4) * ($3::date - $2::date),

          b_outstanding = b.b_cost

      WHERE b.b_ref = $1;`;

    const result = await pool.query(query4, [
      b_ref,
      checkInDate,
      checkOutDate,
      roomType,
    ]);

    console.log("Rows affected by query4:", result.rowCount);

    res.status(200).json({
      success: true,

      message: "Thank you. The room has been added to your booking.",
    });
  } catch (error) {
    console.error("Error:", error.message);

    res.status(500).send("Sorry, the room you selected is not available.");
  }
});
// cancel booking
app.delete("/cancel-booking/:b_ref", async (req, res) => {
  try {
    const pool = new pg.Pool(config);
    const client = await pool.connect();
    const { b_ref } = req.params;

    // Set search_path
    await client.query("SET search_path TO hotelbooking");

    // delete booking detail accordingly
    const query1 =
      "DELETE FROM hotelbooking.roombooking rb USING hotelbooking.booking b, hotelbooking.customer c WHERE b.b_ref = $1 AND b.b_ref = rb.b_ref AND b.c_no = c.c_no;";
    await pool.query(query1, [b_ref]);

    const query2 = "DELETE FROM hotelbooking.booking b WHERE b.b_ref = $1;";
    await pool.query(query2, [b_ref]);

    const query3 =
      "DELETE FROM hotelbooking.customer c WHERE c.c_no IN (SELECT b.c_no FROM hotelbooking.booking b WHERE b.b_ref = $1);";
    await pool.query(query3, [b_ref]);

    res.status(200).json({
      success: true,
      message: "Thank you. Your booking has been deleted.",
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/payment", (req, res) => {
  const { checkInDate, checkOutDate, numberOfRooms, totalPrice, lastName } =
    req.query;
  // Convert the string dates to Date objects
  const startDate = new Date(checkInDate);
  const endDate = new Date(checkOutDate);

  // Check if the dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    // Handle the case where the date format is invalid
    return res.status(400).send("Invalid date format");
  }

  // Calculate the number of nights
  const numberOfNights = Math.ceil(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  );

  res.render("payment", {
    checkInDate: startDate.toLocaleDateString(),
    checkOutDate: endDate.toLocaleDateString(),
    numberOfRooms,
    totalPrice,
    numberOfNights,
    lastName,
  });
});

app.get("/rooms-facilities", (req, res) => {
  res.render("rooms-facilities");
});

app.get("/support", (req, res) => {
  res.render("support");
});


app.get("/booking", async (req, res) => {
  const { checkInDate, checkOutDate, rooms, numberOfRooms, totalPrice } =
    req.query;

  // Parse the JSON-encoded rooms
  const parsedRooms = rooms ? JSON.parse(decodeURIComponent(rooms)) : [];

  // Fetch prices for each room class
  const prices = await Promise.all(
    parsedRooms.map((room) => fetchRoomPrice(room.r_class))
  );

  // Combine rooms and prices
  const roomsWithPrices = parsedRooms.map((room, index) => ({
    ...room,
    price: prices[index],
  }));

  console.log(
    "Debugging: rooms data passed to view with prices:",
    roomsWithPrices
  );

  res.render("booking", {
    checkInDate,
    checkOutDate,
    rooms: roomsWithPrices,
    numberOfRooms,
    totalPrice,
  });
});

//fetch the room data

app.get("/fetch-rooms", async (req, res) => {
  console.log("Fetching rooms route called.");

  try {
    const checkInDate = req.query.checkInDate || "";
    const checkOutDate = req.query.checkOutDate || "";

    console.log("Received dates:", checkInDate, checkOutDate);

    // Fetch available rooms
    const rooms = await fetchAvailableRooms(checkInDate, checkOutDate);

    console.log("Available rooms:", rooms);

    // Send JSON response
    res.json({ rooms, checkInDate, checkOutDate });
  } catch (error) {
    console.error("Error fetching rooms:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//fetch the price of each type of the room
app.get("/fetch-price", async (req, res) => {
  console.log("Fetching price route called.");

  try {
    const roomClass = req.query.roomClass || "";

    console.log("Received room class:", roomClass);

    // Fetch price for the specified room class
    const price = await fetchRoomPrice(roomClass);

    console.log("Price for room class:", price);

    // Send JSON response
    res.json({ price, roomClass });
  } catch (error) {
    console.error("Error fetching price:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//payment form

app.post("/submit-form", async (req, res) => {
  try {
    const pool = new pg.Pool(config);
    const client = await pool.connect();

    await client.query("SET search_path to hotelbooking");

    const {
      roomTypeCounts,
      firstName,
      lastName,
      email,
      fullAddress,
      specialRequirements,
      cardNumber,
      expiryDate,
      cvc,
      totalPrice,
    } = req.body;

    console.log("Received form data:", req.body);

    // Insert customer details into the customer table
    const customerQuery = `
    INSERT INTO hotelbooking.customer 
    VALUES (
        (SELECT MAX(c_no) FROM hotelbooking.customer) + 1,
        $1, $2, $3, $4, $5, $6
    );
    `;

    console.log("Executing customer query:", customerQuery);

    await pool.query(customerQuery, [
      `${firstName} ${lastName}`,
      email,
      fullAddress,
      parseInt(cvc),
      expiryDate,
      cardNumber,
    ]);

    console.log("Customer details inserted successfully.");

    // Insert booking details into the booking table
    const bookingQuery = `
    INSERT INTO hotelbooking.booking VALUES (((SELECT MAX(b_ref) 
    FROM hotelbooking.booking) + 1 ), 
    (SELECT MAX (c_no) FROM hotelbooking.customer), $1 , $2, $3) 
    RETURNING b_ref;
    `;

    console.log("Executing booking query:", bookingQuery);
    const { rows } = await pool.query(bookingQuery, [
      extractNumericValue(totalPrice),
      extractNumericValue(totalPrice),
      specialRequirements,
    ]);
    const bookingReference = rows[0].b_ref;
    console.log(
      "Booking details inserted successfully. Booking Reference:",
      bookingReference
    );

    // Insert room booking details into the roombooking table
    const checkInDate = req.body.checkInDate;
    const checkOutDate = req.body.checkOutDate;
    // for loop
    for (const room of roomTypeCounts) {
      const roomType = room.type;
      const roomCount = room.count;
      const roomBookingQuery = `
      WITH AvailableRooms AS (
          SELECT r.r_no, r.r_class
          FROM hotelbooking.room r
          WHERE NOT EXISTS (
              SELECT 1
              FROM hotelbooking.roombooking rb
              WHERE r.r_no = rb.r_no
              AND (
                  ($1 BETWEEN rb.checkin AND rb.checkout)
                  OR ($2 BETWEEN rb.checkin AND rb.checkout)
                  OR (rb.checkin BETWEEN $1 AND $2)
                  OR (rb.checkout BETWEEN $1 AND $2)
              )
          )
      ),
      SelectedRooms AS (
          SELECT ar.r_no, ar.r_class
          FROM AvailableRooms ar
          WHERE ar.r_class = $3
          LIMIT $4
      )
      INSERT INTO hotelbooking.roombooking (r_no, b_ref, checkin, checkout)
      SELECT
          sr.r_no,
          $5,
          $1::date AS checkin,
          $2::date AS checkout
      FROM SelectedRooms sr;
  `;

      console.log("Executing room booking query:", roomBookingQuery);
      console.log("Query parameters:", [
        checkInDate,
        checkOutDate,
        roomType,
        roomCount,
        bookingReference,
      ]);
      await pool.query(roomBookingQuery, [
        checkInDate,
        checkOutDate,
        roomType,
        roomCount,
        bookingReference,
      ]);

      console.log("Room booking details inserted successfully.");
    }

    res.status(200).send("Form submitted successfully!");
  } catch (error) {
    console.error("Error handling form submission:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// convert price with GBP sign to numeric
function extractNumericValue(value) {
  const numericPart = value.replace(/[^\d.]/g, ""); // Remove non-numeric characters except the dot (.)
  return parseFloat(numericPart);
}
//use query to get the available rooms from the database
async function fetchAvailableRooms(checkInDate, checkOutDate) {
  console.log("Fetching available rooms...");

  try {
    const pool = new pg.Pool(config);
    const client = await pool.connect();

    await client.query("SET search_path to hotelbooking");

    const query = {
      text: `
        SELECT r.r_class, COUNT(r.r_no) as room_count
        FROM room r
        WHERE NOT EXISTS (
          SELECT 1
          FROM roombooking rb
          WHERE r.r_no = rb.r_no
          AND (
            ($1 BETWEEN rb.checkin AND rb.checkout)
            OR ($2 BETWEEN rb.checkin AND rb.checkout)
            OR (rb.checkin BETWEEN $1 AND $2)
            OR (rb.checkout BETWEEN $1 AND $2)
          )
        )
        GROUP BY r.r_class;
      `,
      values: [checkInDate, checkOutDate],
    };

    console.log("SQL Query:", query.text, "with values:", query.values);
    const result = await client.query(query.text, query.values);

    // Map room class abbreviations to full names
    const rooms = result.rows.map((room) => ({
      ...room,
      full_class_name: mapRoomClass(room.r_class),
    }));

    console.log("Mapped rooms:", rooms);

    // Release the client back to the pool
    client.release();

    return rooms;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Mapping function for room class names
function mapRoomClass(abbreviation) {
  const mapping = {
    std_t: "Standard Twin Room",
    std_d: "Standard Double Room",
    sup_d: "Superior Double Room",
    sup_t: "Superior Twin Room",
  };
  return mapping[abbreviation] || abbreviation;
}

//using query for getting the price of each type of the room from the database
async function fetchRoomPrice(roomClass) {
  console.log("Fetching price...");

  try {
    const pool = new pg.Pool(config);
    const client = await pool.connect();

    await client.query("SET search_path to hotelbooking");

    const query = {
      text: `
        SELECT r_class, price
        FROM rates
        WHERE r_class = $1;
      `,
      values: [roomClass],
    };

    console.log("SQL Query:", query.text, "with values:", query.values);
    const result = await client.query(query.text, query.values);

    // Extract and return the price
    const price = result.rows[0]?.price || null;

    console.log("Fetched price:", price);

    // Release the client back to the pool
    client.release();

    return price;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on <http://localhost>:${PORT}`);
});
