<?php
function init() {
    session_start();

    // CORS configuration: restrict to trusted origins set via CORS_ALLOWED_ORIGINS environment variable (comma-separated)
    $allowedOriginsEnv = getenv('CORS_ALLOWED_ORIGINS') ?: '';
    $allowedOrigins = array_filter(array_map('trim', explode(',', $allowedOriginsEnv)));
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    $apiKey = getenv('OPENROUTER_API_KEY');
    if (!$apiKey) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Server misconfiguration: API key missing']);
        return;
    }

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        header('Content-Type: application/json');
        echo json_encode($_SESSION['history'] ?? []);
        return;
    }
    if ($method !== 'POST') {
        header('Content-Type: application/json');
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !isset($input['model'], $input['messages'])) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        return;
    }

    $payload = ['model' => $input['model'], 'messages' => $input['messages']];
    foreach (['stream', 'temperature', 'top_p', 'n'] as $opt) {
        if (isset($input[$opt])) {
            $payload[$opt] = $input[$opt];
        }
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    $jsonPayload = json_encode($payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    if (!empty($payload['stream'])) {
        curl_setopt($ch, CURLOPT_TIMEOUT, 0);
    } else {
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    }
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);

    if (!empty($payload['stream'])) {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($curl, $data) {
            echo $data;
            if (ob_get_level()) {
                ob_flush();
            }
            flush();
            return strlen($data);
        });
        curl_exec($ch);
        curl_close($ch);
        return;
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        header('Content-Type: application/json');
        http_response_code(502);
        echo json_encode(['error' => $error]);
        return;
    }

    http_response_code($status);
    header('Content-Type: application/json');
    echo $response;

    $_SESSION['history'][] = [
        'request' => $payload,
        'response' => json_decode($response, true)
    ];
}

init();