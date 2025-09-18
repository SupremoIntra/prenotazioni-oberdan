CREATE DATABASE IF NOT EXISTS oberdan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oberdan;

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY CHECK (id = 1),
  num_rows INT NOT NULL DEFAULT 6,
  num_cols INT NOT NULL DEFAULT 10,
  logo_url VARCHAR(255) DEFAULT '',
  color_primary VARCHAR(20) DEFAULT '#1E90FF'
);

INSERT IGNORE INTO settings (id, num_rows, num_cols, logo_url, color_primary) 
VALUES (1, 6, 10, '', '#1E90FF');

CREATE TABLE IF NOT EXISTS seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seat_number VARCHAR(20) NOT NULL,
  row_num INT NOT NULL,
  col_num INT NOT NULL,
  status ENUM('available','reserved','blocked') DEFAULT 'available',
  reserved_name VARCHAR(100),
  reserved_surname VARCHAR(100),
  reserved_phone VARCHAR(30),
  reserved_at DATETIME
);