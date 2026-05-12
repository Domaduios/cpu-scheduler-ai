<?php
/**
 * Database Configuration
 * ======================
 *
 * Standard XAMPP MySQL settings.
 * If you changed your MySQL password, edit DB_PASS below.
 */
define('DB_HOST', 'localhost');
define('DB_NAME', 'cpu_scheduler');
define('DB_USER', 'root');
define('DB_PASS', '');  // Empty by default on XAMPP
/**
 * Get a PDO connection to MySQL.
 * Returns null on failure (so we can fall back to defaults).
 */
function getDbConnection() {
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // Connection failed - we'll fall back to hardcoded datasets
        error_log('DB connection failed: ' . $e->getMessage());
        return null;
    }
}