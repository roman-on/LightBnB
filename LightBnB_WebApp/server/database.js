const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const { name, email, password } = user;

  return pool
    .query(
      `INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3) RETURNING *;
  `,
      [name, email, password]
    )
    .then((result) => {
      console.log({ result, rows: result.rows });
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(
      `
    SELECT
    properties.*,
    avg(property_reviews.rating) AS average_rating,
    reservations.*
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON property_reviews.property_id = properties.id
    WHERE reservations.guest_id = $1 
    GROUP BY properties.id, reservations.id
    LIMIT $2;
    ;`,
      [guest_id, limit]
    )
    .then((result) => {
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
  // return getAllProperties(null, 2);
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(Number(`${options.minimum_price_per_night}`) * 100);
    queryString += `AND cost_per_night > $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(Number(`${options.maximum_price_per_night}`) * 100);
    queryString += `AND cost_per_night < $${queryParams.length} `;
  }

  if (options.minimum_rating) {
    queryParams.push(Number(`${options.minimum_rating}`));
    queryString += `HAVING avg(property_reviews.rating) = $${queryParams.length} `;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const {
    title,
    description,
    owner_id,
    cover_photo_url,
    thumbnail_photo_url,
    cost_per_night,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms,
    province,
    city,
    country,
    street,
    post_code,
  } = property;

  return pool
    .query(
      `INSERT INTO properties (
        title, description, owner_id, cover_photo_url, thumbnail_photo_url, 
        cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, 
        province, city, country, street, post_code) 
        VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
        $12, $13, $14)
         RETURNING *;
  `,
      [
        title,
        description,
        owner_id,
        cover_photo_url,
        thumbnail_photo_url,
        Number(cost_per_night) * 100,
        Number(parking_spaces),
        Number(number_of_bathrooms),
        Number(number_of_bedrooms),
        province,
        city,
        country,
        street,
        post_code,
      ]
    )
    .then((result) => {
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addProperty = addProperty;
