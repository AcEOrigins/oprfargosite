<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$conn = initializeDatabase();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        // Servers
        case 'get_servers':
            $stmt = $conn->query("SELECT * FROM servers ORDER BY created_at DESC");
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'add_server':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO servers (name, display_name, battlemetrics_id, ip_address) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['name'], $data['displayName'], $data['battlemetricsId'], $data['ipAddress'] ?? '']);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
            break;
            
        case 'update_server':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("UPDATE servers SET name = ?, display_name = ?, battlemetrics_id = ?, ip_address = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['displayName'], $data['battlemetricsId'], $data['ipAddress'] ?? '', $data['id']]);
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_server':
            $id = $_GET['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM servers WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        // Images
        case 'get_images':
            $stmt = $conn->query("SELECT * FROM images ORDER BY created_at DESC");
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'upload_image':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO images (name, data, type, size) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['name'], $data['data'], $data['type'], $data['size']]);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
            break;
            
        case 'update_image':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("UPDATE images SET name = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['id']]);
            echo json_encode(['success' => true]);
            break;
            
        case 'delete_image':
            $id = $_GET['id'] ?? 0;
            // Remove from slideshow if used
            $conn->prepare("UPDATE slideshow SET image_id = NULL, image_data = NULL WHERE image_id = ?")->execute([$id]);
            // Delete image
            $stmt = $conn->prepare("DELETE FROM images WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        // Slideshow
        case 'get_slideshow':
            $stmt = $conn->query("SELECT * FROM slideshow ORDER BY slide_number ASC");
            $slides = $stmt->fetchAll();
            echo json_encode($slides);
            break;
            
        case 'set_slide':
            $data = json_decode(file_get_contents('php://input'), true);
            // Get image data if image_id is provided
            $imageData = null;
            if ($data['imageId']) {
                $imgStmt = $conn->prepare("SELECT data FROM images WHERE id = ?");
                $imgStmt->execute([$data['imageId']]);
                $imgResult = $imgStmt->fetch();
                $imageData = $imgResult['data'] ?? null;
            }
            
            $stmt = $conn->prepare("INSERT INTO slideshow (slide_number, image_id, image_data) VALUES (?, ?, ?) 
                                    ON DUPLICATE KEY UPDATE image_id = VALUES(image_id), image_data = VALUES(image_data)");
            $stmt->execute([$data['slideNumber'], $data['imageId'], $imageData]);
            echo json_encode(['success' => true]);
            break;
            
        case 'add_slide':
            // Get the highest slide number
            $stmt = $conn->query("SELECT MAX(slide_number) as max_slide FROM slideshow");
            $result = $stmt->fetch();
            $nextSlideNumber = ($result['max_slide'] ?? 0) + 1;
            
            $stmt = $conn->prepare("INSERT INTO slideshow (slide_number, image_id, image_data) VALUES (?, NULL, NULL)");
            $stmt->execute([$nextSlideNumber]);
            echo json_encode(['success' => true, 'slideNumber' => $nextSlideNumber]);
            break;
            
        case 'remove_slide':
            $slideNumber = $_GET['slideNumber'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM slideshow WHERE slide_number = ?");
            $stmt->execute([$slideNumber]);
            echo json_encode(['success' => true]);
            break;
            
        // Events
        case 'get_events':
            $stmt = $conn->query("SELECT * FROM events ORDER BY date ASC");
            echo json_encode($stmt->fetchAll());
            break;
            
        case 'add_event':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)");
            $stmt->execute([$data['title'], $data['date'], $data['description'] ?? '']);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
            break;
            
        case 'delete_event':
            $id = $_GET['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM events WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        // Settings
        case 'get_settings':
            $stmt = $conn->query("SELECT setting_key, setting_value FROM settings");
            $settings = [];
            while ($row = $stmt->fetch()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            echo json_encode($settings);
            break;
            
        case 'save_setting':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute([$data['key'], $data['value']]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>

