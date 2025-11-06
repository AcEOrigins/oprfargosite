<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'u775021278_OPRDATA');
define('DB_USER', 'u775021278_OPRAdmin');
define('DB_PASS', '>q}Q>\']6LNp~g+7');

// Create database connection
function getDBConnection() {
    try {
        $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $conn;
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

// Initialize database tables
function initializeDatabase() {
    $conn = getDBConnection();
    
    // Servers table
    $conn->exec("CREATE TABLE IF NOT EXISTS servers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        battlemetrics_id VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    // Images table
    $conn->exec("CREATE TABLE IF NOT EXISTS images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        data LONGTEXT NOT NULL,
        type VARCHAR(50),
        size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Slideshow table
    $conn->exec("CREATE TABLE IF NOT EXISTS slideshow (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slide_number INT NOT NULL,
        image_id INT,
        image_data LONGTEXT,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL,
        UNIQUE KEY unique_slide (slide_number)
    )");
    
    // Events table
    $conn->exec("CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATETIME NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Settings table
    $conn->exec("CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    return $conn;
}
?>

