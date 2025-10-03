import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "root", // XAMPP default user
  password: "", // XAMPP default no password
  database: "quiz_app", // Create this database in phpMyAdmin
});
